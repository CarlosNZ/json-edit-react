# CLAUDE.md — @json-edit-react/components

Guidance for Claude Code when working in this sub-package.

## What this is

A published package of pre-built custom node components for [`json-edit-react`](https://github.com/CarlosNZ/json-edit-react). Each component is a React component + a `CustomNodeDefinition` that the consumer drops into the editor's `customNodeDefinitions` prop.

## Public API

Re-exported from [src/index.ts](src/index.ts). Each component lives in its own folder under `src/` with the structure `{component.tsx, definition.ts, index.ts}` (plus `style.css` for some).

**Exception — the swappable widgets ship under their own subpath**, `@json-edit-react/components/widgets` (`src/widgets/`), and are deliberately NOT re-exported from the root. They are a different *kind* of thing from the node-definition components — they have no `definition.ts`, they satisfy a props contract and get *passed in* to be rendered, rather than registering as a node type. Two flavours live here:

- **Editor-slot widgets** (`ReactSelect`, `CodeEditor`) satisfy a core contract (`SelectProps`, `TextEditorProps`) and get passed to JsonEditor's top-level `Select` / `TextEditor` props to replace a built-in UI control.
- **Node-component widgets** (`ReactDatePicker`) satisfy a contract defined *in this package* (`DatePickerWidgetProps`, in `_common/`, re-exported from the root) and get passed to a node component via `componentProps` (e.g. `datePickerDefinition({ componentProps: { DatePicker: ReactDatePicker } })`). This keeps a heavy picker dep opt-in and lets a consumer drop in their own picker — the `DatePicker` node falls back to a `StringEdit` + warning when none is supplied. The contract is value-agnostic (`Date` in / `Date` out), so a single widget can serve any future date-shaped node type.

Splitting them out keeps the root barrel uniformly node-definition components. This is purely a **conceptual** grouping — NOT a tree-shaking measure (the widgets' heavy libs are already `React.lazy`-loaded and the wrapper code is tiny); don't conflate it with the bundle-bloat escape hatch below. The wiring lives in the same three places as a future sub-path group: `package.json` `exports` (+ a `typesVersions` fallback for classic `moduleResolution: node`), a second `jsBundle`/`dtsBundle` pair in [rollup.config.mjs](rollup.config.mjs), and the demo's Vite alias (`componentsWidgetsSrcMap`).

## Conventions

### Third-party deps strategy: Option B+

- All third-party libs (`react-datepicker`, `react-markdown`, `react-colorful`, `colord`, `use-debounce`) are **regular `dependencies`**, not optional peers.
  - Consumers install the package once and get everything that comes with it — no per-component "you must also install X" friction.
- The package ships ESM + CJS with `"sideEffects": false`, so modern bundlers (Webpack 4+, Vite, Rollup, esbuild, Parcel 2+) tree-shake unused components out of the consumer's bundle.
- **Heavy components use `React.lazy(() => import('...'))`** for their third-party dep — `DatePicker`, `ColorPicker`, `Markdown`. This means even when a consumer imports the component, the heavy library only loads at the moment the component is first rendered. The component's chunk lives in `node_modules` (install cost) but contributes nothing to the initial JS bundle (runtime cost).
- **`react` and `json-edit-react` are peer dependencies.** Consumers supply them.

### Future escape hatch: sub-path exports

If legacy CJS consumers report bundle bloat (their bundler doesn't tree-shake ESM properly), the planned migration is:

1. Add per-component sub-path exports in [package.json](package.json) `exports`:
   ```json
   "./hyperlink": { "import": "./build/hyperlink.esm.js", "require": "./build/hyperlink.cjs.js" },
   "./datepicker": { ... },
   ...
   ```
2. Update [rollup.config.mjs](rollup.config.mjs) to a multi-entry build with one entry per component.
3. **Non-breaking** — the root `.` entry stays, so existing `import { Hyperlink } from '@json-edit-react/components'` keeps working.

This isn't worth doing pre-emptively. Wait for a real consumer report. See `package-management-guide.md` in the repo root for the bundle-size test scaffolding plan.

### What NOT to do

- Don't add `peerDependenciesMeta` with `optional: true` for the heavy libs — we deliberately chose regular deps for ergonomics.
- Don't bundle the third-party deps into the output — they stay external. The `external` list in rollup.config.mjs is the source of truth for this.
- Don't promote components' helpers (`Loading`, etc.) to the package's public API unless a consumer asks. Keep the surface small.

## Build

```sh
pnpm --filter @json-edit-react/components build
```

Output: `build/index.cjs.js`, `build/index.esm.js`, `build/index.d.ts`.

## Adding a new component

1. Create `src/MyComponent/{component.tsx, definition.ts, index.ts}` (mirror existing folders).
2. Add `export * from './MyComponent'` to [src/index.ts](src/index.ts).
3. If the component imports a heavy third-party lib, add it as a regular dep in [package.json](package.json) and lazy-load it via `React.lazy`. Add the package name to the rollup `external` list.
4. Document the new component in [README.md](README.md)'s "Available components" table.
5. Add a changeset: `pnpm changeset` at the repo root, pick `@json-edit-react/components`, minor bump.

## Relationship to core

Components import the following from `json-edit-react`:

- Types: `CustomComponentProps`, `CustomNodeDefinition`, `ValueNodeProps`, `NodeData`, `JsonData` etc. (compile-time only, erased at build)
- Runtime primitives: `StringDisplay`, `StringEdit`, `toPathString`, `AutogrowTextArea` — these were promoted to public API in core v2 specifically so this package can compose on top of them.

The core peer-dep range is `workspace:^` during dev; at publish, Changesets/pnpm rewrites it to the actual semver.
