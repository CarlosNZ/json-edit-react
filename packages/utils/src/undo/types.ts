import type { JsonData, OnEditEventFunction } from 'json-edit-react'

export interface UseUndoResult<T = JsonData> {
  /** The current data — a passthrough of the value you pass in. */
  data: T
  /**
   * Record a snapshot and commit a new value. React-`setState`-shaped (accepts
   * a value or an updater); pass this as the editor's `setData`.
   */
  set: (data: T | ((prev: T) => T)) => void
  /**
   * Step back to the previous snapshot. No-op when
   * {@link UseUndoResult.canUndo} is false.
   */
  undo: () => void
  /** Step forward again. No-op when {@link UseUndoResult.canRedo} is false. */
  redo: () => void
  /**
   * Commit a value WITHOUT recording a snapshot — a change you don't want in
   * history.
   */
  replace: (data: T) => void
  /**
   * Commit a new baseline and clear all history. Use this to load a new
   * dataset.
   */
  reset: (data: T) => void
  /** Whether there's a snapshot to undo to. */
  canUndo: boolean
  /** Whether there's a snapshot to redo to. */
  canRedo: boolean
  /**
   * OPTIONAL editor wiring — pass as the editor's `onEditEvent`. Needed for one
   * case only: an **asynchronous** `onUpdate` that *rejects*. Such a rejection
   * commits optimistically then reverts, so both writes reach `set` and the
   * reverted (invalid) value would otherwise land in history; wiring this lets
   * the hook discard that reverted commit, so "Undo" never steps back to it.
   * Omitting it costs nothing otherwise — a synchronous reject never reaches
   * `set`, so it needs no correction. See the README.
   *
   * The hook always returns it, and it's declared optional only so a typed
   * mock or stub of `UseUndoResult` needn't supply it.
   */
  onEditEvent?: OnEditEventFunction<T>
}
