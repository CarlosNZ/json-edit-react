---
'json-edit-react': major
---

`JsonEditor` is now strictly controlled. `setData` is required, the controlled/uncontrolled dual mode is gone, and the `viewOnly` shorthand is removed. A new sibling export `JsonViewer` is the canonical read-only entry point.

- `<JsonEditor>` requires `setData` — forgetting it is now a TypeScript error rather than a silent "edits don't propagate" footgun.
- `<JsonViewer>` (new) wraps `JsonEditor` with all edit affordances locked off. Accepts the same display, theming, keyboard, search, collapse, custom-node, and localisation props but omits `setData`, the update callbacks, the edit-permission props, and `externalTriggers`.
- `viewOnly` prop is removed. For static read-only displays, use `<JsonViewer>`. For dynamic permissions-style toggling on the same mounted component, use `allowEdit={cond}` + `allowAdd={cond}` + `allowDelete={cond}` (and `allowDrag={cond}` if you'd previously enabled drag-and-drop; otherwise the default is already `false`/off).
- The internal `useData` hook is deleted — `JsonEditor` now reads `data` and `setData` from props directly.

See the [migration guide](../migration-guide.md#6-setdata-is-required-viewonly-removed-jsonviewer-added) for migration recipes.
