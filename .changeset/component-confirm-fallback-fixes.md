---
'@json-edit-react/components': patch
---

Fix `BigInt` discarding edits on confirm: the keyboard confirm committed `BigInt(nodeData.value)` — the already-committed value — instead of the edited buffer. It now commits the typed value, falling back to the last valid value (with an `'Invalid BigInt'` `onError`) when the input isn't a valid integer string.

Also fix `BigInt`, `DateObject` and `ColorPicker` displaying stale invalid text after an invalid-input fallback: committing the unchanged last-valid value doesn't alter the data, so the edit buffer never resynced. The fallback now resets the buffer explicitly.
