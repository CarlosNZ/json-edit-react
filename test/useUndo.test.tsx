import { useState } from 'react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { type EditEvent, type JsonData, type UpdateFunction } from '../src/types'
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

// A promise whose resolution the test drives, to control when a background
// `onUpdate` settlement lands.
const makeDeferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

// Drives a real editor through `useUndo` (as a consumer would: `set` is the
// editor's `setData`), surfacing `canUndo` and an undo button so the test can
// read and drive the stack. `wireEvents` opts into the async-reject corrector.
const UndoEditor = ({
  initial,
  onUpdate,
  wireEvents = false,
}: {
  initial: JsonData
  onUpdate?: UpdateFunction
  wireEvents?: boolean
}) => {
  const [data, setData] = useState<JsonData>(initial)
  const undo = useUndo<JsonData>(data, setData)
  return (
    <>
      <span data-testid="can-undo">{String(undo.canUndo)}</span>
      <button onClick={undo.undo}>undo</button>
      <JsonEditor<JsonData>
        data={undo.data}
        setData={undo.set}
        onUpdate={onUpdate}
        onEditEvent={wireEvents ? undo.onEditEvent : undefined}
      />
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

describe('useUndo + JsonEditor (async-reject correction via onEditEvent)', () => {
  it('WITHOUT onEditEvent, an async reject pollutes history (documented limitation)', async () => {
    const user = userEvent.setup()
    const deferred = makeDeferred<false>()
    render(<UndoEditor initial={{ x: 'hello' }} onUpdate={() => deferred.promise} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'rejected{Enter}')

    // Async verdict can't be known in time → optimistic apply lands.
    await waitFor(() => expect(screen.getByText('"rejected"')).toBeInTheDocument())
    await act(async () => {
      deferred.resolve(false)
    })
    await waitFor(() => expect(screen.getByText('Update unsuccessful')).toBeInTheDocument())

    // Apply + revert both wrote through `set`, so a phantom step remains and
    // undo restores the rejected value. This is the gap `onEditEvent` closes;
    // pinned so the un-wired contract stays honest.
    expect(screen.getByTestId('can-undo')).toHaveTextContent('true')
    await user.click(screen.getByText('undo'))
    expect(screen.getByText('"rejected"')).toBeInTheDocument()
  })

  it('WITH onEditEvent, an async reject leaves the undo stack clean', async () => {
    const user = userEvent.setup()
    const deferred = makeDeferred<false>()
    render(<UndoEditor initial={{ x: 'hello' }} onUpdate={() => deferred.promise} wireEvents />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'rejected{Enter}')

    await waitFor(() => expect(screen.getByText('"rejected"')).toBeInTheDocument())
    await act(async () => {
      deferred.resolve(false)
    })
    await waitFor(() => expect(screen.getByText('Update unsuccessful')).toBeInTheDocument())

    // The corrector erased the apply+revert pair: nothing to undo, value back
    // to the original.
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false')
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  it('WITH onEditEvent, a valid async edit still records exactly one step', async () => {
    const user = userEvent.setup()
    const deferred = makeDeferred<true>()
    render(<UndoEditor initial={{ x: 'hello' }} onUpdate={() => deferred.promise} wireEvents />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'world{Enter}')

    await waitFor(() => expect(screen.getByText('"world"')).toBeInTheDocument())
    await act(async () => {
      deferred.resolve(true)
    })
    // One undoable step (no over-correction); undo returns to the original.
    expect(screen.getByTestId('can-undo')).toHaveTextContent('true')
    await user.click(screen.getByText('undo'))
    await waitFor(() => expect(screen.getByText('"hello"')).toBeInTheDocument())
  })

  it('WITH onEditEvent, a synchronous reject stays clean (corrector is a no-op)', async () => {
    const user = userEvent.setup()
    render(<UndoEditor initial={{ x: 'hello' }} onUpdate={() => false} wireEvents />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'rejected{Enter}')

    await waitFor(() => expect(screen.getByText('Update unsuccessful')).toBeInTheDocument())
    // Sync reject never reached `set`; the corrector's restore is a no-op.
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false')
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })
})

describe('useUndo — async-reject correction (unit)', () => {
  // Minimal synthetic events — the corrector reads only `event`/`operation`.
  const ev = (e: { event: string; operation?: string }) => e as unknown as EditEvent<Doc>

  it('updateError after an optimistic apply+revert restores the pre-submit stacks', () => {
    const { result } = renderUndo({ v: 0 })
    // A prior, legitimate committed step.
    act(() => result.current.set({ v: 1 }))
    expect(result.current.canUndo).toBe(true)

    // An async edit: submitted, optimistically applied, then reverted on a
    // reject.
    act(() => result.current.onEditEvent(ev({ event: 'submitEdit' })))
    act(() => result.current.set({ v: 99 })) // optimistic apply
    act(() => result.current.set({ v: 1 })) // revert
    act(() => result.current.onEditEvent(ev({ event: 'updateError', operation: 'edit' })))

    // The apply+revert pair is erased; only the prior legit step remains.
    expect(result.current.data).toEqual({ v: 1 })
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.data).toEqual({ v: 0 })
    expect(result.current.canUndo).toBe(false)
  })

  it("a delete/move updateError does not consume an edit's marker", () => {
    const { result } = renderUndo({ v: 0 })
    act(() => result.current.onEditEvent(ev({ event: 'submitEdit' })))
    act(() => result.current.set({ v: 1 })) // optimistic apply, still in flight

    // A concurrent instant-op rejection (different operation) must be ignored,
    // leaving the edit's marker intact.
    act(() => result.current.onEditEvent(ev({ event: 'updateError', operation: 'delete' })))
    expect(result.current.canUndo).toBe(true)

    // The edit's own rejection still corrects.
    act(() => result.current.set({ v: 0 })) // revert
    act(() => result.current.onEditEvent(ev({ event: 'updateError', operation: 'edit' })))
    expect(result.current.canUndo).toBe(false)
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
