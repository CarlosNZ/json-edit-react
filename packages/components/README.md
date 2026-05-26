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

This package is ESM with `"sideEffects": false`. Modern bundlers (Webpack 4+, Vite, Rollup, esbuild, Parcel 2+) drop unused components and their imports from the final bundle. Heavy components (`DatePicker`, `Markdown`, `ColorPicker`) additionally use `React.lazy` for their third-party libraries, so even when imported they don't load those libraries until first render.

## License

MIT
