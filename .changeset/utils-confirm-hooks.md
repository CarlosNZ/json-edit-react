---
'@json-edit-react/utils': minor
---

Add confirm-before-update hooks — the first helpers in `@json-edit-react/utils`.

- **`useJsonEditorConfirm`** (primitive) — bridges an imperative `confirm()` to a render-driven modal via a deferred promise. Returns `confirm` (resolves `Promise<boolean>`) and a `dialog` state object to drive your own modal.
- **`useConfirmOnUpdate`** (declarative wrapper) — for the common "ask before these events" case. Declare `confirmOn` (event-name array or predicate), optional `title`/`message` (static or per-input), and an optional inner `onUpdate`; get back a ready-made `onUpdate` plus the same `dialog`.

Both build on core's async `onUpdate` contract (it `await`s the result and treats `null` as a silent cancel), so no modal UI ships with the library — you bring your own and wire it to `dialog`. Zero runtime dependencies; types-only import from `json-edit-react`.
