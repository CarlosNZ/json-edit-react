---
'@json-edit-react/utils': minor
---

Add confirm-before-update hooks — the first helpers in `@json-edit-react/utils`.

- **`useJsonEditorConfirm`** (primitive) — bridges an imperative `confirm()` to a render-driven modal via a deferred promise. Returns `confirm` (resolves `Promise<boolean>`) and a `dialog` state object to drive your own modal.
- **`useConfirmOnUpdate`** (declarative wrapper) — for the common "ask before these events" case. Declare `confirmOn` (event-name array or predicate), optional `title`/`message` (static or per-input), and an optional inner `onUpdate`; get back a ready-made `onUpdate` plus the same `dialog`. Also exposes `pending` (`{ path, event } | null`) — the node whose update is in flight.
- **Pending-node overlay** (opt-in) — pass your own `pendingComponent` and `useConfirmOnUpdate` returns a ready `pendingNodeDefinition` to merge into `customNodeDefinitions` (or build it directly with `createPendingCommitDefinition`). Mainly useful when confirming _edits_; a _delete_-confirm doesn't need it.

The package ships **no UI** — you bring your own modal (driven by `dialog`) and, if you want it, your own pending-node component. Both hooks build on core's async `onUpdate` contract (it `await`s the result and treats `null` as a silent cancel). No third-party runtime dependencies.
