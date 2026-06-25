---
'json-edit-react': minor
---

A **collection** custom `component` with `showOnEdit: true` now receives the live child rows as its `children` while editing — the same as in view — instead of the built-in raw-JSON `<textarea>` editor. This lets such a node compose an editable header/toolbar above rows that stay visible and interactive throughout the edit; it owns its commit affordance (`setIsEditing` / `handleEdit` / `handleCancel`) and edits the collection through `setValue`. To edit the whole subtree as raw JSON inside a custom component, render your own editor and commit a parsed value via `setValue` (the public `AutogrowTextArea` is exported for the built-in textarea's look). Collection components with `showOnEdit` falsy are unaffected and still fall through to the built-in JSON editor.
