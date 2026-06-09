import { useCallback } from 'react'
import type { JsonData, UpdateFunction, UpdateFunctionProps } from 'json-edit-react'
import { useJsonEditorConfirm } from './useJsonEditorConfirm'
import type { ConfirmMessage, UseConfirmOnUpdateOptions, UseConfirmOnUpdateResult } from './types'

const resolveMessage = <T>(
  message: ConfirmMessage<T> | undefined,
  input: UpdateFunctionProps<T>
) => (typeof message === 'function' ? message(input) : message)

/**
 * The declarative wrapper (Layer 2), built on {@link useJsonEditorConfirm}. For
 * the common case — "ask before these events" — it pre-writes the gate: it calls
 * `control.hold()` synchronously (so the editor stays open and the tree is
 * blocked while the dialog is up), awaits the consumer's modal, then `release()`s
 * on confirm — or returns `null` (a silent cancel; nothing was applied) on
 * dismiss. The consumer just wires the returned `dialog` to their modal.
 *
 * Why this exists: core commits optimistically by default, so gating an edit on
 * a dialog means opting out via `hold()` — which MUST be called synchronously,
 * before the first `await`. Getting that timing right (and bridging the
 * imperative "ask" to a render-driven modal, via {@link useJsonEditorConfirm})
 * is the fiddly part this packages up.
 *
 * The returned `onUpdate`'s identity changes when options are passed inline, but
 * core reads `onUpdate` through a ref, so that churn is harmless — consumers
 * needn't memoize their options.
 */
export const useConfirmOnUpdate = <T = JsonData>(
  opts: UseConfirmOnUpdateOptions<T>
): UseConfirmOnUpdateResult<T> => {
  const { confirm, dialog } = useJsonEditorConfirm()
  const { confirmOn, message, title, onUpdate: inner } = opts

  const onUpdate: UpdateFunction<T> = useCallback(
    async (input, control) => {
      const shouldConfirm = Array.isArray(confirmOn)
        ? confirmOn.includes(input.event)
        : confirmOn(input)

      // `hold()` opts this commit out of the default optimistic close — the
      // editor stays open and the rest of the tree is blocked while the dialog
      // is up. It MUST run in the synchronous prefix (before the first `await`),
      // so it's the first thing we do when this event is gated.
      const release = shouldConfirm ? control.hold() : undefined

      if (release) {
        const ok = await confirm({
          title: resolveMessage(title, input),
          message: resolveMessage(message, input),
        })
        // Dismissed → silent cancel: the gate never released, so nothing was
        // applied and the editor closes with the original value.
        if (!ok) return null
        // Confirmed → apply the value + close the editor now. Any `inner` work
        // below then settles in the background (the commit has already landed).
        release()
      }

      return inner ? inner(input, control) : undefined
    },
    [confirm, confirmOn, message, title, inner]
  )

  return { onUpdate, dialog }
}
