import { useCallback, useMemo, useState } from 'react'
import { toPathString } from 'json-edit-react'
import type { JsonData, UpdateFunction, UpdateFunctionProps } from 'json-edit-react'
import { useJsonEditorConfirm } from './useJsonEditorConfirm'
import { createPendingCommitDefinition, type PendingUpdate } from '../_common/pendingNode'
import type { ConfirmMessage, UseConfirmOnUpdateOptions, UseConfirmOnUpdateResult } from './types'

const resolveMessage = <T,>(message: ConfirmMessage<T> | undefined, input: UpdateFunctionProps<T>) =>
  typeof message === 'function' ? message(input) : message

/**
 * The declarative wrapper (Layer 2), built on {@link useJsonEditorConfirm}. For
 * the common case — "ask before these events" — it pre-writes the
 * branch → await confirm → `return null` on cancel boilerplate, handing back a
 * ready-made `onUpdate` plus the same `dialog` to drive the consumer's modal.
 *
 * The returned `onUpdate`'s identity changes when options are passed inline, but
 * core reads `onUpdate` through a ref, so that churn is harmless — consumers
 * needn't memoize their options.
 */
export const useConfirmOnUpdate = <T = JsonData,>(
  opts: UseConfirmOnUpdateOptions<T>
): UseConfirmOnUpdateResult<T> => {
  const { confirm, dialog } = useJsonEditorConfirm()
  const { confirmOn, message, title, onUpdate: inner, pendingComponent } = opts

  // The node whose update is in flight. Set at the start of every update and
  // cleared in `finally`, so it spans both the confirm dialog and a slow inner
  // `onUpdate`. The synchronous, non-confirmed path sets + clears with no `await`
  // between, so React batches it to a no-op (no flicker).
  const [pending, setPending] = useState<PendingUpdate | null>(null)

  // Build the pending-overlay definition only when the consumer supplies a UI
  // component (the library ships none). Memoized on `[pending, pendingComponent]`
  // so its identity changes exactly when `pending` does — the editor's memo
  // comparator needs that to re-render the affected node.
  const pendingNodeDefinition = useMemo(
    () => (pendingComponent ? createPendingCommitDefinition(pending, pendingComponent) : undefined),
    [pending, pendingComponent]
  )

  const onUpdate: UpdateFunction<T> = useCallback(
    async (input) => {
      setPending({ path: toPathString(input.path), event: input.event })
      try {
        const shouldConfirm = Array.isArray(confirmOn)
          ? confirmOn.includes(input.event)
          : confirmOn(input)
        if (shouldConfirm) {
          const ok = await confirm({
            title: resolveMessage(title, input),
            message: resolveMessage(message, input),
          })
          if (!ok) return null
        }
        return inner ? inner(input) : undefined
      } finally {
        setPending(null)
      }
    },
    [confirm, confirmOn, message, title, inner]
  )

  return { onUpdate, dialog, pending, pendingNodeDefinition }
}
