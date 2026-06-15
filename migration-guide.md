# Migration Guide: v1 → v2

**json-edit-react version 2** is a substantial refactor, focusing on performance, completeness (of existing functionality) and consistency (of behaviour and API surface). Consequently, unless you're using a very basic configuration for V1, you will encounter breaking changes. Fortunately it shouldn't be too much effort to manually migrate if you follow this guide.

## Quick overview

If you only have a few minutes, these are the changes most likely to affect existing code:

| What changed                                                                                                                                                                                                                                             | Migration                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pre-built themes split into a separate package                                                                                                                                                                                                           | `npm i @json-edit-react/themes` and update theme imports                                                                                                                                                                                   |
| Custom components moved to separate package, including the previously built-in `LinkCustomComponent`                                                                                                                                                     | `npm i @json-edit-react/components`; the definition is now the `hyperlinkDefinition()` factory — see [Custom components](#2-custom-components-moved-to-json-edit-reactcomponents)                                                          |
| `JsonEditor` is now generic on the data type (`JsonEditor<T>`)                                                                                                                                                                                           | No action needed — defaults to `JsonData`. Opt in with<br> `<JsonEditor<MyShape> ... />`                                                                                                                                                   |
| `setData` is now required; `viewOnly` removed; new `JsonViewer` export                                                                                                                                                                                   | For read-only, use `<JsonViewer>`, which is a wrapper around the editor with appropriate props for view-only — see [`setData` is required](#4-setdata-is-required-viewonly-removed-jsonviewer-added)                                       |
| `restrict*` props renamed to `allow*` (polarity inverted)                                                                                                                                                                                                | Rename `restrictEdit`→`allowEdit` etc. and **invert** booleans / filter results — see [`restrict*` → `allow*`](#5-restrict-props-renamed-to-allow-semantics-inverted)                                                                      |
| `enableClipboard` split into `showClipboardButton` (boolean) + `onCopy` (callback); `CopyFunction` → `OnCopyFunction`                                                                                                                                    | Rename the boolean to `showClipboardButton`; move any copy callback to `onCopy` — see [`enableClipboard` split](#6-enableclipboard-split-into-showclipboardbutton--oncopy)                                                                 |
| Several display / config props renamed                                                                                                                                                                                                                   | Rename `keySort`, `rootFontSize`, `errorMessageTimeout`, `stringTruncate`, `showArrayIndices`, `arrayIndexFromOne` — see [Display / config prop renames](#7-display--config-prop-renames)                                                  |
| Callback payloads are now a single flat `NodeData` (`currentData`→`fullData`, `currentValue`→`value`, `name`→`key`)                                                                                                                                      | Rename those fields in `onUpdate` / `onChange` / `onError` / `onCollapse` / `onCopy` — see [Flat `NodeData` payloads](#8-flat-nodedata-payloads)                                                                                           |
| `onEdit` / `onAdd` / `onDelete` merged into one `onUpdate`, return shape unified                                                                                                                                                                         | Use a single `onUpdate` and `switch (props.event)`; replace tuple / bare-string returns with `{ value }` / `{ error }` (and `null` to silently cancel) — see [One `onUpdate`](#9-one-onupdate-unified-return-shape-flat-nodedata-payloads) |
| `JerError`'s `code` union gains `RENAME_ERROR` / `MOVE_ERROR` / `CLIPBOARD_ERROR`                                                                                                                                                                        | Handle the new codes only if you exhaustively `switch` on `error.code` — see [One `onUpdate`](#9-one-onupdate-unified-return-shape-flat-nodedata-payloads)                                                                                 |
| `onEditEvent` is now a lifecycle stream `(e) => …` (was `(path, isKey) => …`); `onError` / `onCollapse` use flat `NodeData`; `onCopy.error` is a `JerError`                                                                                              | `switch (e.event)` over start/confirm/cancel + delete/move; update the flat payload fields — see [Observers reshaped](#10-observers-reshaped-oneditevent-lifecycle-stream-flat-onerror--oncollapse-oncopy-error)                           |
| `CustomNodeDefinition` fields renamed (`element`→`component`, `customKey`→`keyComponent`, `customNodeProps`→`componentProps`, `hideKey`→`showKey` (inverted), `showInTypesSelector`→`showInTypeSelector`); type `CustomNodeProps`→`CustomComponentProps`; the component's `onError` reporter is removed | Rename the fields in your definitions and the props type in your components; replace any component `onError` call with a `throw`ing `fromStandardType` — see [`CustomNodeDefinition` field renames](#11-customnodedefinition-field-renames)                                                                           |
| `externalTriggers` prop replaced by an [imperative handle](https://react.dev/reference/react/useImperativeHandle)                                                                                                                                        | Use a `useRef<JsonEditorHandle>` and call `editorRef.current.collapse/startEdit/confirm/cancel` — see [the `editorRef` handle](#12-externaltriggers-prop-replaced-by-the-editorref-imperative-handle)                                      |
| Fine-grained re-rendering: object / array / function props must be referentially stable to benefit                                                                                                                                                       | Keep `customNodeDefinitions`, filter functions, `translations`, etc. stable (module scope or `useMemo`); callbacks are stabilised for you — see [stable props](#13-keep-object-and-function-props-referentially-stable)                    |
| Misc public-export changes — new `AutogrowTextArea`; `toPathString` is now `/`-encoded; `ThemeStyles` is `Partial`                                                                                                                                       | Mostly additive; act only if you parse `toPathString` output or typed against a total `ThemeStyles` — see [Misc changes to public exports](#14-misc-changes-to-public-exports)                                                             |

---

## 1. Pre-built themes moved to `@json-edit-react/themes`

The six pre-built themes (`githubDarkTheme`, `githubLightTheme`, `monoDarkTheme`, `monoLightTheme`, `candyWrapperTheme`, `psychedelicTheme`) are no longer re-exported from `json-edit-react`. They live in a new companion package, [`@json-edit-react/themes`](https://www.npmjs.com/package/@json-edit-react/themes), which is published and versioned independently.

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

The built-in `LinkCustomComponent` + `LinkCustomNodeDefinition` are no longer exported from `json-edit-react`. They — along with **11 other pre-built custom node components** — live in a new companion package, [`@json-edit-react/components`](https://www.npmjs.com/package/@json-edit-react/components).

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
+ import { hyperlinkDefinition } from '@json-edit-react/components'
```

The definition is now a **factory** — call it (with no arguments for the v1 behaviour) rather than passing the object directly:

```jsx
<JsonEditor
  data={data}
  setData={setData}
  customNodeDefinitions={[hyperlinkDefinition()]}
/>
```

If you previously spread `LinkCustomNodeDefinition` to customize it, pass the overrides to the factory instead. A `condition` override is combined (AND) with the built-in URL check rather than replacing it, and `componentProps` overrides shallow-merge with the defaults:

```jsx
customNodeDefinitions={[hyperlinkDefinition({ condition: ({ key }) => key === 'homepage' })]}
```

### What you also get

`@json-edit-react/components` ships 13 components in total: the original `LinkCustomComponent`, 11 more that previously existed only as demo code rather than an installable package, and the new `ErrorIndicator`:

| Component                              | Use case                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Hyperlink`                            | URL strings → clickable links (functionally a superset of the v1 version, with configurable `componentProps`) |
| `EnhancedLink`                         | Object-shaped data `{ text, url }` → clickable string                                                         |
| `DateTimePicker`                       | ISO date strings, edited via `react-datepicker`                                                               |
| `DateObject`                           | JavaScript `Date` objects                                                                                     |
| `ColorPicker`                          | Hex/RGB/HSL color strings, edited via `react-colorful`                                                        |
| `Markdown`                             | Markdown-formatted strings, rendered via `react-markdown`                                                     |
| `Image`                                | Image URLs displayed inline                                                                                   |
| `BooleanToggle`                        | Booleans rendered as a toggle switch                                                                          |
| `BigInt`, `NaN`, `Symbol`, `Undefined` | Non-JSON-native value displays                                                                                |
| `ErrorIndicator`                       | Adds a glyph (default ⚠️) beside the nodes you target via `condition` — e.g. validation errors                 |

Each component ships with a matching definition factory (`datePickerDefinition()`, `markdownDefinition()`, …) ready to drop into the `customNodeDefinitions` prop.

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
  onUpdate={({ newData, fullData }) => {
    // newData and fullData are typed as User
  }}
/>
```

The generic flows to root-level slots only: `data`, `setData`, `newData` on `UpdateFunctionProps`, and `fullData` on `NodeData` — the payload type that `UpdateFunctionProps`, `OnChangeFunction`, `OnErrorFunction`, `FilterFunction`, `SearchFilterFunction`, etc. all build on. Per-node `value` and `parentData` slots stay `unknown` — they are arbitrary-depth slices that no static type can describe.

> [!NOTE]
> Same mental model as `useState<T>`: `T` describes the data you provided, not a runtime invariant. If structural edits are unrestricted, post-edit values may not conform to `T` — pair with `allowAdd` / `allowDelete` / `allowTypeSelection`, or validate in `onUpdate`, if you depend on the shape.

`CustomNodeDefinition` is intentionally **not** generic on the data type. `customNodeDefinitions` is a *single* array whose entries each match (via `condition`) differently-shaped nodes anywhere in the tree — so one document-level `T` can't describe them, and making it generic would render mixed-shape definition arrays unusable. Its two existing generics (for `componentProps` and wrapper props) are unchanged, and custom-node `condition` / `component` continue to receive `NodeData<JsonData>`.

---

## 4. `setData` is required; `viewOnly` removed; `JsonViewer` added

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

`JsonViewer` accepts all the display, theming, keyboard, search, collapse, custom-node, and localisation props of `JsonEditor`, but drops `setData`, the update callbacks (`onUpdate` / `onChange`), and the edit-permission props (`allowEdit` / `allowAdd` / `allowDelete` / `allowDrag` / `allowTypeSelection`) — none are meaningful in a read-only context. It does accept `editorRef`, but its handle is collapse-only (see [the `editorRef` handle](#12-externaltriggers-prop-replaced-by-the-editorref-imperative-handle)). If you were passing any of the dropped props alongside `viewOnly={true}`, you can drop them when moving to `JsonViewer`.

### If you used `viewOnly={cond}` to toggle editing dynamically

Replace with the `allow*` props on `JsonEditor`. Note the inverted polarity — `allow*` props say what's *permitted*, so the condition is no longer negated:

```tsx
// Before (v1)
<JsonEditor data={data} setData={setData} viewOnly={!canEdit} />

// After (v2)
<JsonEditor
  data={data}
  setData={setData}
  allowEdit={canEdit}
  allowAdd={canEdit}
  allowDelete={canEdit}
  allowDrag={canEdit}   // only needed if you'd enabled drag with allowDrag
/>
```

This keeps the same component mounted across the toggle, so internal state (collapse, search, currently-editing element) is preserved. `allowDrag` defaults to `false` (drag off), so you only need to thread the toggle through it if you'd previously opted in to drag-and-drop. See [`restrict*` → `allow*`](#5-restrict-props-renamed-to-allow-semantics-inverted) for the full mapping.

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

## 5. `restrict*` props renamed to `allow*` (semantics inverted)

The five `restrict*` props are renamed to `allow*`. This is **not just a rename** — the polarity flips, so the meaning of every value inverts: a `boolean` flips, and a `FilterFunction`'s return value flips (a `restrict*` filter returned `true` to **block** a node; an `allow*` filter returns `true` to **permit** it).

| v1 (`restrict*`)        | v2 (`allow*`)        | Default (v1 → v2)                            |
| ----------------------- | -------------------- | -------------------------------------------- |
| `restrictEdit`          | `allowEdit`          | `false` → `true`                             |
| `restrictDelete`        | `allowDelete`        | `false` → `true`                             |
| `restrictAdd`           | `allowAdd`           | `false` → `true`                             |
| `restrictTypeSelection` | `allowTypeSelection` | `false` → `true`                             |
| `restrictDrag`          | `allowDrag`          | `true` → `false` (drag still off by default) |

### Booleans flip

```diff
- restrictEdit={true}      // editing fully blocked
+ allowEdit={false}        // editing fully blocked

- restrictDrag={false}     // drag enabled
+ allowDrag={true}         // drag enabled
```

### Filter functions flip their return value

```diff
- restrictEdit={({ key }) => key === 'id'}        // block editing of `id`
+ allowEdit={({ key }) => key !== 'id'}           // permit editing of everything except `id`
```

Negate the whole predicate. For guard-style functions with early returns, flip every `return true`/`return false`.

### `allowTypeSelection` — the array and function forms

The **array** form (a whitelist of available types) is unchanged — it always meant "these types are available". Only the **boolean** form (and a function *returning* a boolean) flips: under `allowTypeSelection`, `true` means "all types available", `false` means "no type change". So a function that returned `false` to mean "no restriction" should now return `true`, and one that returned `true` to lock the type should now return `false`.

---

## 6. `enableClipboard` split into `showClipboardButton` + `onCopy`

The dual-purpose `enableClipboard?: boolean | CopyFunction` prop is split into two single-purpose props: `showClipboardButton?: boolean` (default `true`) controls whether the copy button shows, and the new `onCopy?: OnCopyFunction` observer runs after a copy. The `CopyFunction` type is removed in favour of `OnCopyFunction`.

**Why:** one prop doing two unrelated jobs (a boolean toggle *and* a callback) was awkward to type and document. The split is single-purpose, and `onCopy` now receives the same flat [`NodeData`](https://carlosnz.github.io/json-edit-react/) payload every other callback gets.

### Migration

If you only enabled/disabled the button:

```diff
- <JsonEditor data={data} setData={setData} enableClipboard={false} />
+ <JsonEditor data={data} setData={setData} showClipboardButton={false} />
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

Payload changes on the callback object: the explicit `key` / `path` / `value` fields are now part of the spread [`NodeData`](#8-flat-nodedata-payloads) (so `key`, `path`, `value`, `fullData`, … are all still available); `errorMessage: string | null` becomes `error?: JerError` — a `{ code: 'CLIPBOARD_ERROR', message }`, present only when `success` is `false`.

---

## 7. Display / config prop renames

A handful of props were renamed. These are **pure renames** (no behaviour change) except `arrayIndexStart`, whose type changed from `boolean` to `number`:

| v1                    | v2                     | Notes                                                                                        |
| --------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `keySort`             | `sortKeys`             |                                                                                              |
| `rootFontSize`        | `baseFontSize`         |                                                                                              |
| `errorMessageTimeout` | `errorDisplayTime`     |                                                                                              |
| `stringTruncate`      | `stringTruncateLength` |                                                                                              |
| `showArrayIndices`    | `showArrayIndexes`     |                                                                                              |
| `arrayIndexFromOne`   | `arrayIndexStart`      | `boolean` → `number`: `arrayIndexFromOne={true}` becomes `arrayIndexStart={1}` (default `0`) |

```diff
- arrayIndexFromOne={true}
+ arrayIndexStart={1}
```

> The same `stringTruncate` → `stringTruncateLength` rename applies to the `componentProps` of the `Hyperlink` / `EnhancedLink` components in `@json-edit-react/components`.

One display **default** also changed (not a rename): `showCollectionCount` now defaults to `"when-collapsed-or-filtered"` (previously `true`). Counts appear when a collection is collapsed *or* when a search filter is narrowing its children — in the latter case rendered as `"n of m items"`. To keep the v1 always-visible behaviour, set `showCollectionCount={true}`; for collapse-only, set `"when-collapsed"`.

The filtered-count form is driven by a new localisation key, `ITEMS_FILTERED`. If you ship a complete `translations` object, add it (otherwise the English default `"{{visible}} of {{total}} items"` will appear alongside your translated UI whenever a search filter is active):

```diff
  translations={{
    // ...existing keys
    ITEMS_MULTIPLE: '…',
+   ITEMS_FILTERED: '… {{visible}} … {{total}} …',
  }}
```

Both `{{visible}}` and `{{total}}` placeholders are substituted at render time.

---

## 8. Flat `NodeData` payloads

In v1, several callbacks each received a bespoke payload object. In v2 they all receive the **same flat [`NodeData`](README.md#filter-functions)** — the shape already passed to the filter functions — with their callback-specific extras spread on top. Three fields are renamed in the move:

| v1 (bespoke payload) | v2 (`NodeData`) |
| -------------------- | --------------- |
| `currentData`        | `fullData`      |
| `currentValue`       | `value`         |
| `name`               | `key`           |

```diff
- ({ currentData, currentValue, name }) => { /* ... */ }
+ ({ fullData, value, key }) => { /* ... */ }
```

The rename applies to every callback that used the old shape:

- **`onUpdate`** (which absorbs the v1 `onEdit` / `onAdd` / `onDelete`) and **`onChange`** — see [One `onUpdate`](#9-one-onupdate-unified-return-shape-flat-nodedata-payloads).
- **`onError`** and **`onCollapse`** — see [Observers reshaped](#10-observers-reshaped-oneditevent-lifecycle-stream-flat-onerror--oncollapse-oncopy-error).
- **`onCopy`** — see [`enableClipboard` split](#6-enableclipboard-split-into-showclipboardbutton--oncopy).

The filter, search, and type functions (`FilterFunction`, `SearchFilterFunction`, `TypeFilterFunction`, etc.) already received `NodeData` in v1, so their field names are unchanged.

---

## 9. One `onUpdate`; unified return shape; flat `NodeData` payloads

The update callbacks are consolidated into a single result-producer with one consistent payload and return shape. See the [Update Functions](README.md#update-functions) section of the README for the full reference.

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

### Optimistic commits + a second `control` argument

Commits are now **optimistic by default**: on submit the editor closes and the data updates immediately, then `onUpdate` runs in the background; a rejection automatically reverts and surfaces the error. A slow `onUpdate` (e.g. a remote save) no longer blocks the editor, and each in-flight commit is tracked independently so a late failure reverts only its own node. If you relied on the editor staying open until a slow `onUpdate` resolved, opt back in with the new second argument:

```diff
- onUpdate={async (props) => {
-   const ok = await confirmDialog(props)   // editor was implicitly held open
-   return ok ? undefined : false
- }}
+ onUpdate={async (props, { hold }) => {
+   const release = hold()                  // keep the editor open + block the tree
+   const ok = await confirmDialog(props)
+   if (!ok) return null                    // abort
+   release()                               // commit now
+ }}
```

`hold()` must be called synchronously (before the first `await`). See [Optimistic updates and gating](README.md#optimistic-updates-and-gating-hold) for the full contract.

### Flat `NodeData` payloads (`onUpdate` / `onChange`)

Both receive the standard flat `NodeData` — `currentData` / `currentValue` / `name` are now `fullData` / `value` / `key` (see [Flat `NodeData` payloads](#8-flat-nodedata-payloads)). In a return-transforming `onChange`, read `key` rather than `name`:

```diff
- onChange={({ newValue, name }) => (name === 'age' ? clamp(newValue) : newValue)}
+ onChange={({ newValue, key }) => (key === 'age' ? clamp(newValue) : newValue)}
```

### `JerError` — expanded `code` union

`JerError` keeps its name and `{ code, message }` shape. What changes is its `code`: it's now the exported `JerErrorCode` union, which gains three forward-looking members — `RENAME_ERROR`, `MOVE_ERROR` and `CLIPBOARD_ERROR` — covering the new rename/move rejection and clipboard-failure paths. The additions are backward-compatible; you only need to act if you exhaustively `switch` on `error.code` and want to handle the new cases. (`onError`'s own payload also moves to flat `NodeData` — see [Observers reshaped](#10-observers-reshaped-oneditevent-lifecycle-stream-flat-onerror--oncollapse-oncopy-error).)

### New localisation keys

v2 adds several localisation keys. None require action — a `translations` object doesn't have to be exhaustive, so any key you don't define falls back to its English default. But if you ship a localised `translations` object and want full coverage, add them:

- `ERROR_RENAME` / `ERROR_MOVE` — rejected `rename` and `move` operations now show operation-specific messages (`'Rename unsuccessful'` / `'Move unsuccessful'`) instead of the generic `'Update unsuccessful'`, mirroring `ERROR_ADD` / `ERROR_DELETE`. (Their `onError` codes are likewise `RENAME_ERROR` / `MOVE_ERROR` — additive members of `JerErrorCode`.)
- `TOOLTIP_OK` / `TOOLTIP_CANCEL` — labels for the ✓ / ✗ confirm and cancel controls, now that those are real `<button>`s. Always applied as `aria-label`s, and shown as visible tooltips when `showIconTooltips` is enabled.

```diff
  translations={{
    // ...existing keys
+   ERROR_RENAME: '…',
+   ERROR_MOVE: '…',
+   TOOLTIP_OK: '…',
+   TOOLTIP_CANCEL: '…',
  }}
```

One further new key, `ITEMS_FILTERED`, is covered alongside the `showCollectionCount` default change — see [Display / config prop renames](#7-display--config-prop-renames).

### Removed localisation key: `DEFAULT_STRING`

The `DEFAULT_STRING` key (`'New data!'`) is gone — if your `translations` object defines it, remove it (TypeScript rejects unknown keys). It was the placeholder substituted into the edit buffer when switching a custom node's type to `string`; type-switching now converts the node's actual value instead (e.g. a `null`/`undefined` source becomes an empty string), so the placeholder no longer exists.

---

## 10. Observers reshaped: `onEditEvent` lifecycle stream; flat `onError` / `onCollapse`; `onCopy` error

The observer callbacks move onto the same flat `NodeData` payload as the rest of the API, and `onEditEvent` becomes a full lifecycle stream. See the [Event callbacks](README.md#event-callbacks) section of the README for the full event reference.

### `onEditEvent` — from `(path, isKey)` to a discriminated event stream

```diff
- onEditEvent={(path, isKey) => {
-   if (path === null) /* ended editing */
-   else if (isKey)   /* started editing a key */
-   else              /* started editing a value */
- }}
+ onEditEvent={(e) => {
+   switch (e.event) {
+     case 'startEdit': case 'startRename': case 'startAdd':    /* a session opened */ break
+     case 'submitEdit': case 'submitRename': case 'submitAdd': /* user committed; a hold() gate may run */ break
+     case 'commitEdit': case 'commitRename': case 'commitAdd': /* applied, editor closed */ break
+     case 'cancelEdit': case 'cancelRename': case 'cancelAdd': /* closed without applying */ break
+     case 'delete': case 'move':                              /* instant */ break
+     case 'updateSuccess': case 'updateError':             /* background onUpdate settled */ break
+   }
+   // e is the node's NodeData + the `event`; 'commitRename' also has oldKey/newKey,
+   // 'updateError' the error, and the settlement events the `operation`
+ }}
```

It now fires for the **complete** lifecycle (`start*` → `submit*` → `commit*`, or `start*` → `cancel*`) of value-edit, key-rename and add sessions, plus the instant `delete`/`move` and the background settlement (`updateSuccess`/`updateError`) of any committed change whose `onUpdate` ran — not just edit start/stop. This absorbs the role a dedicated `onRenameProperty` would have played (a rename surfaces as `startRename`/`submitRename`/`commitRename`). A no-op confirm (submitting with no change) reports `commitEdit` (the session closed cleanly); an explicit cancel or a `null` returned from `onUpdate` reports `cancel*`.

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

(These renames are detailed under [Flat `NodeData` payloads](#8-flat-nodedata-payloads).) `CollapseState` — the `editorRef.collapse` command **input** — is unchanged.

### `onCopy` — `error` is now a `JerError`

```diff
- onCopy={({ success, error }) => { if (!success) console.error(error?.message) }}
+ onCopy={({ success, error }) => { if (!success) console.error(error?.message) }}
  // error is now `{ code: 'CLIPBOARD_ERROR', message }` instead of `{ message }`
```

`error.message` still works; the addition is the `code` field (`'CLIPBOARD_ERROR'`).

---

## 11. `CustomNodeDefinition` field renames

The custom-node API was aligned around one distinction: a **node** is a position in the data tree; a **component** is the React function that renders it. The render-slot fields now say `component` (they hold React components, not "elements"), the visibility flags are all positive `show*`, and the props type is named for what it is.

| v1                     | v2                     | Notes                                                                                                          |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `element`              | `component`            | The value / contents render slot                                                                               |
| `customKey`            | `keyComponent`         | The key render slot                                                                                            |
| `wrapperElement`       | `wrapperComponent`     | The collection wrapper slot                                                                                    |
| `customNodeProps`      | `componentProps`       | Config passed to `component` + `keyComponent`                                                                  |
| `hideKey: true`        | `showKey: false`       | **Polarity inverted** — `showKey` defaults to `true`                                                           |
| `showInTypesSelector`  | `showInTypeSelector`   | Matches the "Type" selector label                                                                              |
| type `CustomNodeProps` | `CustomComponentProps` | The props your component receives; also resolves the old `CustomNodeProps` / `CustomNodeDefinition` name clash |
| `onError` (received)   | **removed**            | Custom components no longer receive an error-reporter prop — reject invalid input by `throw`ing from the definition's `fromStandardType` instead |
| `setIsEditingKey`      | `startEditingKey`      | A key component's "enter key-edit mode" trigger — it's a zero-arg command, not a React `Dispatch`, so the `setIs*` name misled |
| `handleKeyPress` (received) | `onKeyDown`       | The key-down handler your component attaches to its input — renamed off React's deprecated "keyPress" name, and consistent with `TextEditorProps.onKeyDown` |
| `data` (received)      | `value` / `nodeData.value` | `CustomComponentProps` no longer carries the redundant `data` field — read the live value via `value`, or the committed value via `nodeData.value` |

`wrapperProps` keeps its name, but is now delivered to your `wrapperComponent` as `wrapperProps` (previously it arrived as `customNodeProps`); the wrapper's props type is the new `CustomWrapperProps`. `CustomNodeDefinition` is unchanged; `CustomKeyProps` keeps its name but renames `setIsEditingKey` → `startEditingKey` (above).

In your definitions:

```diff
  const myDefinition = {
    condition: ({ key }) => key === 'avatar',
-   element: AvatarComponent,
-   customNodeProps: { size: 'large' },
-   customKey: AvatarKey,
-   hideKey: true,
-   showInTypesSelector: true,
+   component: AvatarComponent,
+   componentProps: { size: 'large' },
+   keyComponent: AvatarKey,
+   showKey: false,
+   showInTypeSelector: true,
  }
```

And inside your component, rename the props type and the config prop:

```diff
- const AvatarComponent: React.FC<CustomNodeProps> = ({ value, customNodeProps }) => {
+ const AvatarComponent: React.FC<CustomComponentProps> = ({ value, componentProps }) => {
```

If your v1 component **called** the error reporter to reject invalid input, that reporter is **gone** — move the validation into a `throw`ing `fromStandardType` on the definition. The editor then rejects the commit, keeps the editor open, shows the message inline, and fires the consumer's `onError` — the same outcome, without the manual revert:

```diff
- // (in the component, at commit)
- if (!isValid(value)) {
-   handleEdit(lastValid.current)          // manual revert
-   onError({ code: 'UPDATE_ERROR', message }, value)
-   return
- }
+ // (on the definition — the editor handles reject + revert + inline message)
+ fromStandardType: (value) => {
+   if (!isValid(value)) throw new Error(message)
+   return value
+ }
```

---

## 12. `externalTriggers` prop replaced by the `editorRef` imperative handle

The `externalTriggers` prop — a state-as-RPC object you mutated to trigger collapse/edit actions — is removed. Imperative control now goes through a ref handle passed via the new `editorRef` prop. The `ExternalTriggers` and `EditState` types are removed; `JsonEditorHandle` (and `JsonViewerHandle`) are added. See the [Imperative handle (`editorRef`)](README.md#imperative-handle-editorref) section of the README for the full handle reference.

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

| v1 `externalTriggers`            | v2 `editorRef` handle                   |
| -------------------------------- | --------------------------------------- |
| `{ collapse: state }`            | `editorRef.current.collapse(state)`     |
| `{ edit: { path } }`             | `editorRef.current.startEdit({ path })` |
| `{ edit: { action: 'accept' } }` | `editorRef.current.confirm()`           |
| `{ edit: { action: 'cancel' } }` | `editorRef.current.cancel()`            |

The handle is **UI-interactions only** — it opens/commits/cancels a value-edit session or collapses nodes; it has no data mutators (you own `data`/`setData`, so mutating data is just `setData(newData)`).

Notes:

- **`startEdit` returns `true`** if it opened the session, or the reason it didn't — `'PATH_NOT_FOUND'` or `'RESTRICTED'` — so you can give your own feedback. It **respects `allowEdit` by default**; pass `{ path, overrideRestrictions: true }` to bypass it (e.g. lock the tree with `allowEdit={false}` and imperatively open one node). `overrideRestrictions` skips **only** the filter — your `onUpdate` still runs at `confirm()`.
- **`confirm()`** commits the open session through `onUpdate` (the same path as clicking the editor's confirm button); **`cancel()`** discards it.
- `startEdit` **auto-reveals** a target collapsed below the current view: collapsed ancestors expand so the node becomes editable.

`JsonViewer` also accepts `editorRef`, but its `JsonViewerHandle` exposes only `collapse` — editing actions would bypass the read-only contract, so they aren't surfaced.

---

## 13. Keep object and function props referentially stable

v2 introduces **fine-grained re-rendering**: on each commit only the nodes whose own data actually changed re-render, rather than the whole tree. On a large document this is the headline performance gain over v1 — but the editor can only skip a node when the props it receives are **referentially stable** across renders. A prop that's a brand-new object, array, or function on every render reads as "changed" at that node's memo boundary and forces it (and often the whole tree) to re-render on every commit. Nothing breaks; it just runs at v1 speed, so the gain never appears.

**You do _not_ need to memoise the callbacks.** `onUpdate`, `onChange`, `onError`, `onCollapse`, and `onEditEvent` are wrapped in stable, refs-to-latest identities internally, so passing them inline is fine.

Do keep these referentially stable — define them at module scope, or wrap them in `useMemo` / `useCallback`:

- `customNodeDefinitions` (and each definition's `condition` / `component`)
- function- or array-valued `allow*` props (`allowEdit={fn}`, `allowTypeSelection={[…]}`, …)
- a `translations` object, and any other object / array / function prop you'd otherwise build inline

```diff
- // new array identity every render → every node re-renders on every commit
- <JsonEditor data={data} setData={setData} customNodeDefinitions={[hyperlinkDefinition()]} />
+ // stable identity → untouched nodes bail out of re-rendering
+ const definitions = useMemo(() => [hyperlinkDefinition()], [])
+ <JsonEditor data={data} setData={setData} customNodeDefinitions={definitions} />
```

This is standard React `memo` hygiene rather than new API, but v2's per-node memoisation is what makes it pay off: on a large document it's the difference between only the touched nodes updating and the whole tree re-rendering on every commit.

---

## 14. Misc changes to public exports

A few smaller changes to the public export surface.

### `AutogrowTextArea` — new public export

`AutogrowTextArea` — the auto-resizing textarea primitive that powers `StringEdit` and the built-in string editor — is now exported from `json-edit-react`. This is purely additive; nothing about your existing code changes.

```js
import { AutogrowTextArea } from 'json-edit-react'
```

It joins the existing rendering primitives — `StringDisplay`, `StringEdit`, `toPathString` — that make it possible to compose custom components on top of the editor's built-in string handling. The new `@json-edit-react/components` package leans on these primitives internally; they're equally available to consumers writing their own components.

### `toPathString` encoding changed

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

### `ThemeStyles` is now a partial type

The exported `ThemeStyles` type is now `Partial<Record<ThemeableElement, …>>` (every key optional). If you imported it and relied on it being a *total* record, it's now optional-per-key — more permissive, so most code needs no change. See [Themes & Styles](README.md#themes--styles) in the README.

### Icon controls are now `<button>` elements

The clickable icon controls — the ✓ / ✗ confirm/cancel pair and the edit/copy/delete/add icons — are now real `<button>` elements instead of `<div>`s, so assistive tech announces them as actionable and reads their `aria-label`. Their appearance is unchanged (the default button chrome is reset in the bundled CSS), and they carry `tabIndex={-1}` so the editor's existing field-to-field Tab navigation is unaffected.

The only thing to act on is **custom CSS that targets these controls by tag name**. If you styled them via a `div` selector, switch it to `button`:

```css
/* Before (v1) */
.jer-confirm-buttons > div { … }

/* After (v2) */
.jer-confirm-buttons > button { … }
```

Selectors that target the wrapper classes (`.jer-confirm-buttons`, `.jer-edit-buttons`) or the icons themselves are unaffected. Consumer-supplied custom buttons (`customButtons`) remain wrapped in a `<div>`, so their markup is unchanged.

### Closing-bracket alignment

The closing bracket of an expanded object/array now aligns with the key (the start of the opening line) at every depth, rather than carrying a depth-dependent offset toward the collapse chevron. The only thing to act on is **custom CSS that positioned the outside closing bracket** via `.jer-bracket-outside`: that class no longer sets `padding-left`, so if you added a rule to compensate for the old offset, remove it.

---

## Need help?

If you hit something this guide doesn't cover, please [open an issue](https://github.com/CarlosNZ/json-edit-react/issues) — happy to help triage and add to this doc.
