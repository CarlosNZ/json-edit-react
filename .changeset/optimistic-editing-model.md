---
'json-edit-react': major
---

Reworked the editing/commit lifecycle to be **optimistic by default**, with an optional synchronous **gate**, and renamed/extended the `onEditEvent` stream.

**Optimistic commits.** When the user submits an edit, the editor now closes and the data updates immediately; the consumer's `onUpdate` runs in the background, and a rejection (`false` / `{ error }` / a thrown error / a rejected promise) automatically reverts the change and surfaces the error. A slow `onUpdate` (e.g. a remote save) no longer blocks the editor. Each in-flight commit is tracked with its own token, so a late failure reverts only its own node and can't clobber a newer edit.

**Gating via `hold()`.** `onUpdate` receives a second argument, `{ hold }`. Calling `hold()` (synchronously, before the first `await`) keeps the editor open and blocks the rest of the tree until the returned `release()` is called — the path for confirmation dialogs or pre-commit validation. Without it, commits stay optimistic.

**`onEditEvent` lifecycle.** The committed-phase events are renamed `confirm*` → `commit*` (`commitEdit` / `commitRename` / `commitAdd`); a new `submit*` event fires when the user commits (the window a `hold()` gate runs in); and `updateSuccessful` / `updateError` report the background settlement of any committed change whose `onUpdate` ran. A session is now `start* → [submit*] → commit*`, or `start* → cancel*`. A no-op confirm reports `commitEdit` (not `cancelEdit`).

See the [migration guide](https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md) (§9, §10) for details.
