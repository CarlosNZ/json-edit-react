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
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  // The lazy buffer is `string | null`, fed through the `setEditBuffer` adapter
  // (which replaced a `setStringifiedValue` type-cast). These two pin the
  // raw-JSON edit contract end-to-end: a change event drives the adapter, then
  // Meta-Enter (`objectConfirm`) commits via `handleEdit`.
  test('commits a valid raw-JSON edit made through the lazy buffer', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ outer: { inner: 1 } }} setData={setData} showIconTooltips />)

    await user.click(screen.getAllByTitle('Edit')[0])
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '{ "outer": { "inner": 2 } }' } })
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    await waitFor(() => expect(setData).toHaveBeenCalled())
    expect(setData.mock.calls.at(-1)?.[0]).toEqual({ outer: { inner: 2 } })
  })

  test('reports INVALID_JSON with the entered text when the buffer cannot parse', async () => {
    const user = userEvent.setup()
    const onError = jest.fn()
    render(
      <JsonEditor
        data={{ outer: { inner: 1 } }}
        setData={() => {}}
        onError={onError}
        showIconTooltips
      />
    )

    await user.click(screen.getAllByTitle('Edit')[0])
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    const badJson = '{ not valid json'
    fireEvent.change(textarea, { target: { value: badJson } })
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    expect(onError).toHaveBeenCalledTimes(1)
    const [{ error, errorValue }] = onError.mock.calls[0]
    expect(error.code).toBe('INVALID_JSON')
    // The payload is the exact text that failed to parse — resolved once and
    // shared with the parse attempt, never the raw (possibly null) buffer.
    expect(errorValue).toBe(badJson)
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
