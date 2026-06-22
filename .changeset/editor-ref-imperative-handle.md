---
'json-edit-react': major
---

Replace the `externalTriggers` prop with an imperative `editorRef` handle (#251).

The `externalTriggers` state-as-RPC prop is removed, along with the `ExternalTriggers` and `EditState` types. Imperative control now goes through a typed ref handle attached via a new `editorRef` prop. The handle is **UI-interactions only** — it opens/commits/cancels a value-edit session or collapses nodes; it has no data mutators (you own `data`/`setData`, so mutating data is just `setData(newData)`):

```ts
const editorRef = useRef<JsonEditorHandle>(null)
// ...
<JsonEditor data={data} setData={setData} editorRef={editorRef} />

editorRef.current.collapse({ path, collapsed, includeChildren })
editorRef.current.startEdit({ path })                             // open the value editor
editorRef.current.startEdit({ path, overrideRestrictions: true }) // bypass restrictEdit
editorRef.current.confirm()                                       // commit the open session
editorRef.current.cancel()                                        // discard it
```

`editorRef` is a plain ref-valued prop (not the `ref` attribute), so `JsonEditor<T>` stays generic with full type inference. `startEdit` is synchronous and returns a `StartEditResult` — `true` if it opened the session, else `'PATH_NOT_FOUND'` (the path is gone) or `'RESTRICTED'` (`restrictEdit` blocks it). It respects `restrictEdit` by default (evaluated at call time); pass `overrideRestrictions: true` to bypass it (skips only the filter — your `onUpdate` still runs at `confirm()`). `confirm()` commits the open session through `onUpdate` (the same path as clicking the editor's confirm button); `cancel()` discards it. `startEdit` auto-reveals a target collapsed below the current view. `JsonViewer` accepts `editorRef` too, but its `JsonViewerHandle` is collapse-only. Adds the `JsonEditorHandle`, `JsonViewerHandle`, `StartEditOptions`, and `StartEditResult` types to the public API, and exports the `splitPropertyString` path-parsing helper (companion to `toPathString`) for building handle paths.

Imperative session openers for **key-rename** and **add** (`startRename` / `startAdd`) and an awaitable `confirm()` returning a `CommandResult` were prototyped during the §17 API work but deferred to a later 2.x release (they were the largest removable slice of the §17 bundle growth); the rename/add session *events* still fire via `onEditEvent` for UI-driven sessions.
