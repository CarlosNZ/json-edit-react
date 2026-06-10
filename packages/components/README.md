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

Each component ships a React component plus a `CustomNodeDefinition` ready to drop into `customNodeDefinitions`.

| Component | Use case |
|---|---|
| `Hyperlink` | Detects URL strings and renders them as clickable links |
| `EnhancedLink` | Object-shaped data with `{text, url}` rendered as a link |
| `DatePicker` | ISO date strings, edited via `react-datepicker` |
| `DateObject` | JavaScript `Date` objects |
| `ColorPicker` | Hex/RGB/HSL color strings, edited via `react-colorful` |
| `Markdown` | Markdown-formatted strings, rendered via `react-markdown` |
| `Image` | Image URLs displayed inline |
| `BooleanToggle` | Boolean values rendered as a toggle switch |
| `BigInt` | `BigInt` values |
| `NaN` | `NaN` value display |
| `Symbol` | `Symbol` value display |
| `Undefined` | `undefined` value display |

### Editor slot components

Standalone components that plug into JsonEditor's `CustomSelect` and `TextEditor` props (not into `customNodeDefinitions`).

| Component | Use case |
|---|---|
| `ReactSelect` | Drop-in replacement for the built-in `<select>`, wrapping [`react-select`](https://react-select.com). Pass to `JsonEditor`'s `CustomSelect` prop. |
| `CodeEditor` | CodeMirror-based editor with JSON syntax highlighting. Pass to `JsonEditor`'s `TextEditor` prop to upgrade the raw-JSON text editor. Accepts an optional `theme` prop matching the built-in theme names. |

## Usage

```tsx
import { JsonEditor } from 'json-edit-react'
import {
  LinkCustomNodeDefinition,
  DateTimePickerDefinition,
} from '@json-edit-react/components'

<JsonEditor
  data={data}
  setData={setData}
  customNodeDefinitions={[
    LinkCustomNodeDefinition,
    DateTimePickerDefinition,
  ]}
/>
```

See [json-edit-react's custom nodes documentation](https://github.com/CarlosNZ/json-edit-react#custom-nodes) for the definition shape and configuration options.

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
