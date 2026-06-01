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
editorRef.current.startEdit({ path })                             // respects restrictEdit
editorRef.current.startEdit({ path, overrideRestrictions: true }) // bypasses it
editorRef.current.cancelEdit()
editorRef.current.confirmEdit()
```

`editorRef` is a plain ref-valued prop (not the `ref` attribute), so `JsonEditor<T>` stays generic with full type inference. `startEdit` takes an options object and respects the target node's `restrictEdit` filter by default (evaluated at call time), returning `false` when blocked; pass `overrideRestrictions: true` to bypass it. It also auto-reveals a target collapsed below the current view. `JsonViewer` accepts `editorRef` too, but its `JsonViewerHandle` is collapse-only. Adds the `JsonEditorHandle`, `JsonViewerHandle`, and `StartEditOptions` types to the public API, and exports the `splitPropertyString` path-parsing helper (companion to `toPathString`) for building handle paths.
