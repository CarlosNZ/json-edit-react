import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { JsonEditor } from '../src'
import type { EditEvent, UpdateFunction } from '../src'
import { dragAndDrop, rowFor } from './dndHelper'

// Drag-and-drop coverage for `useDragNDrop` (src/hooks/useDragNDrop.tsx).
//
// jsdom can't fire native drag events, so the helper file `dndHelper.ts`
// hand-drives `dragStart` / `dragOver` / `drop` via `fireEvent`. All
// tests here own the JSON state externally via `setData` (the recommended
// pattern per README) and assert on the data the editor pushes back.

const lastCall = (fn: jest.Mock) => fn.mock.calls[fn.mock.calls.length - 1]?.[0]

describe('Drag-and-drop: rearranging within a single collection', () => {
  test('moves a key inside an object', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2, c: 3 }} setData={setData} allowDrag />
    )

    // Drop 'a' onto the bottom half of 'b' → 'a' lands between 'b' and 'c'.
    await dragAndDrop(rowFor(container, 'a'), rowFor(container, 'b'), 'below')

    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as Record<string, number>
    expect(result).toEqual({ b: 2, a: 1, c: 3 })
    expect(Object.keys(result)).toEqual(['b', 'a', 'c'])
  })

  test('moves a key to the very top of an object', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2, c: 3 }} setData={setData} allowDrag />
    )

    await dragAndDrop(rowFor(container, 'c'), rowFor(container, 'a'), 'above')

    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as Record<string, number>
    expect(result).toEqual({ c: 3, a: 1, b: 2 })
    expect(Object.keys(result)).toEqual(['c', 'a', 'b'])
  })

  test('reorders elements within an array', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={[10, 20, 30, 40]} setData={setData} allowDrag />
    )

    // Move index 0 (value 10) to the bottom-half of index 2 (value 30).
    await dragAndDrop(rowFor(container, 0), rowFor(container, 2), 'below')

    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as number[]
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([20, 30, 10, 40])
  })
})

describe('Drag-and-drop: across sibling collections', () => {
  test('moves a key out of one object into a sibling object', async () => {
    const setData = jest.fn()
    const data = {
      src: { x: 1, y: 2 },
      dst: { z: 9 },
    }
    const { container } = render(<JsonEditor data={data} setData={setData} allowDrag />)

    // Drag 'x' (inside 'src') onto 'z' (inside 'dst'), below position.
    await dragAndDrop(rowFor(container, 'x'), rowFor(container, 'z'), 'below')

    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as typeof data
    expect(result.src).toEqual({ y: 2 })
    expect(result.dst).toEqual({ z: 9, x: 1 })
  })
})

describe('Drag-and-drop: edge cases', () => {
  test('dropping onto a leaf inside a different object reparents the source', async () => {
    // useDragNDrop fires onMove regardless of whether the target is itself
    // a leaf; the leaf's parent becomes the destination container. Pin
    // that behaviour so a refactor that changes it is forced to be
    // deliberate.
    const setData = jest.fn()
    const data = {
      src: { x: 1 },
      dst: { z: 'leaf' },
    }
    const { container } = render(<JsonEditor data={data} setData={setData} allowDrag />)

    await dragAndDrop(rowFor(container, 'x'), rowFor(container, 'z'), 'above')

    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as typeof data
    expect(result.src).toEqual({})
    // 'x' lands in dst, before 'z'
    expect(Object.keys(result.dst)).toEqual(['x', 'z'])
    expect(result.dst).toEqual({ x: 1, z: 'leaf' })
  })

  test('dropping a key onto a node whose parent already has that key is rejected', async () => {
    // The hook's handleDrop short-circuits with a KEY_EXISTS error in
    // this case (see useDragNDrop.tsx). setData must NOT be called and
    // onError gets a `KEY_EXISTS` error.
    const setData = jest.fn()
    const onError = jest.fn()
    const data = {
      src: { dup: 1 },
      dst: { dup: 2 },
    }
    // Production calls console.warn for the error; silence it here.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <JsonEditor data={data} setData={setData} onError={onError} allowDrag />
    )

    // Scope the target lookup to the `dst` subtree so we land on dst.dup,
    // not src.dup.
    const srcDup = rowFor(rowFor(container, 'src'), 'dup')
    const dstDup = rowFor(rowFor(container, 'dst'), 'dup')

    await dragAndDrop(srcDup, dstDup, 'above')

    expect(setData).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].error.code).toBe('KEY_EXISTS')

    warn.mockRestore()
  })

  test('an onUpdate that rejects a move reverts and fires updateError', async () => {
    // Production contract (useDragNDrop.tsx:172): "A rejected move reverts
    // and reports via the `updateError` event (which carries the SOURCE
    // identity)". With `onUpdate` supplied, a move is an INSTANT op that
    // defers its optimistic apply by OPTIMISTIC_DELAY_MS — a synchronous
    // `false` settles first, so `setData` is never called.
    const setData = jest.fn()
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(
      () => false as const
    )
    const onEditEvent = jest.fn<void, [EditEvent]>()
    const { container } = render(
      <JsonEditor
        data={{ a: 1, b: 2, c: 3 }}
        setData={setData}
        onUpdate={onUpdate}
        onEditEvent={onEditEvent}
        allowDrag
      />
    )

    await dragAndDrop(rowFor(container, 'a'), rowFor(container, 'b'), 'below')

    // onUpdate ran with a move event for the SOURCE node 'a'.
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ event: 'move', path: ['a'] })

    // The rejection settles synchronously (before the optimistic timer),
    // so setData is never called and the document never mutates.
    await waitFor(() =>
      expect(onEditEvent.mock.calls.map(([e]) => e.event)).toContain('updateError')
    )
    const updateErrorCall = onEditEvent.mock.calls.find(([e]) => e.event === 'updateError')
    expect(updateErrorCall?.[0]).toMatchObject({
      event: 'updateError',
      path: ['a'],
      operation: 'move',
    })
    expect(setData).not.toHaveBeenCalled()
  })
})

describe('Drag-and-drop: allowDrag', () => {
  test('allowDrag={true} enables reordering', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2 }} setData={setData} allowDrag />
    )

    expect(rowFor(container, 'a').getAttribute('draggable')).toBe('true')

    await dragAndDrop(rowFor(container, 'a'), rowFor(container, 'b'), 'below')
    expect(setData).toHaveBeenCalledTimes(1)
  })

  test('allowDrag function selectively enables per-node', async () => {
    const setData = jest.fn()
    // Allow dragging everywhere EXCEPT the key named "locked".
    const allowDrag = ({ key }: { key: string | number }) => key !== 'locked'

    const { container } = render(
      <JsonEditor
        data={{ free: 1, locked: 2, other: 3 }}
        setData={setData}
        allowDrag={allowDrag}
      />
    )

    // The non-draggable assertion below is the primary guard: in real
    // browsers `dragstart` never fires on a `draggable="false"` element,
    // and the helper mirrors that with an early return. We rely on this
    // attribute pinning, not on a downstream `setData` assertion that the
    // helper's guard would satisfy regardless of production behaviour.
    expect(rowFor(container, 'free').getAttribute('draggable')).toBe('true')
    expect(rowFor(container, 'locked').getAttribute('draggable')).toBe('false')

    // Dragging an allowed row still works.
    await dragAndDrop(rowFor(container, 'free'), rowFor(container, 'other'), 'below')
    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as Record<string, number>
    expect(Object.keys(result)).toEqual(['locked', 'other', 'free'])
  })

  test('allowDelete={false} gates allowDrag — `canDrag = allowDrag && canDelete`', () => {
    // useCommon: `canDrag = allowDragFilter(nodeData) && canDelete`.
    // So with `allowDelete={false}` the row stays non-draggable even when
    // `allowDrag` is set explicitly — that's the interaction this pins
    // (distinct from the plain default-false case covered elsewhere).
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2 }} setData={() => {}} allowDelete={false} allowDrag />
    )

    expect(rowFor(container, 'a').getAttribute('draggable')).toBe('false')
    expect(rowFor(container, 'b').getAttribute('draggable')).toBe('false')
  })
})

describe('Drag-and-drop: interaction with active edit', () => {
  test('the editing row becomes non-draggable while editing', () => {
    // Render-time gate: the leaf being edited flips `draggable` to "false"
    // (the ancestor chain's behaviour is covered separately in
    // JsonEditor.test.tsx).
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2, c: 3 }} setData={setData} allowDrag showIconTooltips />
    )

    expect(rowFor(container, 'a').getAttribute('draggable')).toBe('true')

    const editBtn = rowFor(container, 'a').querySelector(
      'button[aria-label="Edit"]'
    ) as HTMLElement
    expect(editBtn).not.toBeNull()
    act(() => {
      fireEvent.click(editBtn)
    })

    expect(rowFor(container, 'a').getAttribute('draggable')).toBe('false')
  })

  test('onDragStart rejects a drag on a sibling row while another is being edited', async () => {
    // Production gate at useDragNDrop.tsx:60 — `onDragStart` rejects when
    // `editingStore.getSnapshot().active !== null`. This test isolates
    // that clause by arming a drag on the sibling BEFORE the edit starts
    // (so `armed.current` is true and the unarmed-guard would let the
    // dragStart through), then opening the edit, then firing dragStart.
    // The only thing left to reject the drag is the editing-active clause.
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2, c: 3 }} setData={setData} allowDrag showIconTooltips />
    )

    const bRow = rowFor(container, 'b')
    const cRow = rowFor(container, 'c')

    // 1. Arm 'b' while nothing is being edited (onMouseDown only arms when
    //    `editingStore.getSnapshot().active === null`).
    act(() => {
      fireEvent.mouseDown(bRow, { button: 0 })
    })

    // 2. Open edit on 'a' (sets `active !== null`).
    const editBtn = rowFor(container, 'a').querySelector(
      'button[aria-label="Edit"]'
    ) as HTMLElement
    act(() => {
      fireEvent.click(editBtn)
    })

    // 3. Fire dragStart on the (still-armed) 'b' in its OWN `act()` so
    //    React commits `setDragSource({ path })` before the drop runs.
    //    Without the split, `dragStart` and `drop` run in the same batch:
    //    `handleDrop` then reads `dragSource.path === null` and returns
    //    early — the drop is a no-op for the wrong reason, and removing
    //    the editing-gate clause would NOT fail the test. With the split
    //    the only thing rejecting the drag is the editing-active clause.
    const dataTransfer = {
      data: {},
      setData: () => {},
      getData: () => '',
      clearData: () => {},
      setDragImage: () => {},
      dropEffect: 'none',
      effectAllowed: 'all',
      files: [],
      items: [],
      types: [],
    }
    await act(async () => {
      fireEvent.dragStart(bRow, { dataTransfer })
    })
    await act(async () => {
      fireEvent.dragOver(cRow, { dataTransfer })
      fireEvent.drop(cRow, { dataTransfer })
      await Promise.resolve()
      await Promise.resolve()
      fireEvent.dragEnd(bRow, { dataTransfer })
    })

    expect(setData).not.toHaveBeenCalled()
  })
})
