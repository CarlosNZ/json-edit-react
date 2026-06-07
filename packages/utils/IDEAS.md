# @json-edit-react/utils — ideas backlog

A scratchpad of candidate helpers for this package. Nothing here is committed —
it's a place to capture and rank ideas before they earn an issue.

**Fit criteria.** A good `/utils` helper is consumer-side glue that is:

- **pure logic** (hooks, generators, plain functions) — not UI;
- **composed on the public API** — `data`/`setData`, the async `onUpdate` result
  protocol, the `allow*` filter functions, `searchFilter`, `editorRef`,
  `onCollapse`/`onEditEvent`, `NodeData`;
- **zero runtime dependency** by default — any risky parser/validator is lazy and
  isolated behind a sub-path export (the posture already set for the JSON Schema
  generator below). See [CLAUDE.md](CLAUDE.md).

## Planned / in-flight

- **Confirm-before-update hooks** — `useJsonEditorConfirm` + `useConfirmOnUpdate`.
  _Shipped_ (`src/confirm-update/`). ([#307](https://github.com/CarlosNZ/json-edit-react/issues/307))
- **JSON Schema → filter functions** — generate `allow*` functions from a schema
  so the UI can't produce invalid data (preventive). ([#285](https://github.com/CarlosNZ/json-edit-react/issues/285))
- **Search helpers** — ready-made `searchFilter` functions for common patterns.
  ([#319](https://github.com/CarlosNZ/json-edit-react/issues/319))

---

## State & data lifecycle

These reinforce the recommended pattern (consumer owns `data`/`setData`; `onUpdate`
is for side effects, not state ownership), rather than working around it.

### Undo / redo — `useJsonEditorHistory` _(top pick)_
Wraps `data`/`setData` with undo/redo, coalescing rapid keystrokes so a typed word
is a single undo step, with optional Ctrl+Z / Ctrl+Y binding. The demo already
leans on `use-undo`; a tailored, self-contained, zero-dep version removes the most
common "how do I…". Highest impact-to-effort.

### Persistence — `usePersistentJson`
Debounced sync of `data` (and optionally collapse state, via `onCollapse`) to
`localStorage`/`sessionStorage`, with hydrate-on-mount and a version/migrate hook.
Zero-dep, very common.

### Dirty-state / unsaved-changes guard — `useDirtyState`
`useDirtyState(data, baseline)` → `{ isDirty, reset }`, plus an optional
`beforeunload` guard. Pairs naturally with persistence and a Save button. Zero-dep.

### Remote-synced data — `useSyncedData` _(most strategic)_
The natural companion to the confirm hooks: a `load` fetcher hydrates `data`, and
`onUpdate` posts each change with optimistic commit + rollback on failure, mapping
errors to the `{ error }` result protocol. Packages the "validate/post to a server
inside `onUpdate`" flow so the consumer just supplies `load` / `save`. Uses `fetch`
(or a caller-supplied fetcher) — zero-dep.

## Filtering & restriction ergonomics

### Filter-function toolkit
Small combinators for the `allow*` props **and** `searchFilter`: `byKey`,
`byPath` (glob/regex), `byLevel`, `byType`, composed with `and` / `or` / `not`.
Hand-writing `FilterFunction`s over `NodeData` is fiddly;
`allowEdit={byKeyOneOf(['name', 'email'])}` reads far better. Sits between the
schema-derived filters (#285) and the search filters (#319) as the general
hand-rolled kit. Zero-dep.

## Validation (reactive — complements #285's preventive angle)

### Validate-on-commit adapter — `createUpdateValidator`
Wraps a validator into `onUpdate`, turning failures into `{ error }`. Core stays a
plain-predicate zero-dep helper; Zod / AJV / Yup adapters live behind a lazy
sub-path export (same "quarantine the one risky dep" posture as #285). #285 stops
invalid data being *enterable*; this catches it *on commit* — different axes, both
useful.

## Observability & view control

### Change-log / diff — `useChangeLog` + `diffJson`
Records each `onUpdate` (path, old → new, event, timestamp) into an audit trail,
plus a `diffJson(a, b)` helper for "what changed" UIs. Zero-dep.

### Collapse control — `useCollapseControl`
Drives `editorRef` / collapse for expand-all, collapse-all, expand-to-level, and
**auto-expand to search matches**. Pure logic over the imperative handle +
`searchText`. Zero-dep.

---

## Rough priority

1. Undo / redo
2. Persistence
3. Filter-function toolkit

…then `useSyncedData` (closes the loop with the confirm hooks), validate-on-commit,
and dirty-state.

## Deliberately out of scope

- Anything duplicating core (clipboard, keyboard handling).
- i18n locale bundles — that's content, and belongs nearer core's `localisation`.
