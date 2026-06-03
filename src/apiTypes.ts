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

// All Category 3 observers (`OnErrorFunction`, `EditEvent` / `OnEditEventFunction`,
// `OnCollapseFunction`) graduated to `./types` (wired in by §17 Phase 3), as did
// `OnCopyFunction` (the clipboard split). The remaining staging types below are
// unused until their phases land.

/* ============================================================================
 * Category 4 — Imperative commands (the `editorRef` handle)
 * ========================================================================== */

// `CommandResult` and `JsonEditorHandle` graduated to `./types` (wired in by §17
// Phase 4). The handle is UI-interactions only — session openers (`startEdit` /
// `startRename` / `startAdd`), shared `confirm`/`cancel`, and `collapse`. The
// direct mutators sketched here in earlier drafts (`delete`/`edit`/`add`/
// `rename`/`move`) were DROPPED: a consumer owns `data`/`setData`, so mutating
// data is already `setData(newData)` — a command for it is a redundant path.
