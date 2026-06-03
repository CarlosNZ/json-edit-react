# Migration Guide: v1 → v2

This guide collects the breaking changes between `json-edit-react` v1 and v2, with concrete before/after snippets for each. It will grow as more v2 work lands — new entries get appended here rather than into the README so that the README always describes the current state.

> **v2 status:** in development on the `v2.0-dev` branch. Not yet released to npm. This guide tracks the changes in flight; references to "v2" describe what consumers will see when v2.0.0 ships.

## Quick overview

If you only have a few minutes, these are the changes most likely to affect existing code:

| What changed | Migration |
|---|---|
| Pre-built themes split into a separate package | `npm i @json-edit-react/themes` and update theme imports |
| `LinkCustomComponent` / `LinkCustomNodeDefinition` moved | `npm i @json-edit-react/components` and update those imports |
| Several internal helpers are now part of the public API | No action needed — purely additive |
| `JsonEditor` is now generic on the data type (`JsonEditor<T>`) | No action needed — defaults to `JsonData`, source-compatible. Opt in by writing `<JsonEditor<MyShape> ... />` |
| `setData` is now required; `viewOnly` removed; new `JsonViewer` export | Switch read-only usage to `<JsonViewer>`; replace `viewOnly={cond}` with the relevant `restrict*` toggles, including `restrictDrag` if drag was enabled — see §6 |
| `externalTriggers` prop replaced by the `editorRef` imperative handle | Use a `useRef<JsonEditorHandle>` and call `editorRef.current.collapse/startEdit/startRename/startAdd/confirm/cancel` — see §7 |
| `enableClipboard` split into `allowClipboard` (boolean) + `onCopy` (callback); `CopyFunction` → `OnCopyFunction` | Rename the boolean to `allowClipboard`; move any copy callback to `onCopy` (`errorMessage` → `error.message`) — see §8 |
| `onEdit` / `onAdd` / `onDelete` merged into one `onUpdate`; return shape unified | Use a single `onUpdate` and `switch (props.event)`; replace tuple / bare-string returns with `{ value }` / `{ error }` (and `null` to silently cancel) — see §9 |
| Callback payloads are now flat `NodeData` (`currentData`→`fullData`, `currentValue`→`value`, `name`→`key`); `JerError` → `JsonEditorError` | Update field names in `onUpdate` / `onChange` / `onError`; rename the error type — see §9, §10 |
| `onEditEvent` is now a lifecycle stream `(e) => …` (was `(path, isKey) => …`); `onError` / `onCollapse` use flat `NodeData`; `onCopy.error` is a `JsonEditorError` | `switch (e.event)` over start/confirm/cancel + delete/move; update the flat payload fields — see §10 |

---

## 1. Pre-built themes moved to `@json-edit-react/themes`

The six pre-built themes (`githubDarkTheme`, `githubLightTheme`, `monoDarkTheme`, `monoLightTheme`, `candyWrapperTheme`, `psychedelicTheme`) are no longer re-exported from `json-edit-react`. They live in a new companion package, [`@json-edit-react/themes`](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/themes), which is published and versioned independently.

**Why:** keeps the core bundle minimal (themes are static data with no behaviour) and lets new themes ship without forcing a core release.

### Migration

Install the themes package:

```sh
npm i @json-edit-react/themes
```

Update imports:

```diff
- import { JsonEditor, githubDarkTheme } from 'json-edit-react'
+ import { JsonEditor } from 'json-edit-react'
+ import { githubDarkTheme } from '@json-edit-react/themes'
```

Usage in JSX is unchanged:

```jsx
<JsonEditor data={data} setData={setData} theme={githubDarkTheme} />
```

The `Theme` and `ThemeInput` *types* still come from `json-edit-react` itself — they're part of the editor's prop surface, not the themes package.

### Affected exports

All of these moved from `json-edit-react` to `@json-edit-react/themes`:

- `githubDarkTheme`
- `githubLightTheme`
- `monoDarkTheme`
- `monoLightTheme`
- `candyWrapperTheme`
- `psychedelicTheme`

`defaultTheme` stays in `json-edit-react` — it's the implicit baseline used when no `theme` prop is supplied.

---

## 2. Custom components moved to `@json-edit-react/components`

The built-in `LinkCustomComponent` + `LinkCustomNodeDefinition` are no longer exported from `json-edit-react`. They — along with **11 other pre-built custom node components** — live in a new companion package, [`@json-edit-react/components`](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components).

**Why:** the new package can ship richer components (date pickers, color pickers, markdown rendering, etc.) without dragging their third-party dependencies into core. Core keeps its zero-runtime-deps promise; consumers who want the extras opt in.

### Migration

Install the components package:

```sh
npm i @json-edit-react/components
```

Update imports:

```diff
- import { JsonEditor, LinkCustomNodeDefinition } from 'json-edit-react'
+ import { JsonEditor } from 'json-edit-react'
+ import { LinkCustomNodeDefinition } from '@json-edit-react/components'
```

Usage is unchanged:

```jsx
<JsonEditor
  data={data}
  setData={setData}
  customNodeDefinitions={[LinkCustomNodeDefinition]}
/>
```

### What you also get

`@json-edit-react/components` ships 12 components in total — the original `LinkCustomComponent` plus 11 more that previously only existed as a demo in this repo's `custom-component-library/`:

| Component | Use case |
|---|---|
| `LinkCustomComponent` | URL strings → clickable links (functionally a superset of the v1 version, with configurable `customNodeProps`) |
| `EnhancedLinkCustomComponent` | Object-shaped data `{ text, url }` → clickable string |
| `DateTimePicker` | ISO date strings, edited via `react-datepicker` |
| `DateObject` | JavaScript `Date` objects |
| `ColorPicker` | Hex/RGB/HSL color strings, edited via `react-colorful` |
| `Markdown` | Markdown-formatted strings, rendered via `react-markdown` |
| `Image` | Image URLs displayed inline |
| `BooleanToggle` | Booleans rendered as a toggle switch |
| `BigInt`, `NaN`, `Symbol`, `Undefined` | Non-JSON-native value displays |

Each component ships with a matching `*CustomNodeDefinition` ready to drop into the `customNodeDefinitions` prop.

### Bundle impact

The package is ESM with `"sideEffects": false`, so modern bundlers (Webpack 4+, Vite, Rollup, esbuild, Parcel 2+) drop unused components and their dependencies from the final bundle. Heavy components (`DateTimePicker`, `Markdown`, `ColorPicker`) additionally use `React.lazy` for their third-party libraries — even when you do import them, those libraries only load at the moment the component is first rendered.

---

## 3. `JsonEditor` is now generic on the data type

`JsonEditor` and its callback types now accept an optional type parameter `T`, so TypeScript consumers can preserve their data shape through the component boundary instead of falling back to `unknown`.

**Why:** prior to v2, the `data` prop was typed `JsonData` which collapses to `unknown` — so `setData`, `onUpdate`, `onChange`, `onError`, and `NodeData.fullData` all dropped the consumer's static type. Typed apps had to cast at the boundary (e.g. `setData as (data: JsonData) => void`). The generic removes that friction.

### Migration

The default is `T = JsonData`, so **existing code keeps working unchanged**. To opt in, pass your data type as a type argument:

```diff
+ interface User { name: string; email: string }

- <JsonEditor data={user} setData={setUser} />
+ <JsonEditor<User> data={user} setData={setUser} />
```

Callbacks then receive your shape:

```ts
<JsonEditor<User>
  data={user}
  setData={setUser}
  onUpdate={({ newData, currentData }) => {
    // newData and currentData are typed as User
  }}
/>
```

The generic flows to root-level slots only: `data`, `setData`, the `newData` / `currentData` fields on `UpdateFunctionProps`, `currentData` on `OnChangeFunction` / `OnErrorFunction`, and `fullData` on `NodeData` (used by `FilterFunction`, `SearchFilterFunction`, etc.). Per-node `value` and `parentData` slots stay `unknown` — they are arbitrary-depth slices that no static type can describe.

> [!NOTE]
> Same mental model as `useState<T>`: `T` describes the data you provided, not a runtime invariant. If structural edits are unrestricted, post-edit values may not conform to `T` — pair with `restrictAdd` / `restrictDelete` / `restrictTypeSelection`, or validate in `onUpdate`, if you depend on the shape.

`CustomNodeDefinition` is intentionally **not** generic on the data type — its two existing generics (for `customNodeProps` and wrapper props) are unchanged, and custom-node `condition` / `element` continue to receive `NodeData<JsonData>`.

---

## 4. New public export in core: `AutogrowTextArea`

`AutogrowTextArea` — the auto-resizing textarea primitive that powers `StringEdit` and the built-in string editor — is now exported from `json-edit-react`. This is purely additive; nothing about your existing code changes.

```js
import { AutogrowTextArea } from 'json-edit-react'
```

It joins the existing rendering primitives — `StringDisplay`, `StringEdit`, `toPathString` — that make it possible to compose custom components on top of the editor's built-in string handling. The new `@json-edit-react/components` package leans on these primitives internally; they're equally available to consumers writing their own components.

---

## 5. `toPathString` encoding changed

`toPathString` now joins keys with `/` (URL-encoded) instead of `.`, so the encoding is unambiguous even when keys themselves contain `.` or `/`.

```js
// Before (v1)
toPathString(['data', 0, 'name'])          // 'data.0.name'
toPathString(['foo.bar', 'baz'])           // 'foo.bar.baz' — collides with ['foo','bar','baz']

// After (v2)
toPathString(['data', 0, 'name'])          // 'data/0/name'
toPathString(['foo.bar', 'baz'])           // 'foo.bar/baz' — now distinguishable
toPathString(['has/slash', 'x'])           // 'has%2Fslash/x'
```

The second `key?: 'key_'` parameter has been removed — it was an internal encoding trick that's no longer needed.

If you used `toPathString`'s output as an HTML `name` or `id` attribute (e.g. inside a custom component), nothing about how you use it changes; the string just looks different. If you parsed the returned string back into a path, you'll need to switch to `decodeURIComponent` per segment after splitting on `/`.

---

## 6. `setData` is required; `viewOnly` removed; `JsonViewer` added

`JsonEditor` is now strictly controlled — `setData` is a required prop. The old "uncontrolled" mode (omit `setData`, edits managed internally) is gone, along with the `viewOnly` shorthand. In its place is a sibling export, `JsonViewer`, which is the canonical read-only entry point.

### If you already pass `setData`

No change. Edits will continue to flow through `setData` exactly as before.

### If you used `viewOnly={true}` for a read-only display

Switch to `JsonViewer`:

```tsx
// Before (v1)
import { JsonEditor } from 'json-edit-react'
<JsonEditor data={data} viewOnly />

// After (v2)
import { JsonViewer } from 'json-edit-react'
<JsonViewer data={data} />
```

`JsonViewer` accepts all the display, theming, keyboard, search, collapse, custom-node, and localisation props of `JsonEditor`, but drops `setData`, the update callbacks (`onUpdate` / `onEdit` / `onAdd` / `onDelete` / `onChange`), and the edit-restriction props (`restrictEdit` / `restrictAdd` / `restrictDelete` / `restrictDrag` / `restrictTypeSelection`) — none are meaningful in a read-only context. It does accept `editorRef`, but its handle is collapse-only (see §7). If you were passing any of the dropped props alongside `viewOnly={true}`, you can drop them when moving to `JsonViewer`.

### If you used `viewOnly={cond}` to toggle editing dynamically

Replace with the `restrict*` props on `JsonEditor`:

```tsx
// Before (v1)
<JsonEditor data={data} setData={setData} viewOnly={!canEdit} />

// After (v2)
<JsonEditor
  data={data}
  setData={setData}
  restrictEdit={!canEdit}
  restrictAdd={!canEdit}
  restrictDelete={!canEdit}
  restrictDrag={!canEdit}   // only needed if you've enabled drag with restrictDrag={false}
/>
```

This keeps the same component mounted across the toggle, so internal state (collapse, search, currently-editing element) is preserved. `restrictDrag` defaults to `true` (drag off), so you only need to thread the toggle through it if you'd previously opted in to drag-and-drop.

### If you relied on the uncontrolled "fire-and-forget" mode

If you previously passed only `data` (no `setData`) and let the component manage edits internally, you now need to lift that state into your own component:

```tsx
// Before (v1)
<JsonEditor data={initialData} />

// After (v2)
const [data, setData] = useState(initialData)
<JsonEditor data={data} setData={setData} />
```

---

## 7. `externalTriggers` prop replaced by the `editorRef` imperative handle

The `externalTriggers` prop — a state-as-RPC object you mutated to trigger collapse/edit actions — is removed. Imperative control now goes through a ref handle passed via the new `editorRef` prop. The `ExternalTriggers` and `EditState` types are removed; `JsonEditorHandle` (and `JsonViewerHandle`) are added.

**Why:** props aren't commands. The old pattern required carefully memoising the trigger object to avoid infinite effect loops, and gave no autocomplete for the available actions. A ref handle is idiomatic React, fully typed, and removes that footgun. (`editorRef` is a *plain ref-valued prop*, not the `ref` attribute, so `JsonEditor<T>` stays a generic component with full type inference.)

### Migration

```diff
- import { JsonEditor, type ExternalTriggers } from 'json-edit-react'
+ import { useRef } from 'react'
+ import { JsonEditor, type JsonEditorHandle } from 'json-edit-react'

- const [triggers, setTriggers] = useState<ExternalTriggers>()
+ const editorRef = useRef<JsonEditorHandle>(null)

- <JsonEditor data={data} setData={setData} externalTriggers={triggers} />
+ <JsonEditor data={data} setData={setData} editorRef={editorRef} />
```

Action mapping:

| v1 `externalTriggers` | v2 `editorRef` handle |
|---|---|
| `{ collapse: state }` | `editorRef.current.collapse(state)` |
| `{ edit: { path } }` | `editorRef.current.startEdit({ path })` |
| `{ edit: { action: 'accept' } }` | `await editorRef.current.confirm()` |
| `{ edit: { action: 'cancel' } }` | `editorRef.current.cancel()` |

The handle is **UI-interactions only** — it opens/commits/cancels an editing session or collapses nodes; it has no data mutators (you own `data`/`setData`, so mutating data is just `setData(newData)`). Beyond the value-edit `startEdit`, there are now `startRename` (open the key editor) and `startAdd` (open the add input on a collection), all sharing one `confirm()` / `cancel()`.

Notes:

- **The openers return a `CommandResult`** (`{ success: true } | { success: false; error }`), not a bare boolean. A refusal carries `error.code` of `'PATH_NOT_FOUND'` or `'RESTRICTED'`, so you can give your own feedback. They **respect the relevant `restrict*` filter by default**; pass `{ path, overrideRestrictions: true }` to bypass it (e.g. lock the tree with `restrictEdit={true}` and imperatively open one node). `overrideRestrictions` skips **only** the filter — your `onUpdate` still runs at `confirm()`.
- **`confirm()` is now async** — it commits the open session through `onUpdate`, resolving to `{ success: true }` or `{ success: false, error }` if rejected. `await` it if you need the outcome.
- The openers **auto-reveal** a target collapsed below the current view: collapsed ancestors expand so the node becomes editable.

`JsonViewer` also accepts `editorRef`, but its `JsonViewerHandle` exposes only `collapse` — editing actions would bypass the read-only contract, so they aren't surfaced.

---

## 8. `enableClipboard` split into `allowClipboard` + `onCopy`

The dual-purpose `enableClipboard?: boolean | CopyFunction` prop is split into two single-purpose props: `allowClipboard?: boolean` (default `true`) controls whether the copy button shows, and the new `onCopy?: OnCopyFunction` observer runs after a copy. The `CopyFunction` type is removed in favour of `OnCopyFunction`.

**Why:** one prop doing two unrelated jobs (a boolean toggle *and* a callback) was awkward to type and document. The split is single-purpose, and `onCopy` now receives the same flat [`NodeData`](https://carlosnz.github.io/json-edit-react/) payload every other callback gets.

### Migration

If you only enabled/disabled the button:

```diff
- <JsonEditor data={data} setData={setData} enableClipboard={false} />
+ <JsonEditor data={data} setData={setData} allowClipboard={false} />
```

If you passed a callback (it both enabled the button *and* observed copies):

```diff
- import { JsonEditor, type CopyFunction } from 'json-edit-react'
+ import { JsonEditor, type OnCopyFunction } from 'json-edit-react'

- const handleCopy: CopyFunction = ({ stringValue, type, success, errorMessage }) => {
-   if (!success) console.error(errorMessage)
+ const handleCopy: OnCopyFunction = ({ stringValue, type, success, error }) => {
+   if (!success) console.error(error?.message)
  }

- <JsonEditor data={data} setData={setData} enableClipboard={handleCopy} />
+ <JsonEditor data={data} setData={setData} onCopy={handleCopy} />
```

Payload changes on the callback object: the explicit `key` / `path` / `value` fields are now part of the spread `NodeData` (so `key`, `path`, `value`, `fullData`, … are all still available); `errorMessage: string | null` becomes `error?: { message: string }` (present only when `success` is `false`).

---

## 9. One `onUpdate`; unified return shape; flat `NodeData` payloads

The update callbacks are consolidated into a single result-producer with one consistent payload and return shape.

### `onEdit` / `onAdd` / `onDelete` removed — use one `onUpdate`

The discrete props are gone. Provide a single `onUpdate` and branch on the new `event` discriminant (`'edit' | 'add' | 'delete' | 'rename' | 'move'`):

```diff
- <JsonEditor
-   data={data}
-   setData={setData}
-   onEdit={handleEdit}
-   onAdd={handleAdd}
-   onDelete={handleDelete}
- />
+ <JsonEditor
+   data={data}
+   setData={setData}
+   onUpdate={(props) => {
+     switch (props.event) {
+       case 'edit':   return handleEdit(props)
+       case 'add':    return handleAdd(props)
+       case 'delete': return handleDelete(props)
+       // 'rename' and 'move' are now first-class events too (see below)
+     }
+   }}
+ />
```

Renaming a key and moving a node (drag-drop) previously reached the update callback disguised as edits. They now arrive as distinct events: `event: 'rename'` carries `newKey` (with `key`/`path` describing the *old* identity), and `event: 'move'` carries `newPath` (with `path` the source). `newData` is the resulting document in every case.

### Unified `UpdateResult` return shape

The five legacy return shapes collapse into one. The `['value', x]` / `['error', x]` tuple forms and the bare-string error are removed:

```diff
- return ['value', sortedArray]      // override the committed value
+ return { value: sortedArray }

- return 'That value is not allowed' // reject with a message
+ return { error: 'That value is not allowed' }

- return ['error', 'Nope']
+ return { error: 'Nope' }           // or { error: { code, message } }
```

`true` / `void` / `undefined` (proceed) and `false` (reject with a generic message) are unchanged. **New:** returning **`null`** silently cancels the change — no commit and *no* error message (use it to quietly abort a change that isn't an error; `false` still shows an error).

### Flat `NodeData` payloads (`onUpdate` / `onChange`)

Every callback now receives the standard flat [`NodeData`](README.md#filter-functions) plus its extras, so the bespoke field names are gone:

```diff
  onUpdate={({
-   currentData,   // → fullData
-   currentValue,  // → value
-   name,          // → key
    newData,
    newValue,
  }) => { /* ... */ }}
```

`onChange` changes the same way (`currentData`→`fullData`, `currentValue`→`value`, `name`→`key`):

```diff
- onChange={({ newValue, name }) => (name === 'age' ? clamp(newValue) : newValue)}
+ onChange={({ newValue, key }) => (key === 'age' ? clamp(newValue) : newValue)}
```

### `JerError` → `JsonEditorError`

The error type reported to `onError` (and accepted in an `onUpdate` `{ error }` return) is renamed; its shape (`{ code, message }`) is unchanged, and the `code` union gains some forward-looking members. (`onError`'s own payload also moves to flat `NodeData` — see §10.)

```diff
- import { type JerError } from 'json-edit-react'
+ import { type JsonEditorError } from 'json-edit-react'
```

---

## 10. Observers reshaped: `onEditEvent` lifecycle stream; flat `onError` / `onCollapse`; `onCopy` error

The observer callbacks move onto the same flat `NodeData` payload as the rest of the API, and `onEditEvent` becomes a full lifecycle stream.

### `onEditEvent` — from `(path, isKey)` to a discriminated event stream

```diff
- onEditEvent={(path, isKey) => {
-   if (path === null) /* ended editing */
-   else if (isKey)   /* started editing a key */
-   else              /* started editing a value */
- }}
+ onEditEvent={(e) => {
+   switch (e.event) {
+     case 'startEdit': case 'startRename': case 'startAdd': /* a session opened */ break
+     case 'confirmEdit': case 'confirmRename': case 'confirmAdd': /* committed */ break
+     case 'cancelEdit': case 'cancelRename': case 'cancelAdd': /* closed, no change */ break
+     case 'delete': case 'move': /* instant */ break
+   }
+   // e is the node's NodeData + the `event`; 'confirmRename' also has oldKey/newKey
+ }}
```

It now fires for the **complete** lifecycle (start → confirm/cancel) of value-edit, key-rename and add sessions, plus the instant `delete`/`move` — not just edit start/stop. This absorbs the role a dedicated `onRenameProperty` would have played (a rename surfaces as `startRename`/`confirmRename`/`cancelRename`). A no-op confirm (closing with no change) and a rejected/aborted change both report as `cancel*`.

### `onError` and `onCollapse` — flat `NodeData`

Both now receive the standard flat node data instead of a bespoke object:

```diff
  // onError
- onError={({ currentData, currentValue, name, path, error, errorValue }) => ...}
+ onError={({ fullData, value, key, path, error, errorValue }) => ...}

  // onCollapse — the `collapsed` / `includeChildren` flags are unchanged; the
  // rest of the payload is now full NodeData (so `key`, `value`, `fullData`, … too)
  onCollapse={({ path, collapsed, includeChildren }) => ...} // still works
```

(`currentData`→`fullData`, `currentValue`→`value`, `name`→`key`, matching §9.) `CollapseState` — the `editorRef.collapse` command **input** — is unchanged.

### `onCopy` — `error` is now a `JsonEditorError`

```diff
- onCopy={({ success, error }) => { if (!success) console.error(error?.message) }}
+ onCopy={({ success, error }) => { if (!success) console.error(error?.message) }}
  // error is now `{ code: 'CLIPBOARD_ERROR', message }` instead of `{ message }`
```

`error.message` still works; the addition is the `code` field (`'CLIPBOARD_ERROR'`).

---

## Need help?

If you hit something this guide doesn't cover, please [open an issue](https://github.com/CarlosNZ/json-edit-react/issues) — happy to help triage and add to this doc.
