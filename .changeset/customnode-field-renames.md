---
'json-edit-react': major
'@json-edit-react/components': major
---

Renamed the `CustomNodeDefinition` fields and props type for consistency, around one distinction: a **node** is a position in the data tree; a **component** is the React function that renders it.

- **Render slots** (they hold React components, not "elements"): `element` → `component`, `customKey` → `keyComponent`, `wrapperElement` → `wrapperComponent`.
- **Config**: `customNodeProps` → `componentProps` (the bag passed to `component` + `keyComponent`).
- **Visibility flags** (now all positive `show*`): `hideKey` → `showKey` (**polarity inverted** — `showKey` defaults to `true`), `showInTypesSelector` → `showInTypeSelector`.
- **Types**: `CustomNodeProps` → `CustomComponentProps` (the props your component receives; also resolves the long-standing `CustomNodeProps` / `CustomNodeDefinition` name clash). The new `CustomWrapperProps` types `wrapperComponent`, which now receives its config as `wrapperProps` (previously delivered as `customNodeProps`). `CustomNodeDefinition` and `CustomKeyProps` keep their names.
- **Error reporter removed**: custom components no longer receive an error-reporter prop (v1's positional `onError`). To reject invalid input, `throw` from the definition's `fromStandardType` — the editor rejects the commit, keeps the editor open, shows the message inline, and fires the consumer's `onError`. This removes the name clash with the editor-level `onError` *observer*.
- **Key component**: `CustomKeyProps.setIsEditingKey` → `startEditingKey` — a zero-arg "enter key-edit mode" command, renamed off the `setIs*` prefix that wrongly implied a React `Dispatch` setter.
- **Keyboard handler**: `CustomComponentProps.handleKeyPress` → `onKeyDown` — "keyPress" is React's deprecated event name; `onKeyDown` matches `TextEditorProps.onKeyDown` (and the public `AutogrowTextArea`'s handler prop).

All 12 components in `@json-edit-react/components` use the new field names. Consumers overriding a shipped definition's `customNodeProps` must rename to `componentProps`, and custom-component bodies must rename the props type (`CustomNodeProps` → `CustomComponentProps`), the config prop they destructure (`customNodeProps` → `componentProps`), move any error-reporting call (v1's `onError`) into a `throw`ing `fromStandardType`, rename a key component's `setIsEditingKey` call to `startEditingKey`, and rename the key-down handler `handleKeyPress` → `onKeyDown`.

See the [migration guide](../migration-guide.md#13-customnodedefinition-field-renames) for the full mapping and before/after examples.
