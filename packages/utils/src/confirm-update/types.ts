import type {
  CustomNodeDefinition,
  JsonData,
  UpdateFunction,
  UpdateFunctionProps,
} from 'json-edit-react'
import type { JsonEditorEventName } from '../_common/events'
import type { PendingUpdate } from '../_common/pendingNode'

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
  /**
   * Optional custom-node component that renders the in-flight node as a "pending"
   * overlay while a confirm/async `onUpdate` is outstanding. Supply your own — the
   * library ships no UI. When given, the hook returns a ready `pendingNodeDefinition`.
   *
   * You usually only need this when confirming **edits** (whose node would otherwise
   * show the new value as if already applied) or running a slow async `onUpdate`. For
   * the common **delete**-confirm case you can omit it: the node already sits there
   * showing the item until you confirm.
   */
  pendingComponent?: NonNullable<CustomNodeDefinition['component']>
}

export interface UseConfirmOnUpdateResult<T = JsonData> {
  /** Ready-made handler to pass to `<JsonEditor onUpdate={...} />`. */
  onUpdate: UpdateFunction<T>
  /** Render-time dialog state for the consumer's modal. */
  dialog: ConfirmDialogState
  /**
   * The node whose update is in flight (set while awaiting confirmation or a
   * slow async `onUpdate`, `null` otherwise). Exposed for custom pending UI; if
   * you pass `pendingComponent`, prefer the ready-made `pendingNodeDefinition`.
   */
  pending: PendingUpdate | null
  /**
   * A memoized custom-node definition wiring `pendingComponent` to the in-flight
   * node, or `undefined` when no `pendingComponent` was supplied. Merge it into
   * your `customNodeDefinitions` (keeping that array referentially stable):
   *
   * ```tsx
   * const defs = useMemo(
   *   () => (pendingNodeDefinition ? [pendingNodeDefinition, ...mine] : mine),
   *   [pendingNodeDefinition, mine]
   * )
   * ```
   */
  pendingNodeDefinition?: CustomNodeDefinition
}
