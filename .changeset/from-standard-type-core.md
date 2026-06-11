---
'json-edit-react': minor
---

Add a `fromStandardType` field to `CustomNodeDefinition`: when an `editOnTypeSwitch` switch opens a custom type for editing, the optional hook converts the node's current value into the seed for the editor instead of starting from `defaultValue` — e.g. switching a string to a Symbol seeds the description with the string rather than discarding it. It receives whatever the edit buffer holds at switch time; `defaultValue` remains the seed when the hook is absent.
