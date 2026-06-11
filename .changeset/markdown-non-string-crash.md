---
'@json-edit-react/components': patch
---

The Markdown component no longer crashes the editor when its node's value isn't a string. react-markdown throws on non-string children, and a value-type-agnostic condition (e.g. matching by key) could feed it one — switching a matched node's type to number and committing took down the whole tree. Non-string values now render via their string representation.
