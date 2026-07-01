# @json-edit-react/components

Ready-to-use custom node components for **[json-edit-react](https://github.com/CarlosNZ/json-edit-react)**. Fully tree-shakeable — only bundle what you use.

Almost all have zero external dependencies, and those that do are clearly marked as such below.

Check out the custom components in action in the [Custom Component Library demo page](https://carlosnz.github.io/json-edit-react-v2/?data=customComponentLibrary)

> [!IMPORTANT]
> Requires **json-edit-react** version 2.x

## Install

```sh
npm install @json-edit-react/components
# or
yarn add @json-edit-react/components
# or
pnpm add @json-edit-react/components
```

## Available components

Each component ships a React component plus a definition factory that produces a `CustomNodeDefinition` ready to drop into `customNodeDefinitions`.

| Component        | Use case                                                                                                                                                          | External deps                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `Hyperlink`      | Detects URL strings and renders them as clickable links ([details](#hyperlink--clickable-urls))                                                                   | —                                          |
| `EnhancedLink`   | Object-shaped data with `{text, url}` rendered as a link ([details](#enhancedlink--labelled-links))                                                               | —                                          |
| `DatePicker`     | ISO date strings, edited via a swappable date-picker widget passed through `componentProps.DatePicker` ([details](#datepicker--a-swappable-picker-widget))        | `react-datepicker` *(opt-in widget)*       |
| `DateObject`     | JavaScript `Date` objects ([details](#dateobject--javascript-date-values))                                                                                        | —                                          |
| `UnixTimestamp`  | Epoch numbers (seconds or milliseconds) shown as a date, edited via the same swappable picker as `DatePicker` ([details](#unixtimestamp--epoch-numbers-as-dates)) | `react-datepicker` *(opt-in widget)*       |
| `ColorPicker`    | Hex/RGB/HSL color strings, edited via `react-colorful` ([details](#colorpicker--colours-with-a-visual-picker))                                                    | `react-colorful`, `colord`, `use-debounce` |
| `Markdown`       | Markdown-formatted strings, rendered via `react-markdown` ([details](#markdown--rendered-markdown))                                                               | `react-markdown`                           |
| `Image`          | Image URLs displayed inline ([details](#image--inline-image-previews))                                                                                            | —                                          |
| `BooleanToggle`  | Boolean values rendered as a toggle switch ([details](#booleantoggle--a-one-click-switch))                                                                        | —                                          |
| `BigInt`         | `BigInt` values ([details](#bigint--very-large-integers))                                                                                                         | —                                          |
| `NaN`            | `NaN` value display ([details](#nan--the-not-a-number-value))                                                                                                     | —                                          |
| `Symbol`         | `Symbol` value display ([details](#symbol--javascript-symbols))                                                                                                   | —                                          |
| `Undefined`      | `undefined` value display ([details](#undefined--the-undefined-value))                                                                                            | —                                          |
| `ErrorIndicator` | Wraps a node with a glyph (default ⚠️) to flag the nodes you target via `condition` — e.g. validation errors ([details](#errorindicator--flag-nodes-with-a-glyph)) | —                                          |
| `AutoType`       | Edit-only text input on every value node that infers the type from what you type — `12.3` → number, `true` → boolean, `{…}`/`[…]` → object/array, otherwise a string ([details](#autotype--type-follows-the-input)) | —                                          |

### Editor slot widgets

Standalone components that plug into JsonEditor's `Select` and `TextEditor` props (not into `customNodeDefinitions`) to replace a built-in UI control. They ship under their own subpath — **`@json-edit-react/components/widgets`** — kept off the package root because they're a different mechanism from the node-definition components above.

| Widget        | Use case                                                                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReactSelect` | Drop-in replacement for the built-in `<select>`, wrapping [`react-select`](https://react-select.com). Pass to `JsonEditor`'s `Select` prop.                                                              |
| `CodeEditor`  | CodeMirror-based editor with JSON syntax highlighting. Pass to `JsonEditor`'s `TextEditor` prop to upgrade the raw-JSON text editor. Accepts an optional `theme` prop matching the built-in theme names. |

```tsx
import { JsonEditor } from 'json-edit-react'
import { ReactSelect, CodeEditor } from '@json-edit-react/components/widgets'

<JsonEditor data={data} setData={setData} Select={ReactSelect} TextEditor={CodeEditor} />
```

## Usage

```tsx
import { JsonEditor } from 'json-edit-react'
import { hyperlinkDefinition, colorPickerDefinition } from '@json-edit-react/components'

// Defined at module scope so the array keeps a stable identity (see below)
const customNodeDefinitions = [hyperlinkDefinition(), colorPickerDefinition()]

<JsonEditor
  data={data}
  setData={setData}
  customNodeDefinitions={customNodeDefinitions}
/>
```

See [**json-edit-react**'s custom nodes documentation](https://github.com/CarlosNZ/json-edit-react#custom-nodes) for the definition shape and configuration options.

## Component details

The table above is the quick reference; this is the fuller story for each one — what it's for, how to wire it up, and anything worth knowing. They all follow the same shape: call the definition factory and add the result to `customNodeDefinitions`. Tune a component through `componentProps`, and narrow *where* it applies with `condition` (which is ANDed with the component's built-in guard) — see [**json-edit-react**'s custom nodes documentation](https://github.com/CarlosNZ/json-edit-react#custom-nodes) for the full targeting model.

> [!TIP]
> One tip for all of them: give `customNodeDefinitions` a stable identity — define the array at module scope (as above), or `useMemo` it if a definition closes over component state — so the editor can keep skipping unnecessary re-renders. See [Keep non-callback props referentially stable](https://github.com/CarlosNZ/json-edit-react#keep-non-callback-props-referentially-stable) for why.

### `Hyperlink` — clickable URLs

Turns plain URL strings into links you can click, so you can explore your data without leaving the editor. It spots any `http(s)` URL, renders it as a bold underlined link that opens in a new tab, and truncates long URLs so rows stay tidy.

Because a single click should *follow* the link, editing is one step removed: Ctrl/Cmd-click to switch to the plain string editor.

```tsx
hyperlinkDefinition({
  componentProps: {
    stringTruncateLength: 40,
    linkStyles: { color: 'dodgerblue' },
  },
})
```

`stringTruncateLength` (default `80`) caps the displayed text and `linkStyles` overrides the anchor styling. The value is just a string, so nothing special happens at save time. To restrict it to particular fields, pass a `condition` — for example `byKey('website')` from `@json-edit-react/utils`.

### `EnhancedLink` — labelled links

For links where the visible text differs from the address — data shaped like `{ text, url }`. It shows a single clickable link, using `text` for the label and `url` for the destination, and expands into two labelled inputs when you edit so both stay editable in one place.

It matches objects containing both a `text` and a `url` key. If your fields are named differently, point it at them with `fieldNames`, and relabel the edit inputs with `labels`:

```tsx
enhancedLinkDefinition({
  componentProps: {
    fieldNames: { text: 'label', url: 'href' },
    labels: { text: 'Label', url: 'Destination' },
  },
})
```

It's an ordinary JSON object underneath, so it saves and loads with no special handling, and `stringTruncateLength` (default `120`) caps the displayed label. Switching this node to a plain string from the type selector collapses it to `<url> (<text>)`, and switching back restores the two fields — so round-trips don't lose anything.

### `DatePicker` — a swappable picker widget

`DatePicker` renders the calendar UI from a **widget** you pass via `componentProps.DatePicker`, rather than bundling one. Import the supplied `ReactDatePicker` from the `@json-edit-react/components/widgets` subpath, or pass any component satisfying the exported `DatePickerWidgetProps` contract (`Date` in, `Date` out) to drop in your own picker. With no widget supplied the node falls back to editing the raw ISO string and shows a warning, so `react-datepicker` is never pulled into your bundle unless you opt in.

```tsx
import { datePickerDefinition } from '@json-edit-react/components'
import { ReactDatePicker } from '@json-edit-react/components/widgets'

datePickerDefinition({ componentProps: { DatePicker: ReactDatePicker } })
```

To configure react-datepicker specifics (`dateFormat`, `minDate`, etc.), wrap the widget:

```tsx
datePickerDefinition({
  componentProps: {
    DatePicker: (props) => (
      <ReactDatePicker
        {...props}
        dateFormat="dd/MM/yyyy"
        datePickerProps={{ minDate: new Date() }}
      />
    ),
  },
})
```

The read-only display defaults to the locale date/time; pass a `formatter: (date: Date) => string` in `componentProps` to customise it independently of the picker.

### `DateObject` — JavaScript Date values

When your data holds real JavaScript `Date` objects (rather than ISO strings), this renders them as a friendly localised date and lets you edit them in place. It matches any `Date` instance; on edit you type an ISO string (or a plain date when `showTime` is off), and an entry that doesn't parse is rejected with an error rather than silently saved.

```tsx
dateObjectDefinition({ componentProps: { showTime: false } })
```

**Saving to JSON:** a `Date` isn't a JSON type — `JSON.stringify` turns it into an ISO string automatically. So the definition ships a `parseReviver` that turns ISO-looking strings back into `Date` objects on load, letting a save-then-reload round-trip. (There's no `stringifyReplacer`: the `Date` is already a string by the time one would run.)

**One caveat:** don't combine `DateObject` with an ISO-string matcher like `DatePicker` in the same editor. Once a `Date` is serialised to an ISO string there's no way to tell the two apart when reloading, so pick one or the other for your date-shaped data.

### `UnixTimestamp` — epoch numbers as dates

`UnixTimestamp` matches numbers in a plausible epoch window (years 1990–2100, as seconds or milliseconds) and renders them as a date, reusing the same swappable `DatePicker` widget for editing. The unit defaults to `'auto'` (detected from the value's magnitude, since the seconds and millisecond ranges don't overlap) and is preserved on commit; force it with `componentProps.unit` (`'seconds' | 'milliseconds'`).

The match is a heuristic, so targeting real timestamp fields and avoiding unrelated numbers is up to you. There are two override surfaces, and `UnixTimestamp` is the component where the difference matters most:

- **`condition`** narrows — it's ANDed with the guard, so a node matches only if it's *both* targeted *and* a plausible epoch: `unixTimestampDefinition({ condition: byKey(/(^|_)(created|updated)(At|_at)?$/i) })` (see `@json-edit-react/utils`).
- **`guard`** replaces the heuristic entirely, making your targeting the sole criterion: `unixTimestampDefinition({ guard: byKey(/(^|_)(created|updated)(At|_at)?$/i) })`.

Unlike `DatePicker` (whose guard is a safety contract — the date parser would choke on a non-ISO string), `UnixTimestamp`'s guard is *only* a heuristic: any number renders fine as a date, so there's nothing to protect and replacing it is safe. Prefer `guard` when you have many numbers that *look* like epochs but aren't, and want the key alone to decide — it also avoids the band silently rejecting a real timestamp that falls outside 1990–2100 (microsecond/nanosecond epochs, historical or far-future dates), which the ANDed `condition` would.

The read-only view defaults to `displayAs: 'number'` — the ordinary number node with a small badge (default `'UNIX'`, set via `badgeLabel`) marking it as a timestamp. Set `displayAs: 'date'` for a formatted date instead (with the same optional `formatter`). Editing uses the widget when one is passed via `componentProps.DatePicker`; with none, the standard number editor handles edits.

### `ColorPicker` — colours with a visual picker

Shows colour strings with a small swatch, and on edit pops open a visual colour picker so you (or your users) can dial in a colour instead of guessing hex codes. It recognises named colours, hex, RGB and HSL, and keeps whichever format the value already uses when you pick a new colour.

```tsx
colorPickerDefinition({ componentProps: { alpha: true } })
```

Set `alpha: true` to add an opacity slider. By default `keepAsColor` is on, so submitting text that isn't a valid colour shows an error and keeps the editor open; turn it off to allow free-form text. The value stays a plain string, so there's nothing special to serialise. The picker library is lazy-loaded — only fetched the first time someone opens the editor.

### `Markdown` — rendered Markdown

Renders Markdown-formatted strings as formatted text — headings, emphasis, lists, links and so on — so notes and descriptions read naturally instead of showing raw markup. It's display-only: double-click (or Ctrl/Cmd-click) to drop back to the plain text editor and tweak the source.

Because it matches *every* string by default, you'll almost always want to narrow it to the fields that actually hold Markdown — otherwise it tries to render all of your strings:

```tsx
import { byKey } from '@json-edit-react/utils'

markdownDefinition({ condition: byKey('description') })
```

`MarkdownCustomProps` extends [react-markdown](https://github.com/remarkjs/react-markdown)'s own options, so you can pass `remarkPlugins`, custom `components`, and the like straight through `componentProps`. The value is a plain string, so there's no special serialisation. (react-markdown is lazy-loaded, and non-string values are coerced to text so a stray type-switch can't crash the render.)

### `Image` — inline image previews

Spots image URLs and shows a thumbnail right in the editor, wrapped in a link to the full-size image. It matches `http(s)` URLs ending in a common image extension (`jpg`, `jpeg`, `png`, `svg`, `gif`).

```tsx
imageDefinition({
  componentProps: { imageStyles: { maxWidth: 120 }, altText: 'Preview' },
})
```

`imageStyles` controls the thumbnail (default max 200×200) and `altText` sets the alt text (defaulting to the URL). It's display-only — editing falls back to the standard string editor — and the value is just a string, so nothing special happens on save.

### `BooleanToggle` — a one-click switch

Replaces the default true/false editor with a checkbox you can flip in a single click — no entering and confirming an edit. It matches any boolean, and toggling commits the new value immediately. It respects the editor's permissions, so the checkbox is disabled wherever editing isn't allowed.

```tsx
booleanToggleDefinition()
```

Booleans are first-class JSON, so there's nothing special to serialise.

### `BigInt` — very large integers

Lets you hold and edit integers beyond JavaScript's safe range (larger than `Number.MAX_SAFE_INTEGER`, around 9 quadrillion). It matches `bigint` values, edits as a plain digit string, and rejects anything that isn't a whole number (`1.5`, `abc`, `1e3`) with an error.

```tsx
bigIntDefinition()
```

**Saving to JSON:** `BigInt` isn't valid JSON — `JSON.stringify` actually *throws* on one. So the definition ships a `stringifyReplacer` that stores it as `{ "__type": "bigint", "value": "<digits>" }` and a matching `parseReviver` that restores the `BigInt` on load. These are built in, so round-tripping just works — but if you serialise the data yourself, reuse the same replacer/reviver pair.

### `NaN` — the not-a-number value

Displays and preserves the special `NaN` value, which would otherwise be awkward to represent. It matches `NaN`, shows it in red, and lets you switch a value *to* `NaN` from the type selector.

```tsx
nanDefinition()
```

**Saving to JSON:** JSON has no `NaN` — `JSON.stringify` quietly turns it into `null`. To prevent that, the definition stores it as `{ "__type": "NaN", "value": "NaN" }` via a `stringifyReplacer` and restores it with a `parseReviver`, so the value survives a save-and-reload intact.

### `Symbol` — JavaScript symbols

Displays JavaScript `Symbol` values as `Symbol("description")` and lets you edit the description inline. It matches any `symbol` value.

```tsx
symbolDefinition()
```

**Saving to JSON:** symbols aren't JSON values, so the definition stores one as `{ "__type": "Symbol", "value": "<description>" }` with a `stringifyReplacer`, and a `parseReviver` rebuilds it on load. Worth knowing: symbols are unique by identity, so a reloaded symbol is a *new* `Symbol` with the same description — the description round-trips, but the original identity can't.

### `Undefined` — the undefined value

Gives `undefined` a visible representation — shown in italic grey — so it isn't simply invisible in your data. It matches `value === undefined`, and lets you switch a value to `undefined` from the type selector.

```tsx
undefinedDefinition()
```

**Saving to JSON:** `undefined` is the one non-JSON type here *without* a replacer/reviver pair. Unlike `BigInt`, `NaN` or `Symbol`, it can't be wrapped in a stand-in object — `JSON.stringify` drops `undefined` properties entirely — so the editor handles it internally for display and editing. Just be aware that serialising to real JSON omits genuinely-`undefined` entries, which is standard JavaScript behaviour.

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

### `AutoType` — type follows the input

An edit-only node that replaces the Type selector with a single plain text input and infers the value's type from what you type. `12.3` becomes a number, `true`/`false` a boolean, `null` the null value, `{"a":1}` or `[1,2,3]` an object or array, and anything that doesn't parse stays a string. It applies to every value (non-collection) node.

[![▶ Live example: Auto-type](https://img.shields.io/badge/▶_Live_example-Auto--type-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/auto-type)

```tsx
autoTypeDefinition()
```

Pair it with `allowTypeSelection={false}` on the editor: the typed text already chooses the type, so the dropdown is redundant.

The text is read with `JSON.parse` by default. Pass a more lenient parser via `componentProps.jsonParse` — for example [`JSON5`](https://json5.org)'s `parse`, the same function you'd give `<JsonEditor jsonParse={…} />` — to accept unquoted keys, single quotes and trailing commas:

```tsx
autoTypeDefinition({ componentProps: { jsonParse: JSON5.parse } })
```

A string that merely *looks* like another type (the string `"12.3"`) is shown without quotes, but it only re-types if you actually change it — opening and confirming an untouched value leaves it exactly as it was, so a stringy number won't silently become a real one. The one thing auto-typing can't round-trip is a string whose content is itself quoted (`"\"quoted\""`): editing it parses the quotes away. Collections aren't matched — they keep their built-in "Edit as JSON" editor — so the conversion still works both ways: type `{…}` into a leaf to grow a collection, or edit a collection's JSON down to a primitive.

**Saving to JSON:** every value it produces is already standard JSON, so there's nothing special to serialise.

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
