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
- The package ships ESM + CJS with `"sideEffects": false`, and the build stamps `/*#__PURE__*/` annotations (see Build) so modern bundlers (Webpack 4+, Vite, Rollup, esbuild, Parcel 2+) tree-shake unused components out of the consumer's bundle. `sideEffects: false` alone is **not** enough here: the whole package bundles into one ESM file, so a flag that governs dropping whole *modules* can't drop unused components *within* that one file — only the per-call purity annotations can (issue #388).
- **Heavy components use `React.lazy(() => import('...'))`** for their third-party dep — `DatePicker`, `ColorPicker`, `Markdown`. This means even when a consumer imports the component, the heavy library only loads at the moment the component is first rendered. The component's chunk lives in `node_modules` (install cost) but contributes nothing to the initial JS bundle (runtime cost).
- **`react` and `json-edit-react` are peer dependencies.** Consumers supply them.

### Future escape hatch: sub-path exports

The root barrel now tree-shakes per component via the `/*#__PURE__*/` annotations (issue #388), so a selective `import { hyperlinkDefinition } from '@json-edit-react/components'` no longer pulls the other components or their heavy deps. Sub-path exports remain a possible future escape hatch — e.g. for legacy CJS consumers whose bundler can't tree-shake ESM, or to drop the few exotic-type definitions that still ride along until their eager `defaultValue` calls are de-eagered (see "Adding a new component"). The planned migration if it's ever needed:

1. Add per-component sub-path exports in [package.json](package.json) `exports`:
   ```json
   "./hyperlink": { "import": "./build/hyperlink.esm.js", "require": "./build/hyperlink.cjs.js" },
   "./datepicker": { ... },
   ...
   ```
2. Update [rollup.config.mjs](rollup.config.mjs) to a multi-entry build with one entry per component.
3. **Non-breaking** — the root `.` entry stays, so existing `import { Hyperlink } from '@json-edit-react/components'` keeps working.

This isn't worth doing pre-emptively. Wait for a real consumer report. See `dev-docs/package-management-guide.md` for the bundle-size test scaffolding plan.

### What NOT to do

- Don't add `peerDependenciesMeta` with `optional: true` for the heavy libs — we deliberately chose regular deps for ergonomics.
- Don't bundle the third-party deps into the output — they stay external. The `external` list in rollup.config.mjs is the source of truth for this.
- Don't promote components' helpers (`Loading`, etc.) to the package's public API unless a consumer asks. Keep the surface small.

## Build

```sh
pnpm --filter @json-edit-react/components build
```

Output: `build/index.cjs.js`, `build/index.esm.js`, `build/index.d.ts`.

### Tree-shaking (issue #388)

The whole package bundles into one ESM file, so per-component tree-shaking depends on the consumer's bundler proving each unused component's top-level calls are side-effect-free. The rollup config's `pureAnnotations` plugin stamps `/*#__PURE__*/` onto every such call — `jsx`/`jsxs` (markup), `lazy` (heavy-dep loaders), and our internal `createDefinitionFactory` (definitions) — running before terser, which is set to `preserve_annotations` so they survive into the shipped ESM. Without them, importing one definition drags in every component and its deps (~6 kB → ~160 kB).

[scripts/verify-treeshake.mjs](scripts/verify-treeshake.mjs) runs after the build (and at `prepack`): it esbuild-bundles a single `import { hyperlinkDefinition }` against the shipped ESM with deps bundled and fails if the result balloons past ~20 kB or reaches a heavy dep. It uses **esbuild, not rollup** — rollup analyses our local `createDefinitionFactory` for purity on its own and would shake the definitions even with the annotations broken, hiding a regression; esbuild (like webpack and most consumer bundlers) relies on the annotations, so it actually catches it.

## Adding a new component

1. Create `src/MyComponent/{component.tsx, definition.ts, index.ts}` (mirror existing folders).
2. Add `export * from './MyComponent'` to [src/index.ts](src/index.ts).
3. If the component imports a heavy third-party lib, add it as a regular dep in [package.json](package.json) and lazy-load it via `React.lazy`. Add the package name to the rollup `external` list.
4. Document the new component in [README.md](README.md)'s "Available components" table.
5. Add a `CHANGELOG.md` entry for the new component (releases are manual, ship-as-you-go — see [dev-docs/package-management-guide.md](../../dev-docs/package-management-guide.md#quick-reference)).
6. Keep it tree-shakeable (see Build): no **module-level side effects** (register plugins/etc. lazily on first render, as ColorPicker does with colord — not at module top level), and no **eager calls in the definition's fields** (`defaultValue: BigInt(…)` / `new Date()` pin the definition even when unused, since `/*#__PURE__*/` only covers the `createDefinitionFactory` call, not calls nested in its argument). The `verify-treeshake` step catches the heavy-dep cases; the eager-`defaultValue` ones are the residue tracked in #388.

## Relationship to core

Components import the following from `json-edit-react`:

- Types: `CustomComponentProps`, `CustomNodeDefinition`, `ValueNodeProps`, `NodeData`, `JsonData` etc. (compile-time only, erased at build)
- Runtime primitives: `StringDisplay`, `StringEdit`, `toPathString`, `AutogrowTextArea` — these were promoted to public API in core v2 specifically so this package can compose on top of them.

The core peer-dep range is `workspace:^` during dev; at publish, pnpm freezes it to `^<core's current version>`.
