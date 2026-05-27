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

Nothing else about the editor's runtime behaviour, props, or callbacks has changed.

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

## 3. New public export in core: `AutogrowTextArea`

`AutogrowTextArea` — the auto-resizing textarea primitive that powers `StringEdit` and the built-in string editor — is now exported from `json-edit-react`. This is purely additive; nothing about your existing code changes.

```js
import { AutogrowTextArea } from 'json-edit-react'
```

It joins the existing rendering primitives — `StringDisplay`, `StringEdit`, `toPathString` — that make it possible to compose custom components on top of the editor's built-in string handling. The new `@json-edit-react/components` package leans on these primitives internally; they're equally available to consumers writing their own components.

---

## Need help?

If you hit something this guide doesn't cover, please [open an issue](https://github.com/CarlosNZ/json-edit-react/issues) — happy to help triage and add to this doc.
