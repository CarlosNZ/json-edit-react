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
| `externalTriggers.collapse` is now a fire-and-forget broadcast | Broadcasts only reach mounted `CollectionNode`s; toggle the `collapse` prop for full-tree expand/collapse on initially-collapsed trees — see §7 |

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

`JsonViewer` accepts all the display, theming, keyboard, search, collapse, custom-node, and localisation props of `JsonEditor`, but drops `setData`, the update callbacks (`onUpdate` / `onEdit` / `onAdd` / `onDelete` / `onChange`), the edit-restriction props (`restrictEdit` / `restrictAdd` / `restrictDelete` / `restrictDrag` / `restrictTypeSelection`), and `externalTriggers` — none are meaningful in a read-only context. If you were passing any of those alongside `viewOnly={true}`, you can drop them when moving to `JsonViewer`.

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

## 7. Collapse broadcasts are now fire-and-forget

Collapse commands sent via `externalTriggers.collapse` (and the internal `setCollapseState` used by the toolbar buttons) used to be held briefly in component state, with a 2-second timer clearing them so subsequent identical commands would re-fire. The new model is pub-sub: each command is broadcast directly to currently-subscribed `CollectionNode`s and not retained anywhere.

**Why:** state-coerced-into-command-via-timer was the source of two long-standing oddities. Within the 2-second window, nodes that mounted *after* a collapse command (e.g. children added to an expanded parent) would automatically apply that command — typically not what you wanted. After the window, a re-issued identical command would no-op. The pub-sub model is honest about what's actually happening: collapse is an event, not a state.

### What you'll see in practice

For most consumers, **nothing changes** — toolbar-driven Collapse/Expand on a fully-mounted tree, path-scoped commands, arrays of commands, the `onCollapse` callback, and back-to-back identical commands all behave the same way (in fact, back-to-back commands now fire reliably without needing a 2-second gap).

Two specific scenarios have changed:

**Broadcasts can't punch through a collapse boundary.** This applies any time the target of a broadcast (or any of its descendants) isn't currently mounted — on initial load or later — because a collapsed `CollectionNode` doesn't render its children at all (this is an important perf optimization for large data sets). Pub-sub broadcasts only reach mounted subscribers, so:

- A path-scoped command targeting an unmounted node silently misses (same as v1 — the timer didn't help here either).
- A subtree-scoped command (`includeChildren: true`) reaches the targeted root if it's mounted, and that root expands — but its newly-mounted children evaluate `collapseFilter` at mount time and use *that* result. The broadcast doesn't cascade to them automatically the way v1's 2-second-lingering state did.

**For tree-wide or "expand deep" use cases, manage the `collapse` prop as state instead** — each newly-mounted node evaluates the current filter at mount time, so cascading expansion happens naturally:

```tsx
// Before (v1)
const [triggers, setTriggers] = useState<ExternalTriggers | undefined>()
const expandAll = () =>
  setTriggers({ collapse: { collapsed: false, path: [], includeChildren: true } })
<JsonEditor data={data} setData={setData} collapse externalTriggers={triggers} />

// After (v2)
const [collapse, setCollapse] = useState(true)
const expandAll = () => setCollapse(false)
<JsonEditor data={data} setData={setData} collapse={collapse} />
```

Path-scoped commands continue to work fine when the targeted node is already mounted (e.g. collapsing a subtree whose ancestor is expanded; toggling a single chevron's state from a button). These are the most common uses of `externalTriggers.collapse` and they behave identically to v1.

**External data changes within ~2 seconds of a command no longer replay it.** Previously, mutating `data` shortly after firing a collapse command could cause newly-mounted nodes (from the data change) to also apply the lingering command. That was a side effect of the timer, not a designed feature. With pub-sub, newly-mounted nodes use their `collapse` prop (or default) regardless of what was broadcast moments earlier.

---

## Need help?

If you hit something this guide doesn't cover, please [open an issue](https://github.com/CarlosNZ/json-edit-react/issues) — happy to help triage and add to this doc.
