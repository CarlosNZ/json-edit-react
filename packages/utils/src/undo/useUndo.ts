import { useCallback, useRef, useState } from 'react'
import type { JsonData, OnEditEventFunction } from 'json-edit-react'
import { applyRedo, applyUndo, pushSnapshot, type UndoQueues } from './transitions'
import type { UseUndoResult } from './types'

/**
 * Wraps a consumer-owned `data`/`setData` pair with undo/redo. **Controlled**:
 * the hook never holds its own copy of the data — you own it (your own
 * `useState`), and the hook keeps only the snapshot stacks, committing each
 * change through your `setData`. So there's a single source of truth and
 * nothing to keep in sync.
 *
 * Pass the returned `set` as the editor's `setData`:
 *
 * ```tsx
 * const [data, setData] = useState(initialData)
 * const { set, undo, redo, canUndo, canRedo } = useUndo(data, setData)
 * // <JsonEditor data={data} setData={set} />
 * ```
 *
 * Each operation reads the live `data`/stacks, so the returned callbacks are
 * recreated per render. That's harmless to the editor — core reads `setData`
 * through a ref-to-latest, so a churning `set` never defeats node memoization.
 *
 * The hook only sees changes that go through its own API. To load a new
 * baseline (e.g. a different dataset) call `reset(newData)`, which clears
 * history. It deliberately does NOT auto-detect external changes by comparing
 * `data`: a reference compare would wipe history whenever an ancestor passed a
 * fresh-but-equal `data`, and a deep compare is too costly for a zero-dep
 * helper.
 */
export const useUndo = <T = JsonData>(data: T, setData: (data: T) => void): UseUndoResult<T> => {
  const [queues, setQueues] = useState<UndoQueues<T>>({ past: [], future: [] })

  // For the optional async-reject correction (see `onEditEvent` below): the
  // stacks as they were when the in-flight editor op was submitted, tagged with
  // its operation. A single slot — one in-flight op is corrected (the realistic
  // case). `null` when no edit/rename/add is awaiting settlement.
  const markerRef = useRef<{ queues: UndoQueues<T>; operation: 'edit' | 'rename' | 'add' } | null>(
    null
  )

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(data) : next
      setQueues(pushSnapshot(queues, data))
      setData(value)
    },
    [queues, data, setData]
  )

  const undo = useCallback(() => {
    const step = applyUndo(queues, data)
    if (!step) return
    setQueues(step.queues)
    setData(step.value)
  }, [queues, data, setData])

  const redo = useCallback(() => {
    const step = applyRedo(queues, data)
    if (!step) return
    setQueues(step.queues)
    setData(step.value)
  }, [queues, data, setData])

  const reset = useCallback(
    (next: T) => {
      setQueues({ past: [], future: [] })
      setData(next)
    },
    [setData]
  )

  // Optional editor wiring that corrects history for an ASYNC `onUpdate`
  // rejection. Such a rejection commits optimistically (one `set`) then reverts
  // (another `set`), so both writes record snapshots and the reverted value
  // would otherwise be reachable via undo. On submit we remember the stacks
  // (tagged with the operation); on a matching `updateError` we restore them,
  // erasing the apply+revert pair; on success we drop the marker. A SYNCHRONOUS
  // reject never reaches `set` (the editor resolves it in place), so its
  // `updateError` restores stacks that never moved — a harmless no-op. Reads
  // `queues` from the render closure, so it captures the pre-submit stacks.
  const onEditEvent = useCallback<OnEditEventFunction<T>>(
    (event) => {
      switch (event.event) {
        case 'submitEdit':
          markerRef.current = { queues, operation: 'edit' }
          break
        case 'submitRename':
          markerRef.current = { queues, operation: 'rename' }
          break
        case 'submitAdd':
          markerRef.current = { queues, operation: 'add' }
          break
        case 'updateError':
          // Only roll back the op this marker belongs to — a `delete`/`move`
          // (no `submit*`, different operation) must not consume an edit's
          // marker.
          if (markerRef.current?.operation === event.operation) {
            setQueues(markerRef.current.queues)
            markerRef.current = null
          }
          break
        case 'updateSuccess':
          if (markerRef.current?.operation === event.operation) markerRef.current = null
          break
      }
    },
    [queues]
  )

  return {
    data,
    set,
    undo,
    redo,
    replace: setData, //`replace` is just "commit, no snapshot"
    reset,
    canUndo: queues.past.length > 0,
    canRedo: queues.future.length > 0,
    onEditEvent,
  }
}
