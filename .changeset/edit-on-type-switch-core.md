---
'json-edit-react': minor
---

Add an `editOnTypeSwitch` field to `CustomNodeDefinition` (default `false`; requires `component` + `showOnEdit`): switching to the custom type in the Type selector becomes a local, deferred switch instead of an instant commit — the edit buffer is seeded from the node's current value (via `fromStandardType`, falling back to `defaultValue`), the target definition's component renders in edit state, a single commit happens on confirm, and Esc cancels the whole switch. The new collection mounts expanded when the committed value is an object/array, matching the instant-commit path.
