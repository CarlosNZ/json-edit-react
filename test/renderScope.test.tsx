/**
 * Render-scope tests (V2 §16 fine-grained re-rendering).
 *
 * These pin *how far* a re-render propagates through the tree on a given
 * interaction, using the sentinel-custom-node harness in
 * `test/helpers/renderSpy.tsx` (zero changes to the shipped library).
 *
 * This file is the measurement baseline (Stage A). It currently documents the
 * pre-optimization behaviour: starting an edit on one node fans out and
 * re-renders the whole tree. Later stages tighten these assertions:
 *   - Stage C (selectable editing store) flips the editing-fan-out test so a
 *     sibling's count stays at 0 when an unrelated node is edited.
 *   - Stage D (React.memo boundary) adds a commit-cascade test so an untouched
 *     sibling subtree doesn't re-render when a value elsewhere is committed.
 */

import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { makeRenderSpy } from './helpers/renderSpy'

// A controlled host so `setData` commits actually re-render the editor, the
// same ownership pattern the README recommends to consumers.
const Controlled = ({
  initial,
  definitions,
}: {
  initial: object
  definitions: ReturnType<typeof makeRenderSpy>['definitions']
}) => {
  const [data, setData] = useState<object>(initial)
  return <JsonEditor data={data} setData={setData} customNodeDefinitions={definitions} />
}

describe('render-scope harness — sanity', () => {
  test('sentinels render the original node content and count their renders', () => {
    const spy = makeRenderSpy({ a: ['a'], b: ['b'] })
    render(<Controlled initial={{ a: 'aval', b: 'bval' }} definitions={spy.definitions} />)

    // The original value display still renders through the sentinel.
    expect(screen.getByText('"aval"')).toBeInTheDocument()
    expect(screen.getByText('"bval"')).toBeInTheDocument()

    // Each target rendered at least once on mount.
    expect(spy.counts.a).toBeGreaterThan(0)
    expect(spy.counts.b).toBeGreaterThan(0)
  })

  test('editing still works through a sentinel node (behaviour preserved)', async () => {
    const user = userEvent.setup()
    const spy = makeRenderSpy({ a: ['a'] })
    const setData = jest.fn()
    render(
      <JsonEditor
        data={{ a: 'aval' }}
        setData={setData}
        customNodeDefinitions={spy.definitions}
      />
    )

    await user.dblClick(screen.getByText('"aval"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'changed{Enter}')

    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ a: 'changed' })
  })
})

describe('Stage B — lazy jsonStringify', () => {
  // Mirror the library's default serializer so behaviour is unchanged; the spy
  // is the `jsonStringify` prop, which the editor wraps but calls once per use.
  const makeStringifySpy = () =>
    jest.fn((data: unknown, replacer?: (key: string, value: unknown) => unknown) =>
      JSON.stringify(data, replacer as never, 2)
    )

  test('does not serialize any collection on initial mount', () => {
    const spy = makeStringifySpy()
    render(
      <JsonEditor
        data={{ outer: { inner: 1 }, sibling: 'x', list: [1, 2, 3] }}
        setData={() => {}}
        jsonStringify={spy}
      />
    )

    // Pre-Stage-B this fired once per collection node (root + outer + list).
    expect(spy).toHaveBeenCalledTimes(0)
  })

  test('serializes lazily when a collection enters JSON-edit mode', async () => {
    const user = userEvent.setup()
    const spy = makeStringifySpy()
    render(
      <JsonEditor
        data={{ outer: { inner: 1 } }}
        setData={() => {}}
        jsonStringify={spy}
        showIconTooltips
      />
    )

    expect(spy).toHaveBeenCalledTimes(0)

    // Click the root collection's Edit (JSON) button — first Edit button in DOM.
    await user.click(screen.getAllByTitle('Edit')[0])

    // The buffer is computed exactly once, on entry, and the textarea opens
    // pre-filled with the serialized JSON.
    expect(spy).toHaveBeenCalledTimes(1)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toContain('"inner": 1')
  })
})

describe('Stage C — selectable editing store', () => {
  // The headline Stage C win: moving an active edit between sibling nodes
  // re-renders only the two nodes involved, not the whole tree. (Entering an
  // edit from idle still fans out via the ancestors' `childrenEditing` flip
  // cascading through unmemoized children — that's Stage D's job.)
  test('moving the edit between sibling leaves re-renders only those two', async () => {
    const user = userEvent.setup()
    const spy = makeRenderSpy({ a: ['a'], b: ['b'], c: ['c'] })
    render(
      <Controlled initial={{ a: 'aval', b: 'bval', c: 'cval' }} definitions={spy.definitions} />
    )

    // Enter edit on `a` first (this fans out from idle — not what we're testing).
    await user.dblClick(screen.getByText('"aval"'))
    spy.reset()

    // Move the edit a -> b. The common parent's "is a child editing?" stays
    // true, so it doesn't re-render and `c` is never touched.
    await user.dblClick(screen.getByText('"bval"'))

    expect(spy.counts.a).toBeGreaterThan(0) // left edit mode
    expect(spy.counts.b).toBeGreaterThan(0) // entered edit mode
    expect(spy.counts.c).toBe(0) // untouched sibling — the fan-out is gone
  })
})

describe('render-scope baseline — editing fan-out (Stage D will tighten this)', () => {
  test('starting an edit on one node currently re-renders sibling nodes too', async () => {
    const user = userEvent.setup()
    const spy = makeRenderSpy({ a: ['a'], b: ['b'], nested: ['c', 'd'] })
    render(
      <Controlled
        initial={{ a: 'aval', b: 'bval', c: { d: 'dval' } }}
        definitions={spy.definitions}
      />
    )

    // Ignore initial-mount renders.
    spy.reset()

    // Enter edit mode on `a` (changes editing state, no data commit yet).
    await user.dblClick(screen.getByText('"aval"'))

    // BASELINE: the editing-context fan-out re-renders every node, not just `a`.
    // Stage C will change the two sibling expectations below to `toBe(0)`.
    expect(spy.counts.a).toBeGreaterThan(0)
    expect(spy.counts.b).toBeGreaterThan(0)
    expect(spy.counts.nested).toBeGreaterThan(0)
  })
})
