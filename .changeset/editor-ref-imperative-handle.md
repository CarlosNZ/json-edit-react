---
'json-edit-react': major
---

Replace the `externalTriggers` prop with an imperative `editorRef` handle (#251).

The `externalTriggers` state-as-RPC prop is removed, along with the `ExternalTriggers` and `EditState` types. Imperative control now goes through a typed ref handle attached via a new `editorRef` prop:

```ts
const editorRef = useRef<JsonEditorHandle>(null)
// ...
<JsonEditor data={data} setData={setData} editorRef={editorRef} />

editorRef.current.collapse({ path, collapsed, includeChildren })
editorRef.current.startEdit(path)   // overrides restrictEdit; auto-reveals collapsed targets
editorRef.current.cancelEdit()
editorRef.current.confirmEdit()
```

`editorRef` is a plain ref-valued prop (not the `ref` attribute), so `JsonEditor<T>` stays generic with full type inference. `startEdit` supersedes the `restrictEdit` filter by design and auto-reveals a target collapsed below the current view. `JsonViewer` accepts `editorRef` too, but its `JsonViewerHandle` is collapse-only. Adds the `JsonEditorHandle` and `JsonViewerHandle` types to the public API.
