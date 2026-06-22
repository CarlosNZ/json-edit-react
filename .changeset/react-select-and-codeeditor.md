---
'@json-edit-react/components': minor
---

Add two new components that plug into `JsonEditor`'s editor-slot props (not `customNodeDefinitions`):

- `ReactSelect` — a `react-select` wrapper that satisfies the `SelectProps` contract. Pass to `JsonEditor`'s `Select` prop to replace the built-in native `<select>` used for type changes, enum value picking, and the new-key dropdown.
- `CodeEditor` — a CodeMirror-based JSON editor that satisfies `TextEditorProps`. Pass to `JsonEditor`'s `TextEditor` prop to upgrade the raw-JSON text editor. Accepts an optional `theme` prop matching the built-in theme display names.

Both follow the package's existing `React.lazy` pattern, so the third-party libraries (`react-select`, `@uiw/react-codemirror`, CodeMirror themes) only load at the moment the component is first rendered.
