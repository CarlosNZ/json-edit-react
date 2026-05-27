---
'@json-edit-react/components': minor
'json-edit-react': major
---

Split custom components into a separate publishable package.

- New package: `@json-edit-react/components` ships 12 ready-to-use custom node components: `Hyperlink`, `EnhancedLink`, `DatePicker`, `DateObject`, `ColorPicker`, `Markdown`, `Image`, `BooleanToggle`, `BigInt`, `NaN`, `Symbol`, `Undefined`. Heavy third-party libraries (`react-datepicker`, `react-markdown`, `react-colorful`) are bundled as regular dependencies but loaded lazily at runtime via `React.lazy`, so unused components contribute zero to the consumer's bundle.
- **Breaking (json-edit-react v2)**: the old `LinkCustomComponent` and `LinkCustomNodeDefinition` are no longer exported from `json-edit-react`. Replaced by `LinkCustomComponent` + `LinkCustomNodeDefinition` (functionally a superset, with configurable `customNodeProps`) from `@json-edit-react/components`. Migration: `import { LinkCustomNodeDefinition } from '@json-edit-react/components'`.
- The `custom-component-library` workspace is now a downstream consumer of `@json-edit-react/components` — its `components/` folder moved into the new package; its app imports from `@json-edit-react/components` like any other consumer would.
