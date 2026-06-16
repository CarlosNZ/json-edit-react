---
'json-edit-react': patch
---

Fix two editing bugs.

Replacing the whole `data` (e.g. switching data set) while a node was being edited left the editor unable to start any new edit. The displaced node's `cancelEdit` was rebuilt from the live document, but its path no longer existed there, so the rebuild threw and stranded the editing session. The editing event now tolerates a vanished path, and a node that owns the active edit session now closes it when it unmounts.

Typing a character that the consumer's `onChange` rejects or rewrites (e.g. stripping a disallowed character) while the caret was mid-string jumped the caret to the end after the first keystroke. The caret now stays where you were typing.
