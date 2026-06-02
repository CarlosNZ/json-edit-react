/**
 * §17 API standardisation — Phase 0 compile-check.
 *
 * The canonical types in `src/apiTypes.ts` land unused, so nothing in the
 * `files: ["src/index.ts"]` graph type-checks them. This file is their typecheck
 * path: ts-jest runs full diagnostics on every `.test.ts`, so the sample typed
 * values below — especially the exhaustive `switch (props.event)` — fail
 * compilation (turning `pnpm test` red) if any union stops discriminating or a
 * field shape drifts from the spec.
 *
 * It is NOT a behavioural test — the flows themselves arrive with each later
 * phase's implementation.
 */

import type {
  JsonEditorError,
  JsonEditorErrorCode,
  FilterFunction,
  UpdateFunction,
  OnChangeFunction,
  OnErrorFunction,
  OnEditEventFunction,
  OnCollapseFunction,
  CommandResult,
  JsonEditorHandle,
} from '../src/apiTypes'
// `EventInterceptFunction` / `OnCopyFunction` graduated to the public surface in
// Phase 1 — they now live in `../src/types`.
import type { JsonData, EventInterceptFunction, OnCopyFunction } from '../src/types'

// --- Cat 1: async-capable gates -------------------------------------------

const allow: FilterFunction = (node) => node.path.length > 0
const allowAsync: FilterFunction = async (node) => node.level > 0

const intercept: EventInterceptFunction = (e) => {
  // The `event` discriminant narrows; `delete`/`move` are instant.
  switch (e.event) {
    case 'startEdit':
    case 'startRename':
    case 'startAdd':
      return // proceed
    case 'delete':
    case 'move':
      return true // take over
  }
}

// --- Cat 2: result producer — exhaustive event narrowing ------------------

const onUpdate: UpdateFunction = (props) => {
  // Each branch must expose exactly its event-specific delta field.
  switch (props.event) {
    case 'edit':
      return { value: props.newValue as JsonData }
    case 'add':
      return props.newValue === undefined ? { cancel: true } : true
    case 'delete':
      return // proceed (no extra field on this branch)
    case 'rename':
      // bare-string error shorthand lives inside the object, not at top level
      return props.newKey === '' ? { error: 'Empty key' } : { value: props.newData }
    case 'move':
      return props.newPath.length === 0 ? false : undefined
  }
}

const onChange: OnChangeFunction = (props) => props.newValue

// --- Cat 3: observers ------------------------------------------------------

const onError: OnErrorFunction = (props) => {
  void props.error.code
  void props.errorValue
}

const onEditEvent: OnEditEventFunction = (e) => {
  // `confirmRename` is the only variant carrying old/new keys.
  if (e.event === 'confirmRename') void `${String(e.oldKey)}→${String(e.newKey)}`
}

const onCollapse: OnCollapseFunction = (props) => void (props.collapsed && props.includeChildren)

const onCopy: OnCopyFunction = (props) => void (props.success && props.type)

// --- Shared: error shape ---------------------------------------------------

const code: JsonEditorErrorCode = 'PATH_NOT_FOUND'
const error: JsonEditorError = { code, message: 'gone' }

// --- Cat 4: imperative handle + binary result discrimination --------------

const describeResult = (r: CommandResult): string =>
  r.success ? 'ok' : r.error.message // `error` only exists on the failure branch

const handle: JsonEditorHandle = {
  startEdit: () => ({ success: true }),
  startRename: () => ({ success: true }),
  startAdd: () => ({ success: false, error }),
  confirm: async () => ({ success: true }),
  cancel: () => undefined,
  delete: async () => ({ success: true }),
  edit: async () => ({ success: true }),
  add: async () => ({ success: true }),
  rename: async () => ({ success: true }),
  move: async () => ({ success: true }),
  collapse: () => undefined,
}

test('§17 API types compile', () => {
  // Reference the samples so the file is a real module, not dead code.
  expect([
    allow,
    allowAsync,
    intercept,
    onUpdate,
    onChange,
    onError,
    onEditEvent,
    onCollapse,
    onCopy,
    handle,
    describeResult,
  ]).toHaveLength(11)
})
