---
'json-edit-react': major
---

Split the `onUpdate` override return into node-level `{ value }` and whole-document `{ data }`.

Returning `{ value: X }` now replaces the **edited node's** value (applied at its path), not the whole document — the common case of tidying what the user just entered (lower-case, round, trim, sort *this* array). It is honoured for `edit` and `add`; for `rename` / `move` / `delete` it has no target value and is ignored. To replace the **whole document** (stamp a top-level field, sort siblings, canonicalise the structure), return the new key `{ data: X }`, which works on every event.

**Breaking.** Previously `{ value: X }` replaced the whole document. Any `onUpdate` relying on that — including whole-document timestamp/sort transforms — must switch to `{ data: X }`. Returning both keys is a mistake: `{ data }` wins, `{ value }` is ignored, and a console warning is emitted. See the [migration guide](https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md) (§9).
