import type { JsonData, UpdateFunction, UpdateFunctionProps } from 'json-edit-react'
import type { JsonEditorEventName } from '../_common/events'

/**
 * What the consumer passes to `confirm()`. `title`/`message` are conventional
 * and stay type-checked, but any extra keys are accepted as an opaque payload
 * (typed `unknown`) that the consumer's modal can read off the dialog state.
 */
export interface ConfirmRequest {
  title?: string
  message?: string
  [key: string]: unknown
}

/**
 * The reactive state the consumer drives their own modal from. Identity is
 * stable while closed (a shared `CLOSED` constant); a fresh object each time
 * `confirm()` opens it.
 */
export type ConfirmDialogState = ConfirmRequest & {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export interface UseJsonEditorConfirmResult {
  /** Imperatively ask; resolves `true` (confirmed) / `false` (cancelled). */
  confirm: (request?: ConfirmRequest) => Promise<boolean>
  /** Render-time dialog state for the consumer's modal. */
  dialog: ConfirmDialogState
}

/** A static string, or a function of the update input → string. */
export type ConfirmMessage<T = JsonData> = string | ((input: UpdateFunctionProps<T>) => string)

/**
 * When to confirm: a list of event names, or a predicate over the update input.
 */
export type ConfirmOn<T = JsonData> =
  | JsonEditorEventName[]
  | ((input: UpdateFunctionProps<T>) => boolean)

export interface UseConfirmOnUpdateOptions<T = JsonData> {
  /**
   * Gate which updates require confirmation — required (nothing to gate
   * without it).
   */
  confirmOn: ConfirmOn<T>
  /** Modal message (static, or built per-input). */
  message?: ConfirmMessage<T>
  /** Modal title (static, or built per-input). */
  title?: ConfirmMessage<T>
  /**
   * Your own update logic — runs only after a confirm (or when `confirmOn`
   * didn't match). For a gated event it runs once the user confirms, *after*
   * the value has been applied and the editor closed, so a `Promise` it returns
   * just settles in the background. For a non-gated event it runs as the normal
   * optimistic update with full `control` (it may call `hold()` itself).
   */
  onUpdate?: UpdateFunction<T>
}

export interface UseConfirmOnUpdateResult<T = JsonData> {
  /** Ready-made handler to pass to `<JsonEditor onUpdate={...} />`. */
  onUpdate: UpdateFunction<T>
  /** Render-time dialog state for the consumer's modal. */
  dialog: ConfirmDialogState
}
