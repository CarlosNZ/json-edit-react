/**
 * §17 API STANDARDISATION — CANONICAL TYPES (staging)
 *
 * The consumer-facing API expressed as the three-category model plus an
 * imperative command handle:
 *
 *   - Category 1 — Gates: run *before* an action, answer "should this proceed /
 *     am I taking over?" (`allow*`, `onEventIntercept`). Return `boolean`/`void`.
 *   - Category 2 — Result producers: run *at commit*, answer "accept / reject /
 *     transform?" (`onUpdate`, `onChange`). Return the canonical result shape.
 *   - Category 3 — Observers: run *after*, return ignored (`onError`,
 *     `onEditEvent`, `onCollapse`, `onCopy`).
 *   - Category 4 — Imperative commands: the `editorRef` handle.
 *
 * Every callback receives a flat `NodeData<T>` (reused from `./types`) with
 * category-specific fields and, where relevant, an `event` discriminant spread
 * on top. `value` (current node value) and `fullData` (current document) cover
 * "current", so update payloads add only the *new* bit (`newValue`/`newKey`/…).
 *
 * These types are deliberately unused for now — each is wired into the
 * implementation (replacing its legacy counterpart in `./types`) by a later
 * §17 phase.
 */

import type { JsonData, CollectionKey, ValueData, NodeData } from './types'

/* ============================================================================
 * Shared building blocks
 * ========================================================================== */

/**
 * The definitive error code list, split by surfacing channel:
 *   - Group A (mutation / edit flow)   → `onError` observer + `UpdateResult.error`
 *   - Group B (imperative command flow) → `CommandResult.error` (the return value)
 */
export type JsonEditorErrorCode =
  // Group A — mutation / edit flow
  | 'UPDATE_ERROR' // an edit was rejected, or an internal failure occurred
  | 'ADD_ERROR' // an add was rejected
  | 'DELETE_ERROR' // a delete was rejected
  | 'KEY_EXISTS' // a new/renamed key collides with an existing sibling
  | 'INVALID_JSON' // raw JSON typed into the editor failed to parse
  // Group B — imperative command flow (Category 4)
  | 'PATH_NOT_FOUND' // a command targeted a path that doesn't exist in the current data
  | 'RESTRICTED' // a command's action is blocked by an `allow*` filter

/** The one canonical error shape, used everywhere an error is produced or reported. */
export interface JsonEditorError {
  code: JsonEditorErrorCode
  message: string
}

/* ============================================================================
 * Category 1 — Gates (run before, decide whether to proceed)
 * ========================================================================== */

/**
 * Hard gate: permission. `true` = allowed. May be async (e.g. a server
 * permission check) — the library awaits, and awaiting a sync return is free.
 */
export type FilterFunction<T = JsonData> = (node: NodeData<T>) => boolean | Promise<boolean>

/**
 * Soft gate: a user-initiated action about to start. Flat `NodeData` plus an
 * `event` discriminant. `delete`/`move` are instant — the intercept *is* the
 * click (before the one-shot delete) / the drop.
 */
export type InterceptableEvent<T = JsonData> = NodeData<T> &
  (
    | { event: 'startEdit' }
    | { event: 'startRename' }
    | { event: 'startAdd' }
    | { event: 'delete' }
    | { event: 'move' }
  )

/** `true` (or any non-`void`) = "I'll take it over"; `void`/`false` = proceed. */
export type EventInterceptFunction<T = JsonData> = (
  e: InterceptableEvent<T>
) => boolean | void | Promise<boolean | void>

/* ============================================================================
 * Category 2 — Result producers (run at commit, accept / reject / transform)
 * ========================================================================== */

/** The one canonical update result. */
export type UpdateResult<T = JsonData> =
  | true // proceed
  | void
  | undefined
  | false // reject (generic error)
  | null // silent abort — no commit, no error
  | {
      value?: T // override the committed value
      error?: string | JsonEditorError // reject with message (a bare string is wrapped)
    }

/**
 * `NodeData` carries the CURRENT identity/value; the event-specific field
 * carries the NEW bit; `newData` is always the resulting document. `rename` and
 * `move` are first-class events even though both are delete+add under the hood —
 * they arrive via distinct user interactions and carry distinct deltas.
 */
export type UpdateFunctionProps<T = JsonData> = NodeData<T> & { newData: T } & (
    | { event: 'edit'; newValue: unknown } // value changes (incl. type change)
    // For `add`, `NodeData` describes the new node's *position* (`path`/`key`);
    // `value` is unset until commit.
    | { event: 'add'; newValue: unknown }
    | { event: 'delete' } // `newData` reflects the removal
    | { event: 'rename'; newKey: CollectionKey } // `NodeData.key`/`path` = OLD; use `newKey` + `newData`
    | { event: 'move'; newPath: CollectionKey[] } // `NodeData.path` = source; `newPath` = destination
  )

/** One `onUpdate` — branch on `event`. Fires for user- and command-driven alike. */
export type UpdateFunction<T = JsonData> = (
  props: UpdateFunctionProps<T>
) => UpdateResult<T> | Promise<UpdateResult<T>>

/** Transform (distinct contract — returns the value, not a result). */
export type OnChangeFunction<T = JsonData> = (
  props: NodeData<T> & { newValue: ValueData }
) => ValueData

/* ============================================================================
 * Category 3 — Observers (run after, return ignored)
 * ========================================================================== */

/** After any error condition (Group A codes). */
export type OnErrorFunction<T = JsonData> = (
  props: NodeData<T> & { error: JsonEditorError; errorValue: JsonData }
) => void

/**
 * The complete interaction-lifecycle stream: value-edit, key-rename and add
 * sessions (start/confirm/cancel), plus the instant `delete`/`move` (one event
 * each). `confirmRename` carries `{ oldKey, newKey }`.
 */
export type EditEvent<T = JsonData> = NodeData<T> &
  (
    | { event: 'startEdit' }
    | { event: 'confirmEdit' }
    | { event: 'cancelEdit' }
    | { event: 'startRename' }
    | { event: 'confirmRename'; oldKey: CollectionKey; newKey: CollectionKey }
    | { event: 'cancelRename' }
    | { event: 'startAdd' }
    | { event: 'confirmAdd' }
    | { event: 'cancelAdd' }
    | { event: 'delete' }
    | { event: 'move' }
  )

export type OnEditEventFunction<T = JsonData> = (e: EditEvent<T>) => void

/** On collapse/expand (user click or `editorRef.collapse`). */
export type OnCollapseFunction<T = JsonData> = (
  props: NodeData<T> & { collapsed: boolean; includeChildren: boolean }
) => void

// `OnCopyFunction` (the `onCopy` observer) graduated to `./types` (it's public,
// wired by the clipboard split). The remaining staging types here are unused
// until their phases land.

/* ============================================================================
 * Category 4 — Imperative commands (the `editorRef` handle)
 * ========================================================================== */

/**
 * Strictly binary: did the command run, or was it refused? All descriptive
 * metadata comes from the observer that fires as a result.
 */
export type CommandResult = { success: true } | { success: false; error: JsonEditorError }

// (No `<T>` generic yet — no method references the document type. A later phase
// adds it if/when typed payloads are threaded through the commands.)
export interface JsonEditorHandle {
  // --- Session openers: enter an interactive session (open the input) at a
  //     node; no value supplied. Sync (just opens). The eventual confirm runs
  //     the pipeline. Distinct starts, SHARED confirm/cancel (one session open).
  startEdit(opts: { path: CollectionKey[]; overrideRestrictions?: boolean }): CommandResult
  startRename(opts: { path: CollectionKey[]; overrideRestrictions?: boolean }): CommandResult
  startAdd(opts: { path: CollectionKey[]; overrideRestrictions?: boolean }): CommandResult
  confirm(): Promise<CommandResult> // commit the active session (runs onUpdate)
  cancel(): void // abort the active session

  // --- Direct ("all-in-one") mutators: do the whole mutation with values
  //     provided, no UI session. Run the pipeline → async.
  delete(opts: { path: CollectionKey[]; overrideRestrictions?: boolean }): Promise<CommandResult>
  edit(opts: {
    path: CollectionKey[]
    value: unknown
    overrideRestrictions?: boolean
  }): Promise<CommandResult>
  add(opts: {
    path: CollectionKey[]
    value: unknown
    overrideRestrictions?: boolean
  }): Promise<CommandResult>
  rename(opts: {
    path: CollectionKey[]
    newKey: CollectionKey
    overrideRestrictions?: boolean
  }): Promise<CommandResult>
  move(opts: {
    from: CollectionKey[]
    to: CollectionKey[]
    overrideRestrictions?: boolean
  }): Promise<CommandResult>

  // --- Non-mutating
  collapse(opts: { path: CollectionKey[]; collapsed?: boolean; includeChildren?: boolean }): void
}
