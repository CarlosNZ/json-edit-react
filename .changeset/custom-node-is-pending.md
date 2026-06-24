---
'json-edit-react': minor
---

Expose an `isPending` prop on custom node components (`CustomComponentProps` / `CustomWrapperProps`). It's `true` while a node's optimistic edit is settling — the value is already applied locally but the consumer's async `onUpdate` hasn't resolved yet — and `false` otherwise (including when there's no `onUpdate`, where the commit settles synchronously). Use it to show a saving/pending state, e.g. a spinner or overlay, for the duration of an async update. See the new "Pending overlay" example in the demo.
