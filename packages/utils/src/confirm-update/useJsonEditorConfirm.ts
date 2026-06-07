import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConfirmDialogState, ConfirmRequest, UseJsonEditorConfirmResult } from './types'

// Shared closed state — a stable identity so a closed dialog never churns.
const CLOSED: ConfirmDialogState = { isOpen: false, onConfirm: () => {}, onCancel: () => {} }

/**
 * The primitive (Layer 1): bridges an imperative "ask the user" to a
 * render-driven modal via a deferred promise.
 *
 * Core already `await`s `onUpdate` before committing and treats a `null` result
 * as a silent cancel, so an `onUpdate` that `await`s `confirm()` and returns
 * `null` when it resolves `false` gates the edit on the user's answer. The
 * promise's `resolve` is stashed in a ref (never state — resolving must not
 * depend on a render) and called from the modal's button handlers.
 *
 * The consumer brings their own modal and drives it from the returned `dialog`.
 */
export const useJsonEditorConfirm = (): UseJsonEditorConfirmResult => {
  const [dialog, setDialog] = useState<ConfirmDialogState>(CLOSED)
  const pendingRef = useRef<((ok: boolean) => void) | null>(null)

  const close = useCallback((ok: boolean) => {
    pendingRef.current?.(ok)
    pendingRef.current = null
    setDialog(CLOSED)
  }, [])

  const confirm = useCallback(
    (request: ConfirmRequest = {}) =>
      new Promise<boolean>((resolve) => {
        // Single-dialog model: supersede any still-open prompt by cancelling it.
        pendingRef.current?.(false)
        pendingRef.current = resolve
        setDialog({
          ...request,
          isOpen: true,
          onConfirm: () => close(true),
          onCancel: () => close(false),
        })
      }),
    [close]
  )

  // Unmount safety: resolve a dangling promise as cancelled so an awaiting
  // `onUpdate` doesn't hang forever. No `setState` here — the component is gone.
  useEffect(
    () => () => {
      pendingRef.current?.(false)
      pendingRef.current = null
    },
    []
  )

  return { confirm, dialog }
}
