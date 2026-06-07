import type { JsonData } from 'json-edit-react'

export interface UseUndoResult<T = JsonData> {
  /** The current data — a passthrough of the value you pass in. */
  data: T
  /**
   * Record a snapshot and commit a new value. React-`setState`-shaped (accepts a
   * value or an updater); pass this as the editor's `setData`.
   */
  set: (data: T | ((prev: T) => T)) => void
  /** Step back to the previous snapshot. No-op when {@link UseUndoResult.canUndo} is false. */
  undo: () => void
  /** Step forward again. No-op when {@link UseUndoResult.canRedo} is false. */
  redo: () => void
  /** Commit a value WITHOUT recording a snapshot — a change you don't want in history. */
  replace: (data: T) => void
  /** Commit a new baseline and clear all history. Use this to load a new dataset. */
  reset: (data: T) => void
  /** Whether there's a snapshot to undo to. */
  canUndo: boolean
  /** Whether there's a snapshot to redo to. */
  canRedo: boolean
}
