---
'@json-edit-react/components': minor
---

The Symbol, BigInt, Enhanced Link, and Date Object definitions provide `toStandardValue`, so switching one of these nodes to a standard type via the Type selector seeds the editor sensibly: Symbol → its description, BigInt → its digit string, Enhanced Link → its url (instead of `'[object Object]'`), Date Object → its ISO string.
