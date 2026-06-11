---
'@json-edit-react/components': minor
---

BigInt, Symbol, Date Picker, Date Object, Color Picker and Enhanced Link definitions set `editOnTypeSwitch`, so switching a node to one of these types opens it for editing immediately (single commit on confirm, Esc cancels) instead of instantly committing the placeholder `defaultValue`.
