---
'json-edit-react': minor
---

Opening an edit on another node now **commits** the in-progress edit instead of cancelling it, matching Tab.

Previously, clicking another node's edit control (its pencil, double-clicking another value, or clicking another key to rename) while an edit was open silently discarded the in-progress buffer and fired `cancelEdit`/`cancelRename`. Tab already committed-then-moved, so the two "leave this field and go edit elsewhere" gestures behaved oppositely. Now a displace behaves like Tab: a changed edit commits (and `onUpdate` runs), an unchanged one closes via `commit*` with no `onUpdate`/`setData`, and an edit that can't commit (malformed JSON in a collection edit, a duplicate key in a rename, or a custom component's `fromStandardType` throwing) **blocks** the switch — the editor stays open with its inline error, and Esc / ✗ remain the explicit discard path.

The one exception is the object **add** session (typing a new key): a displace still cancels it, since you can't Tab out of a new-key edit either.

This changes the `onEditEvent` stream for a displaced session from `cancel*` to `submit*`/`commit*` (or nothing extra, for a blocked switch). See the [migration guide](https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md).
