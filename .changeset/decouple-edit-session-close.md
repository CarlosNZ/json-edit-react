---
'json-edit-react': minor
---

Keep the editor open while a deferred `onUpdate` is pending, so the node never briefly renders a misleading state during the commit window (issue #325).

The edit-session close is now decoupled from the data-commit/cleanup phase. While `onUpdate` is awaiting (a confirm-before-update modal, or a slow remote round-trip), the originating node stays in `isEditing`, the value/JSON buffer the user typed remains visible, and the session closes only when the promise resolves — commit fires `confirmEdit` and closes; reject fires `cancelEdit`, reverts, and closes. Tab-commit semantics are preserved (no stale `cancelOp` revert, no double-fired terminal events, no wrong-session close).
