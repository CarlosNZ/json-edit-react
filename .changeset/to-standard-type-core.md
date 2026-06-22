---
'json-edit-react': minor
---

Add a `toStandardType` field to `CustomNodeDefinition`: an optional function that converts a custom node's value to a primitive seed when the Type selector switches the node to a standard type. Core's generic coercion handles the rest per target type, and applies unchanged when the definition provides no hook (so e.g. an object-valued custom node without one still seeds `'[object Object]'` on a switch to `string`).
