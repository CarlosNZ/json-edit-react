---
'@json-edit-react/components': minor
---

Move the editor-slot widgets (`ReactSelect`, `CodeEditor`) to their own subpath, `@json-edit-react/components/widgets`. They're a different kind of thing from the rest of the package — they satisfy JsonEditor's `Select` / `TextEditor` prop contracts to replace a built-in UI control, rather than ship a `CustomNodeDefinition` for `customNodeDefinitions` — so they're kept off the package root, leaving it uniformly node-definition components.

Import them from the subpath: `import { ReactSelect, CodeEditor } from '@json-edit-react/components/widgets'`. Everything else continues to import from the package root.
