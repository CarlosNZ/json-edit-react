import { useState } from 'react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { type JsonData, type UpdateFunction } from '../src/types'
import { useUndo } from '../packages/utils/src'
// Pure transitions are package-internal (not re-exported from the barrel), so
// the queue-maths unit tests reach for them directly.
import { applyRedo, applyUndo, pushSnapshot } from '../packages/utils/src/undo/transitions'

type Doc = { v: number }

// A harness that owns `data`/`setData` (as a consumer would) so
// `set`/`undo`/etc. actually drive the present, and `result.current` reflects
// the committed value.
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

// Drives a real editor through `useUndo` (as a consumer would: `set` is the
// editor's `setData`), surfacing `canUndo` so the test can read the stack.
const UndoEditor = ({ initial, onUpdate }: { initial: JsonData; onUpdate?: UpdateFunction }) => {
  const [data, setData] = useState<JsonData>(initial)
  const undo = useUndo<JsonData>(data, setData)
  return (
    <>
      <span data-testid="can-undo">{String(undo.canUndo)}</span>
      <JsonEditor<JsonData> data={undo.data} setData={undo.set} onUpdate={onUpdate} />
    </>
  )
}

describe('useUndo + JsonEditor (synchronous-reject integration)', () => {
  it('a synchronously rejected edit leaves the undo stack clean', async () => {
    const user = userEvent.setup()
    // A synchronous validator that rejects the edit.
    const onUpdate: UpdateFunction = () => false
    render(<UndoEditor initial={{ x: 'hello' }} onUpdate={onUpdate} />)
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false')

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'rejected{Enter}')

    await waitFor(() => expect(screen.getByText('Update unsuccessful')).toBeInTheDocument())
    // The reject never wrote through `set`, so there is no snapshot to undo —
    // no phantom step that would step back to the rejected value (the original
    // #issue this fix addresses).
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false')
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  it('a valid edit records exactly one undoable step', async () => {
    const user = userEvent.setup()
    render(<UndoEditor initial={{ x: 'hello' }} />)
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false')

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'world{Enter}')

    await waitFor(() => expect(screen.getByText('"world"')).toBeInTheDocument())
    expect(screen.getByTestId('can-undo')).toHaveTextContent('true')
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
