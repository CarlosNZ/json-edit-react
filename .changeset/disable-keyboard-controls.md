---
'json-edit-react': minor
---

Allow any `keyboardControls` binding to be disabled by setting it to `null`. A disabled binding is no longer intercepted and falls through to its native browser behaviour — e.g. `{ tabForward: null, tabBack: null }` restores normal Tab/Shift-Tab focus traversal instead of moving between editable nodes.
