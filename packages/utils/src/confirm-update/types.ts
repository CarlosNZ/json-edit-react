import type { JsonData, UpdateFunction, UpdateFunctionProps } from 'json-edit-react'

/**
 * The mutation events core can fire, derived from core's own contract so it
 * can't drift. This is the vocabulary for the `confirmOn` array shorthand.
 *   → 'edit' | 'add' | 'delete' | 'rename' | 'move'
 */
export type JsonEditorEventName = UpdateFunctionProps['event']

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

/** When to confirm: a list of event names, or a predicate over the update input. */
export type ConfirmOn<T = JsonData> =
  | JsonEditorEventName[]
  | ((input: UpdateFunctionProps<T>) => boolean)

export interface UseConfirmOnUpdateOptions<T = JsonData> {
  /** Gate which updates require confirmation — required (nothing to gate without it). */
  confirmOn: ConfirmOn<T>
  /** Modal message (static, or built per-input). */
  message?: ConfirmMessage<T>
  /** Modal title (static, or built per-input). */
  title?: ConfirmMessage<T>
  /** Your own update logic — runs only after a confirm (or when `confirmOn` didn't match). */
  onUpdate?: UpdateFunction<T>
}

export interface UseConfirmOnUpdateResult<T = JsonData> {
  /** Ready-made handler to pass to `<JsonEditor onUpdate={...} />`. */
  onUpdate: UpdateFunction<T>
  /** Render-time dialog state for the consumer's modal. */
  dialog: ConfirmDialogState
}
