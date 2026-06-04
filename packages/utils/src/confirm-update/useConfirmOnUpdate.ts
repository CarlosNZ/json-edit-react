import { useCallback } from 'react'
import type { JsonData, UpdateFunction, UpdateFunctionProps } from 'json-edit-react'
import { useJsonEditorConfirm } from './useJsonEditorConfirm'
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
  const { confirmOn, message, title, onUpdate: inner } = opts

  const onUpdate: UpdateFunction<T> = useCallback(
    async (input) => {
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
    },
    [confirm, confirmOn, message, title, inner]
  )

  return { onUpdate, dialog }
}
