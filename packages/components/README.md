# @json-edit-react/components

Ready-to-use custom node components for [json-edit-react](https://github.com/CarlosNZ/json-edit-react).

## Install

```sh
npm install @json-edit-react/components
# or
yarn add @json-edit-react/components
# or
pnpm add @json-edit-react/components
```

`json-edit-react` and `react` are peer dependencies. Other third-party libraries (`react-datepicker`, `react-markdown`, `react-colorful`, etc.) are regular dependencies and install automatically.

## Available components

Each component ships a React component plus a definition factory that produces a `CustomNodeDefinition` ready to drop into `customNodeDefinitions`.

| Component | Use case |
|---|---|
| `Hyperlink` | Detects URL strings and renders them as clickable links |
| `EnhancedLink` | Object-shaped data with `{text, url}` rendered as a link |
| `DatePicker` | ISO date strings, edited via a swappable date-picker widget — pass `ReactDatePicker` (or your own) via `componentProps.DatePicker` |
| `DateObject` | JavaScript `Date` objects |
| `UnixTimestamp` | Epoch numbers (seconds or milliseconds) shown as a date, edited via the same swappable picker as `DatePicker` |
| `ColorPicker` | Hex/RGB/HSL color strings, edited via `react-colorful` |
| `Markdown` | Markdown-formatted strings, rendered via `react-markdown` |
| `Image` | Image URLs displayed inline |
| `BooleanToggle` | Boolean values rendered as a toggle switch |
| `BigInt` | `BigInt` values |
| `NaN` | `NaN` value display |
| `Symbol` | `Symbol` value display |
| `Undefined` | `undefined` value display |
| `ErrorIndicator` | Wraps a node with a glyph (default ⚠️) to flag the nodes you target via `condition` — e.g. validation errors |

### Editor slot widgets

Standalone components that plug into JsonEditor's `Select` and `TextEditor` props (not into `customNodeDefinitions`) to replace a built-in UI control. They ship under their own subpath — **`@json-edit-react/components/widgets`** — kept off the package root because they're a different mechanism from the node-definition components above.

| Widget | Use case |
|---|---|
| `ReactSelect` | Drop-in replacement for the built-in `<select>`, wrapping [`react-select`](https://react-select.com). Pass to `JsonEditor`'s `Select` prop. |
| `CodeEditor` | CodeMirror-based editor with JSON syntax highlighting. Pass to `JsonEditor`'s `TextEditor` prop to upgrade the raw-JSON text editor. Accepts an optional `theme` prop matching the built-in theme names. |
| `ReactDatePicker` | Calendar / date-time picker wrapping [`react-datepicker`](https://reactdatepicker.com). Unlike the others, it's not an editor-slot widget: pass it to a date component's `componentProps.DatePicker` (e.g. `datePickerDefinition`). Lives here because it's the same swappable-widget mechanism, and keeps `react-datepicker` opt-in. |

```tsx
import { JsonEditor } from 'json-edit-react'
import { ReactSelect, CodeEditor } from '@json-edit-react/components/widgets'

<JsonEditor data={data} setData={setData} Select={ReactSelect} TextEditor={CodeEditor} />
```

## Usage

```tsx
import { JsonEditor } from 'json-edit-react'
import { hyperlinkDefinition, datePickerDefinition } from '@json-edit-react/components'
import { ReactDatePicker } from '@json-edit-react/components/widgets'

<JsonEditor
  data={data}
  setData={setData}
  customNodeDefinitions={[
    hyperlinkDefinition(),
    datePickerDefinition({ componentProps: { DatePicker: ReactDatePicker } }),
  ]}
/>
```

See [json-edit-react's custom nodes documentation](https://github.com/CarlosNZ/json-edit-react#custom-nodes) for the definition shape and configuration options.

### `DatePicker` — a swappable picker widget

`DatePicker` renders the calendar UI from a **widget** you pass via `componentProps.DatePicker`, rather than bundling one. Import the supplied `ReactDatePicker` (above) from the `/widgets` subpath, or pass any component satisfying the exported `DatePickerWidgetProps` contract (`Date` in, `Date` out) to drop in your own picker. With no widget supplied the node falls back to editing the raw ISO string and shows a warning, so `react-datepicker` is never pulled into your bundle unless you opt in.

To configure react-datepicker specifics (`dateFormat`, `minDate`, etc.), wrap the widget:

```tsx
datePickerDefinition({
  componentProps: {
    DatePicker: (props) => <ReactDatePicker {...props} dateFormat="dd/MM/yyyy" datePickerProps={{ minDate: new Date() }} />,
  },
})
```

The read-only display defaults to the locale date/time; pass a `formatter: (date: Date) => string` in `componentProps` to customise it independently of the picker.

### `UnixTimestamp` — epoch numbers as dates

`UnixTimestamp` matches numbers in a plausible epoch window (years 1990–2100, as seconds or milliseconds) and renders them as a date, reusing the same swappable `DatePicker` widget for editing. The unit defaults to `'auto'` (detected from the value's magnitude, since the seconds and millisecond ranges don't overlap) and is preserved on commit; force it with `componentProps.unit` (`'seconds' | 'milliseconds'`).

The match is a heuristic, so targeting real timestamp fields and avoiding unrelated numbers is up to you. There are two override surfaces, and `UnixTimestamp` is the component where the difference matters most:

- **`condition`** narrows — it's ANDed with the guard, so a node matches only if it's *both* targeted *and* a plausible epoch: `unixTimestampDefinition({ condition: byKey(/(^|_)(created|updated)(At|_at)?$/i) })` (see `@json-edit-react/utils`).
- **`guard`** replaces the heuristic entirely, making your targeting the sole criterion: `unixTimestampDefinition({ guard: byKey(/(^|_)(created|updated)(At|_at)?$/i) })`.

Unlike `DatePicker` (whose guard is a safety contract — the date parser would choke on a non-ISO string), `UnixTimestamp`'s guard is *only* a heuristic: any number renders fine as a date, so there's nothing to protect and replacing it is safe. Prefer `guard` when you have many numbers that *look* like epochs but aren't, and want the key alone to decide — it also avoids the band silently rejecting a real timestamp that falls outside 1990–2100 (microsecond/nanosecond epochs, historical or far-future dates), which the ANDed `condition` would.

The read-only view defaults to `displayAs: 'number'` — the ordinary number node with a small badge (default `'UNIX'`, set via `badgeLabel`) marking it as a timestamp. Set `displayAs: 'date'` for a formatted date instead (with the same optional `formatter`). Editing uses the widget when one is passed via `componentProps.DatePicker`; with none, the standard number editor handles edits.

### `ErrorIndicator` — flag nodes with a glyph

Unlike the other components, `ErrorIndicator` has no intrinsic value type: it wraps a value (leaf) node and adds a glyph beside whichever nodes you point it at via `condition`. It pairs naturally with `useValidationState` from `@json-edit-react/utils` to mark invalid nodes.

```tsx
import { useMemo } from 'react'
import { JsonEditor } from 'json-edit-react'
import { useValidationState, ajvAdapter } from '@json-edit-react/utils'
import { errorIndicatorDefinition } from '@json-edit-react/components'

const validation = useValidationState(data, ajvAdapter(compiledValidate))
const customNodeDefinitions = useMemo(
  () => [errorIndicatorDefinition({ condition: (nd) => validation.hasErrorAt(nd.path) })],
  [validation]
)
// <JsonEditor data={data} setData={setData} customNodeDefinitions={customNodeDefinitions} />
```

Memoizing on `validation` re-renders the tree exactly when validity changes, so the marker appears/clears correctly even when an edit on one node flips the validity of a node on another branch. Options, via `componentProps`: `errorGlyph` (any `ReactNode`, default `⚠️`) and `position` (`'before' | 'after'`, default `'after'`). With no `condition` it flags nothing (its default targeting is a deliberate no-op).

It guards to value (leaf) nodes, so a `condition` that also matches a collection (e.g. an AJV `if`/`then` error reported at a parent object's path) never decorates that collection — only the leaf where the value is wrong. For collection-level marking, tint the subtree with `validationStyles({ within })` from `@json-edit-react/utils` instead.

## Tree-shaking

This package is ESM with `"sideEffects": false`. Modern bundlers (Webpack 4+, Vite, Rollup, esbuild, Parcel 2+) drop unused components and their imports from the final bundle. Heavy components (`DatePicker`, `Markdown`, `ColorPicker`, `ReactSelect`, `CodeEditor`) additionally use `React.lazy` for their third-party libraries, so even when imported they don't load those libraries until first render.

## Building your own

These components double as a reference if you want to build your own custom node — copy one as a starting point, or follow these guidelines:

- Respect the editor's editing restrictions (`allowEdit`, `allowDelete`, etc.).
- Prefix any CSS classes with `jer-`.
- Handle keyboard input where possible:
  - Double-click to edit (when editing is allowed)
  - `Tab` / `Shift-Tab` to navigate
  - `Enter` to submit
  - `Escape` to cancel
- Expose customisation options — particularly styles — with sensible defaults.
- For non-JSON data types (`BigInt`, `NaN`, `Symbol`, `Date`, etc.), supply `stringifyReplacer` / `parseReviver` functions in the definition so the value survives JSON serialisation. See the `BigInt`, `NaN`, and `Symbol` components for examples.

If your component is "string-like", core exports two helpers — `StringDisplay` and `StringEdit` — the same components used to render real string values in the editor. The [`Hyperlink`](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/src/Hyperlink/component.tsx) component shows how to compose on top of them.

Built something you think others would find useful? [Open a PR](https://github.com/CarlosNZ/json-edit-react/pulls) — contributions are welcome.

## License

MIT
