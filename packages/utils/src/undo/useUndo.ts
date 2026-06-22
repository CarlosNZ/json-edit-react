import { useCallback, useState } from 'react'
import type { JsonData } from 'json-edit-react'
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

  return {
    data,
    set,
    undo,
    redo,
    replace: setData, //`replace` is just "commit, no snapshot"
    reset,
    canUndo: queues.past.length > 0,
    canRedo: queues.future.length > 0,
  }
}
