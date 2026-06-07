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
import {
  type OnChangeFunction,
  type OnCollapseFunction,
  type OnErrorFunction,
  type EditEvent,
} from '../src/types'
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

  test('re-entering JSON-edit after a confirm shows current data, not a stale buffer', async () => {
    const user = userEvent.setup()
    const Host = () => {
      const [data, setData] = useState<object>({ x: 1 })
      return <JsonEditor data={data} setData={setData} showIconTooltips />
    }
    render(<Host />)

    // Open the root JSON editor, replace with a COMPACT edit, and confirm it.
    await user.click(screen.getAllByTitle('Edit')[0])
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: '{"x":2}' } })
    fireEvent.keyDown(ta, { key: 'Enter', metaKey: true })
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())

    // Re-open on the same node: it must show the CURRENT data freshly
    // serialised (pretty-printed — note the space after the colon), not the
    // stale compact buffer the user typed in the previous session.
    await user.click(screen.getAllByTitle('Edit')[0])
    const reopened = (screen.getByRole('textbox') as HTMLTextAreaElement).value
    expect(reopened).toContain('"x": 2')
    expect(reopened).not.toContain('{"x":2}')
  })

  test('leaving JSON-edit by editing elsewhere does not leave a stale buffer', async () => {
    const user = userEvent.setup()
    const Host = () => {
      const [data, setData] = useState<object>({ a: { inner: 1 }, b: 'leafB' })
      return <JsonEditor data={data} setData={setData} showIconTooltips />
    }
    render(<Host />)

    // Open `a`'s JSON editor and type a compact change — but DON'T confirm or
    // cancel. (Edit buttons in DOM order: [root, a, b]; `a` is index 1.)
    await user.click(screen.getAllByTitle('Edit')[1])
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: '{"inner":2}' } })

    // Leave by starting an edit elsewhere — moves the store's editing element
    // off `a` without running `a`'s handleEdit/handleCancel at all.
    await user.dblClick(screen.getByText('"leafB"'))

    // Re-open `a`'s JSON editor. `a` was never confirmed, so its data is still
    // { inner: 1 } — it must show that freshly, not the stale `{"inner":2}`.
    await user.click(screen.getAllByTitle('Edit')[1])
    const reopened = (screen.getByRole('textbox') as HTMLTextAreaElement).value
    expect(reopened).toContain('"inner": 1')
    expect(reopened).not.toContain('{"inner":2}')
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

describe('Stage D — React.memo boundary: entering an edit no longer fans out', () => {
  test('starting an edit on one node does not re-render sibling subtrees', async () => {
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

    // `a` re-renders (its own isEditing flipped). Its siblings — the leaf `b`
    // and the unrelated subtree under `c` — bail out via the memo boundary even
    // though the root re-renders (its childrenEditing flips). This is the
    // Stage C + D fan-out fix, end to end.
    expect(spy.counts.a).toBeGreaterThan(0)
    expect(spy.counts.b).toBe(0)
    expect(spy.counts.nested).toBe(0)
  })

  test('committing a value does not re-render untouched sibling subtrees', async () => {
    const user = userEvent.setup()
    const spy = makeRenderSpy({ target: ['outer', 'x'], sibling: ['other', 'y'] })
    render(
      <Controlled
        initial={{ outer: { x: 'xval' }, other: { y: 'yval' } }}
        definitions={spy.definitions}
      />
    )
    spy.reset()

    // Edit and commit `outer.x`. assign() rebuilds only the spine (root, outer),
    // so the `other` subtree keeps its `data` reference and bails out.
    await user.dblClick(screen.getByText('"xval"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'changed{Enter}')

    expect(spy.counts.target).toBeGreaterThan(0) // edited node re-rendered
    expect(spy.counts.sibling).toBe(0) // untouched sibling subtree did not
  })
})

describe('Stage D — consumer callbacks stay fresh through the memo boundary', () => {
  // Regression: the React.memo comparator must not pin a stale consumer
  // callback. `onChange`'s return value transforms the edited input, so calling
  // a stale one silently applies the wrong transform after a consumer swaps it.
  test('a swapped onChange is invoked (latest), not the pinned-stale one', async () => {
    const user = userEvent.setup()
    const onChangeV1 = jest.fn((p: Parameters<OnChangeFunction>[0]) => p.newValue)
    const onChangeV2 = jest.fn((p: Parameters<OnChangeFunction>[0]) => p.newValue)

    const Host = ({ onChange }: { onChange: OnChangeFunction }) => {
      const [data, setData] = useState<object>({ x: 'a' })
      return <JsonEditor data={data} setData={setData} onChange={onChange} />
    }

    const { rerender } = render(<Host onChange={onChangeV1} />)

    // Enter edit on `x` and type — fires the current onChange (v1).
    await user.dblClick(screen.getByText('"a"'))
    const input = screen.getByRole('textbox')
    await user.type(input, 'b')
    expect(onChangeV1).toHaveBeenCalled()

    // Consumer swaps the callback while the edit is still open. The node is
    // memoised; the comparator must still let the new implementation through.
    onChangeV1.mockClear()
    onChangeV2.mockClear()
    rerender(<Host onChange={onChangeV2} />)

    // Typing again must reach the LATEST callback, not the stale one.
    await user.type(input, 'c')
    expect(onChangeV2).toHaveBeenCalled()
    expect(onChangeV1).not.toHaveBeenCalled()
  })

  // Guards the perf side of the same change: the comparator now compares
  // callbacks, so stabilising them upstream is what keeps a swap from churning
  // the tree. Without stabilisation a fresh identity each render would re-render
  // every node — this pins that it doesn't.
  test('swapping a consumer callback does not re-render sibling subtrees', () => {
    const spy = makeRenderSpy({ sibling: ['other', 'y'] })
    const Host = ({ onChange }: { onChange: OnChangeFunction }) => {
      const [data, setData] = useState<object>({ outer: { x: 'a' }, other: { y: 'b' } })
      return (
        <JsonEditor
          data={data}
          setData={setData}
          onChange={onChange}
          customNodeDefinitions={spy.definitions}
        />
      )
    }

    const { rerender } = render(<Host onChange={(p) => p.newValue} />)
    spy.reset()

    // Fresh onChange identity — JsonEditor stabilises it, so no node re-renders.
    rerender(<Host onChange={(p) => p.newValue} />)
    expect(spy.counts.sibling).toBe(0)
  })

  // Same hazard via the collapse context: every node subscribes to it, so an
  // inline `onCollapse` (fresh identity each render) must not churn the context
  // value. `CollapseProvider` ref-stabilises it; this pins that a swap doesn't
  // re-render the tree.
  test('swapping an inline onCollapse does not re-render the tree', () => {
    const spy = makeRenderSpy({ sibling: ['other', 'y'] })
    const Host = ({ onCollapse }: { onCollapse: OnCollapseFunction }) => {
      const [data, setData] = useState<object>({ outer: { x: 'a' }, other: { y: 'b' } })
      return (
        <JsonEditor
          data={data}
          setData={setData}
          onCollapse={onCollapse}
          customNodeDefinitions={spy.definitions}
        />
      )
    }

    const { rerender } = render(<Host onCollapse={() => {}} />)
    spy.reset()

    // Fresh onCollapse identity — must not re-render any node.
    rerender(<Host onCollapse={() => {}} />)
    expect(spy.counts.sibling).toBe(0)
  })

  // onChange must receive LIVE args, not stale snapshots. The callback keeps a
  // stable identity (so it doesn't churn the custom-node memo), so its closure
  // can't be the source of truth: the document comes from `getLatestData()` and
  // value/path from a ref-to-latest. Otherwise the `[onChange]`-stable callback
  // freezes its closure once onChange is stabilized upstream — reporting a
  // document missing a sibling commit AND a stale `currentValue` after re-edit.
  test('onChange reports the live document and value, not stale snapshots', async () => {
    const user = userEvent.setup()
    const seen: Array<{ fullData: unknown; value: unknown }> = []
    const onChange: OnChangeFunction = (p) => {
      // Flat NodeData (§17): `fullData` is the live document, `value` the current value.
      seen.push({ fullData: p.fullData, value: p.value })
      return p.newValue
    }
    const Host = () => {
      const [data, setData] = useState<object>({ a: 'aval', b: 'bval' })
      return <JsonEditor data={data} setData={setData} onChange={onChange} />
    }
    render(<Host />)

    // Commit a -> aval2 (changes the document) and b -> bval2 (b's own value).
    await user.dblClick(screen.getByText('"aval"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'aval2{Enter}')
    await screen.findByText('"aval2"')
    await user.dblClick(screen.getByText('"bval"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'bval2{Enter}')
    await screen.findByText('"bval2"')

    // Re-edit b and type — onChange must see the live document AND b's latest
    // value, not the mount-time snapshots a stale closure would pin.
    await user.dblClick(screen.getByText('"bval2"'))
    await user.type(screen.getByRole('textbox'), 'Z')

    expect(seen.at(-1)).toEqual({
      fullData: { a: 'aval2', b: 'bval2' },
      value: 'bval2',
    })
  })

  // Same staleness class for `onError`: `useCommon` builds its `fullData` from
  // `getLatestData()`, not the `nodeData.fullData` a bailed sibling keeps stale.
  // Triggering an error in a subtree that bailed on an earlier commit must still
  // report the live doc.
  test('onError reports the live document, not a stale snapshot', async () => {
    const user = userEvent.setup()
    let seenFullData: unknown = null
    const onError = jest.fn<void, Parameters<OnErrorFunction>>((p) => {
      seenFullData = p.fullData
    })
    const Host = () => {
      const [data, setData] = useState<object>({ a: 'aval', obj: { x: 1 } })
      return <JsonEditor data={data} setData={setData} onError={onError} showIconTooltips />
    }
    render(<Host />)

    // Commit a -> aval2; `obj`'s subtree bails on the commit (its data ref is unchanged).
    await user.dblClick(screen.getByText('"aval"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'aval2{Enter}')
    await screen.findByText('"aval2"')

    // Open obj's JSON editor (Edit buttons: [root, a, obj]), enter invalid JSON, confirm.
    await user.click(screen.getAllByTitle('Edit')[2])
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: '{ not json' } })
    fireEvent.keyDown(ta, { key: 'Enter', metaKey: true })

    expect(onError).toHaveBeenCalled()
    expect(seenFullData).toEqual({ a: 'aval2', obj: { x: 1 } })
  })

  // Same staleness class for the `onEditEvent` lifecycle stream: emitters must
  // read `fullData` live (`getLatestData()`), not from the memoizable
  // `nodeData.fullData` prop a bailed subtree keeps stale.
  test('onEditEvent reports the live document, not a stale snapshot', async () => {
    const user = userEvent.setup()
    let seenFullData: unknown = null
    const onEditEvent = jest.fn<void, [EditEvent]>((e) => {
      if (e.event === 'commitEdit') seenFullData = e.fullData
    })
    const Host = () => {
      const [data, setData] = useState<object>({ a: 'aval', obj: { x: 1 } })
      return <JsonEditor data={data} setData={setData} onEditEvent={onEditEvent} showIconTooltips />
    }
    render(<Host />)

    // Commit a -> aval2; `obj`'s subtree (incl. `x`) bails on the commit, so its
    // `nodeData.fullData` is now stale.
    await user.dblClick(screen.getByText('"aval"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'aval2{Enter}')
    await screen.findByText('"aval2"')

    // Edit `x` (in the bailed subtree) and confirm — confirmEdit must carry the
    // live document (`a: 'aval2'`), not the stale snapshot (`a: 'aval'`).
    await user.dblClick(screen.getByText('1'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), '2{Enter}')

    expect(onEditEvent).toHaveBeenCalled()
    expect((seenFullData as { a: string }).a).toBe('aval2')
  })
})
