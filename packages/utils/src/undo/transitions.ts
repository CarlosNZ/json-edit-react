import type { JsonData } from 'json-edit-react'

/**
 * The two snapshot stacks. Internal to {@link useUndo} and these transitions —
 * not part of the public API. Convention: **newest-at-front**, so `past[0]` is the
 * most-recent prior state and `future[0]` is the next state to redo into.
 */
export interface UndoQueues<T = JsonData> {
  past: T[]
  future: T[]
}

/**
 * Pure history transitions — no React, so the queue maths can be unit-tested in
 * isolation and the hook stays a thin wrapper. None mutate their inputs.
 *
 * Each takes the current stacks plus the live `current` value. `undo`/`redo`
 * return both the new stacks and the `value` to commit (or `null` when there's
 * nothing to do), because the value to restore lives in the stack being read.
 */

/** `set`: record `current` as a snapshot and drop the redo stack. */
export const pushSnapshot = <T,>(queues: UndoQueues<T>, current: T): UndoQueues<T> => ({
  past: [current, ...queues.past],
  future: [],
})

/**
 * `undo`: surface the most-recent past snapshot and push `current` onto the redo
 * stack. `null` when there's nothing to undo (empty `past`).
 */
export const applyUndo = <T,>(
  queues: UndoQueues<T>,
  current: T
): { queues: UndoQueues<T>; value: T } | null => {
  if (queues.past.length === 0) return null
  const [value, ...past] = queues.past
  return { queues: { past, future: [current, ...queues.future] }, value }
}

/** `redo`: the mirror of {@link applyUndo}. `null` when there's nothing to redo. */
export const applyRedo = <T,>(
  queues: UndoQueues<T>,
  current: T
): { queues: UndoQueues<T>; value: T } | null => {
  if (queues.future.length === 0) return null
  const [value, ...future] = queues.future
  return { queues: { past: [current, ...queues.past], future }, value }
}
