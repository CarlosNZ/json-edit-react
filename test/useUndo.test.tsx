import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { useUndo } from '../packages/utils/src'
// Pure transitions are package-internal (not re-exported from the barrel), so the
// queue-maths unit tests reach for them directly.
import { applyRedo, applyUndo, pushSnapshot } from '../packages/utils/src/undo/transitions'

type Doc = { v: number }

// A harness that owns `data`/`setData` (as a consumer would) so `set`/`undo`/etc.
// actually drive the present, and `result.current` reflects the committed value.
const renderUndo = (initial: Doc) =>
  renderHook(() => {
    const [data, setData] = useState<Doc>(initial)
    return useUndo<Doc>(data, setData)
  })

describe('useUndo — behaviour', () => {
  it('starts empty', () => {
    const { result } = renderUndo({ v: 0 })
    expect(result.current.data).toEqual({ v: 0 })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('set records a snapshot and commits the new value', () => {
    const { result } = renderUndo({ v: 0 })
    act(() => result.current.set({ v: 1 }))
    expect(result.current.data).toEqual({ v: 1 })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undo restores the previous value and enables redo; redo returns forward', () => {
    const { result } = renderUndo({ v: 0 })
    act(() => result.current.set({ v: 1 }))
    act(() => result.current.set({ v: 2 }))

    act(() => result.current.undo())
    expect(result.current.data).toEqual({ v: 1 })
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.undo())
    expect(result.current.data).toEqual({ v: 0 })
    expect(result.current.canUndo).toBe(false)

    act(() => result.current.redo())
    expect(result.current.data).toEqual({ v: 1 })

    act(() => result.current.redo())
    expect(result.current.data).toEqual({ v: 2 })
    expect(result.current.canRedo).toBe(false)
  })

  it('a fresh set after an undo clears the redo stack', () => {
    const { result } = renderUndo({ v: 0 })
    act(() => result.current.set({ v: 1 }))
    act(() => result.current.set({ v: 2 }))
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.set({ v: 9 }))
    expect(result.current.data).toEqual({ v: 9 })
    expect(result.current.canRedo).toBe(false)
    expect(result.current.canUndo).toBe(true)
  })

  it('undo and redo are no-ops at the ends of the stack', () => {
    const { result } = renderUndo({ v: 0 })

    act(() => result.current.undo())
    expect(result.current.data).toEqual({ v: 0 })
    expect(result.current.canUndo).toBe(false)

    act(() => result.current.set({ v: 1 }))
    act(() => result.current.redo())
    expect(result.current.data).toEqual({ v: 1 })
    expect(result.current.canRedo).toBe(false)
  })

  it('replace commits without touching the history stacks', () => {
    const { result } = renderUndo({ v: 0 })
    act(() => result.current.set({ v: 1 }))

    act(() => result.current.replace({ v: 99 }))
    expect(result.current.data).toEqual({ v: 99 })
    // The snapshot from the earlier `set` is untouched.
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('reset commits a new baseline and clears all history', () => {
    const { result } = renderUndo({ v: 0 })
    act(() => result.current.set({ v: 1 }))
    act(() => result.current.set({ v: 2 }))
    act(() => result.current.undo())
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.reset({ v: 50 }))
    expect(result.current.data).toEqual({ v: 50 })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('set accepts a React-style updater', () => {
    const { result } = renderUndo({ v: 5 })
    act(() => result.current.set((prev) => ({ v: prev.v + 1 })))
    expect(result.current.data).toEqual({ v: 6 })
    expect(result.current.canUndo).toBe(true)
  })
})

describe('undo transitions (pure)', () => {
  it('pushSnapshot records current at the front and clears future', () => {
    expect(pushSnapshot({ past: ['a'], future: ['c'] }, 'b')).toEqual({
      past: ['b', 'a'],
      future: [],
    })
  })

  it('applyUndo returns null when past is empty', () => {
    expect(applyUndo({ past: [], future: [] }, 'x')).toBeNull()
  })

  it('applyUndo surfaces the most-recent snapshot and stacks current onto future', () => {
    expect(applyUndo({ past: ['b', 'a'], future: [] }, 'c')).toEqual({
      queues: { past: ['a'], future: ['c'] },
      value: 'b',
    })
  })

  it('applyRedo returns null when future is empty', () => {
    expect(applyRedo({ past: [], future: [] }, 'x')).toBeNull()
  })

  it('applyRedo is the mirror of applyUndo', () => {
    expect(applyRedo({ past: ['a'], future: ['c'] }, 'b')).toEqual({
      queues: { past: ['b', 'a'], future: [] },
      value: 'c',
    })
  })
})
