---
'json-edit-react': minor
---

Add dedicated `ERROR_RENAME` / `ERROR_MOVE` localisation keys and `RENAME_ERROR` / `MOVE_ERROR` error codes for rejected rename/move operations (#308).

A rejected rename/move (`onUpdate` returning `false`) now surfaces an operation-specific message ("Rename unsuccessful" / "Move unsuccessful") and a matching `onError` code (`RENAME_ERROR` / `MOVE_ERROR`), giving these first-class events full parity with `add`/`delete`. Previously both reused the generic `ERROR_UPDATE` message and `UPDATE_ERROR` code. The two new codes are additive members of the public `JerErrorCode` union.
