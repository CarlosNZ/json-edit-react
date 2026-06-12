---
'json-edit-react': major
'@json-edit-react/components': major
---

Renamed the `CustomNodeDefinition` fields and props type for consistency, around one distinction: a **node** is a position in the data tree; a **component** is the React function that renders it.

- **Render slots** (they hold React components, not "elements"): `element` → `component`, `customKey` → `keyComponent`, `wrapperElement` → `wrapperComponent`.
- **Config**: `customNodeProps` → `componentProps` (the bag passed to `component` + `keyComponent`).
- **Visibility flags** (now all positive `show*`): `hideKey` → `showKey` (**polarity inverted** — `showKey` defaults to `true`), `showInTypesSelector` → `showInTypeSelector`.
- **Types**: `CustomNodeProps` → `CustomComponentProps` (the props your component receives; also resolves the long-standing `CustomNodeProps` / `CustomNodeDefinition` name clash). The new `CustomWrapperProps` types `wrapperComponent`, which now receives its config as `wrapperProps` (previously delivered as `customNodeProps`). `CustomNodeDefinition` and `CustomKeyProps` keep their names.

All 12 components in `@json-edit-react/components` use the new field names. Consumers overriding a shipped definition's `customNodeProps` must rename to `componentProps`, and custom-component bodies must rename the props type (`CustomNodeProps` → `CustomComponentProps`) and the config prop they destructure (`customNodeProps` → `componentProps`).

See the [migration guide](../migration-guide.md#13-customnodedefinition-field-renames) for the full mapping and before/after examples.
