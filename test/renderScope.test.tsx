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

describe('render-scope baseline — editing fan-out (Stage C will tighten this)', () => {
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
