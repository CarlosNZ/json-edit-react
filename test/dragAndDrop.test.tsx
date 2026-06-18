import React from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { JsonEditor } from '../src'
import { dragAndDrop, rowFor } from './dndHelper'

// Drag-and-drop coverage for `useDragNDrop` (src/hooks/useDragNDrop.tsx).
//
// jsdom can't fire native drag events, so the helper file `dndHelper.ts`
// hand-drives `dragStart` / `dragOver` / `drop` via `fireEvent`.  All tests
// here own the JSON state externally via `setData` (the recommended pattern
// per README) and assert on the data the editor pushes back to the consumer.

const lastCall = (fn: jest.Mock) => fn.mock.calls[fn.mock.calls.length - 1]?.[0]

describe('Drag-and-drop: rearranging within a single collection', () => {
  test('moves a key inside an object', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2, c: 3 }} setData={setData} restrictDrag={false} />
    )

    // Drop 'a' onto the bottom half of 'b' → 'a' should land between 'b' and 'c'.
    await dragAndDrop(rowFor(container, 'a'), rowFor(container, 'b'), 'below')

    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as Record<string, number>
    expect(Object.keys(result)).toEqual(['b', 'a', 'c'])
    // Values unchanged
    expect(result).toEqual({ b: 2, a: 1, c: 3 })
  })

  test('moves a key to the very top of an object', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2, c: 3 }} setData={setData} restrictDrag={false} />
    )

    await dragAndDrop(rowFor(container, 'c'), rowFor(container, 'a'), 'above')

    const result = lastCall(setData) as Record<string, number>
    expect(Object.keys(result)).toEqual(['c', 'a', 'b'])
    expect(result).toEqual({ c: 3, a: 1, b: 2 })
  })

  test('reorders elements within an array', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={[10, 20, 30, 40]} setData={setData} restrictDrag={false} />
    )

    // Move index 0 (value 10) to the bottom-half of index 2 (value 30).
    await dragAndDrop(rowFor(container, 0), rowFor(container, 2), 'below')

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
    const { container } = render(
      <JsonEditor data={data} setData={setData} restrictDrag={false} />
    )

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
    // useDragNDrop fires onMove regardless of whether the target is itself a
    // leaf; the leaf's parent becomes the destination container.  Pin that
    // behaviour so a refactor that changes it is forced to be deliberate.
    const setData = jest.fn()
    const data = {
      src: { x: 1 },
      dst: { z: 'leaf' },
    }
    const { container } = render(
      <JsonEditor data={data} setData={setData} restrictDrag={false} />
    )

    await dragAndDrop(rowFor(container, 'x'), rowFor(container, 'z'), 'above')

    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as typeof data
    expect(result.src).toEqual({})
    // 'x' lands in dst, before 'z'
    expect(Object.keys(result.dst)).toEqual(['x', 'z'])
    expect(result.dst).toEqual({ x: 1, z: 'leaf' })
  })

  test('dropping a key onto a node whose parent already has that key is rejected', async () => {
    // The hook's handleDrop short-circuits with a KEY_EXISTS error in this
    // case (see useDragNDrop.tsx).  setData must NOT be called and onError
    // gets a `KEY_EXISTS` error.
    const setData = jest.fn()
    const onError = jest.fn()
    const data = {
      src: { dup: 1 },
      dst: { dup: 2 },
    }
    // Production calls console.warn for the error; silence it during this test.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <JsonEditor data={data} setData={setData} onError={onError} restrictDrag={false} />
    )

    // Scope the target lookup to the `dst` subtree so we land on dst.dup, not src.dup.
    const srcDup = rowFor(rowFor(container, 'src'), 'dup')
    const dstDup = rowFor(rowFor(container, 'dst'), 'dup')

    await dragAndDrop(srcDup, dstDup, 'above')

    expect(setData).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].error.code).toBe('KEY_EXISTS')

    warn.mockRestore()
  })
})

describe('Drag-and-drop: restrictDrag', () => {
  test('restrictDrag={true} (the default) blocks reordering', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2 }} setData={setData} />
    )

    // The draggable attribute should be absent / false on rows that can't drag.
    const aRow = rowFor(container, 'a')
    expect(aRow.getAttribute('draggable')).toBe('false')

    await dragAndDrop(aRow, rowFor(container, 'b'), 'below')
    expect(setData).not.toHaveBeenCalled()
  })

  test('restrictDrag={false} enables reordering', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2 }} setData={setData} restrictDrag={false} />
    )

    expect(rowFor(container, 'a').getAttribute('draggable')).toBe('true')

    await dragAndDrop(rowFor(container, 'a'), rowFor(container, 'b'), 'below')
    expect(setData).toHaveBeenCalledTimes(1)
  })

  test('restrictDrag function selectively blocks per-node', async () => {
    const setData = jest.fn()
    // Block dragging on the key named "locked", allow everything else.
    const restrictDrag = ({ key }: { key: string | number }) => key === 'locked'

    const { container } = render(
      <JsonEditor
        data={{ free: 1, locked: 2, other: 3 }}
        setData={setData}
        restrictDrag={restrictDrag}
      />
    )

    expect(rowFor(container, 'free').getAttribute('draggable')).toBe('true')
    expect(rowFor(container, 'locked').getAttribute('draggable')).toBe('false')

    // Attempting to drag the locked row is a no-op.
    await dragAndDrop(rowFor(container, 'locked'), rowFor(container, 'other'), 'below')
    expect(setData).not.toHaveBeenCalled()

    // Dragging an allowed row still works.
    await dragAndDrop(rowFor(container, 'free'), rowFor(container, 'other'), 'below')
    expect(setData).toHaveBeenCalledTimes(1)
    const result = lastCall(setData) as Record<string, number>
    expect(Object.keys(result)).toEqual(['locked', 'other', 'free'])
  })

  test('viewOnly disables dragging regardless of restrictDrag={false}', async () => {
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, b: 2 }} setData={setData} viewOnly restrictDrag={false} />
    )

    expect(rowFor(container, 'a').getAttribute('draggable')).toBe('false')
    await dragAndDrop(rowFor(container, 'a'), rowFor(container, 'b'), 'below')
    expect(setData).not.toHaveBeenCalled()
  })
})

describe('Drag-and-drop: interaction with active edit', () => {
  test('rows become non-draggable while an edit session is open', async () => {
    // Per `useCommon.ts`, `canDrag` is gated on `currentlyEditingElement === null`.
    // So as soon as the user clicks Edit on any row, every row in the tree
    // should report `draggable="false"`, and a drag attempt should be a no-op.
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor
        data={{ a: 1, b: 2, c: 3 }}
        setData={setData}
        restrictDrag={false}
        showIconTooltips
      />
    )

    // Sanity: rows are draggable before any edit starts.
    expect(rowFor(container, 'a').getAttribute('draggable')).toBe('true')
    expect(rowFor(container, 'b').getAttribute('draggable')).toBe('true')

    // Open edit on 'a'.
    const editBtn = rowFor(container, 'a').querySelector(
      'div[title="Edit"]'
    ) as HTMLElement
    expect(editBtn).not.toBeNull()
    act(() => {
      fireEvent.click(editBtn)
    })

    // All rows now non-draggable.
    expect(rowFor(container, 'a').getAttribute('draggable')).toBe('false')
    expect(rowFor(container, 'b').getAttribute('draggable')).toBe('false')
    expect(rowFor(container, 'c').getAttribute('draggable')).toBe('false')

    // And attempting a drag has no effect.
    await dragAndDrop(rowFor(container, 'b'), rowFor(container, 'c'), 'below')
    expect(setData).not.toHaveBeenCalled()
  })
})
