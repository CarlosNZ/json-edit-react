# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

`json-edit-react` is a published React component library (`JsonEditor`) for inline editing/viewing of JSON / object data. The published package is intentionally **self-contained**: plain HTML/CSS, no UI framework dependencies, no runtime dependencies, and React as a peer dependency (`>=16.0.0`).

A high-level architectural overview is maintained at https://deepwiki.com/CarlosNZ/json-edit-react and the full user-facing API is documented in [README.md](README.md).

## Repository layout

This repo is a multi-package workspace with **independent installs** (no root workspaces config — each subpackage has its own `node_modules` and `yarn.lock`):

- [src/](src/) — the published library (entry: [src/index.ts](src/index.ts))
- [demo/](demo/) — Vite app deployed to https://carlosnz.github.io/json-edit-react. Doubles as the dev environment for the library.
- [custom-component-library/](custom-component-library/) — separate Vite app showcasing how third parties build custom node components.
- [test/](test/) — Jest tests (currently minimal: [test/nextPrevious.test.ts](test/nextPrevious.test.ts)).
- [scripts/](scripts/) — Python + Node helpers for the publish flow (README rewriting, build cleanup, post-publish version check).
- [json-schema-tools/](json-schema-tools/) — auxiliary tooling, not part of the package.
- [build/](build/) — Rollup output. The **only** thing shipped to npm (`"files": ["build/**/*"]`).

### Key files in [src/](src/)

| File | Role |
| --- | --- |
| [JsonEditor.tsx](src/JsonEditor.tsx) | Top-level component, the main export |
| [CollectionNode.tsx](src/CollectionNode.tsx) | Renders objects/arrays (recursive) |
| [ValueNodeWrapper.tsx](src/ValueNodeWrapper.tsx) + [ValueNodes.tsx](src/ValueNodes.tsx) | Leaf value rendering + per-type editors |
| [CustomNode.ts](src/CustomNode.ts) + [customComponents/](src/customComponents/) | Custom-node infrastructure and built-in `LinkCustomComponent` |
| [contexts/](src/contexts/) | `ThemeProvider`, `TreeStateProvider` |
| [hooks/](src/hooks/) | `useData`, `useCommon`, `useTriggers`, `useDragNDrop`, `useCollapseTransition` |
| [helpers.ts](src/helpers.ts) | `matchNode`, `matchNodeKey`, `isCollection`, `toPathString`, `getNextOrPrevious`, etc. |
| [types.ts](src/types.ts) | `JsonEditorProps` and all exported types |
| [localisation.ts](src/localisation.ts) | UI strings and `TranslateFunction` |
| [Icons.tsx](src/Icons.tsx), [ButtonPanels.tsx](src/ButtonPanels.tsx), [KeyDisplay.tsx](src/KeyDisplay.tsx), [AutogrowTextArea.tsx](src/AutogrowTextArea.tsx) | UI building blocks |
| [additionalThemes/](src/additionalThemes/) | Built-in themes (`githubDarkTheme`, `monoLightTheme`, etc.) — imported separately by consumers since v1.19.0 for tree-shaking |
| [style.css](src/style.css) | Bundled CSS (inlined by `rollup-plugin-styles`) |

## Common commands

Run from the repo root (uses Yarn):

```sh
yarn setup            # install root + demo deps
yarn dev              # run the demo against src/ live (VITE_JRE_SOURCE=local)
yarn demo             # run the demo against the npm-installed version
yarn demo:package     # build the library and run the demo against the packaged build
yarn test             # jest
yarn lint             # eslint (also runs as prebuild)
yarn compile          # tsc --noEmit && ts-prune (dead-export check)
yarn build            # rollup → build/
yarn release          # yarn publish — DON'T run unless explicitly asked
```

The demo can resolve `json-edit-react` from three places via `VITE_JRE_SOURCE` (`local` | `build` | `npm`). See [demo/vite.config.ts](demo/vite.config.ts). When iterating on library changes, use `yarn dev` so edits in [src/](src/) are picked up by Vite immediately.

## Conventions and gotchas

### Public API surface
- Everything consumers can import is re-exported from [src/index.ts](src/index.ts). Treat changes there as semver-significant — renaming or removing exports breaks downstream users.
- Adding a new prop generally requires updates in three places: the type in [types.ts](src/types.ts) (`JsonEditorProps`), the implementation/threading in [JsonEditor.tsx](src/JsonEditor.tsx) (and downward through contexts/hooks as needed), and the props reference table in [README.md](README.md).

### State model
- The recommended pattern is for consumers to own `data` state and pass `setData`. The `onUpdate` family is for side effects / validation / mutation, **not** for state ownership. Don't suggest using `onUpdate` to update external state — the README explicitly steers users away from that.

### Themes
- Since v1.19.0, built-in themes are exported from [additionalThemes/](src/additionalThemes/) and must be imported and passed in by the consumer (no string-name lookup). This is for tree-shaking — preserve that pattern.

### React compatibility
- Peer dep is `react >=16.0.0`. The ESLint config enforces `react/react-in-jsx-scope: error` — keep `import React from 'react'` (or the JSX namespace) available where needed. Don't rely on React 17+ JSX transform behaviour in library code.

### Dependencies
- The core library has **zero** runtime deps. Don't add any without a strong reason — the "no external UI library" promise is part of the product. UI-rich features (CodeMirror, Chakra, AJV, Firebase) belong in the demo, not in `src/`.
- Anything imported only by the demo must not be reachable from `src/`.

### Build
- Rollup config is at [rollup.config.mjs](rollup.config.mjs). It produces CJS, ESM, and a flattened `.d.ts` (the intermediate `build/dts/` is deleted by `postbuild`). CSS is minimized and inlined.
- Only [build/](build/) ships. `tsconfig.json` deliberately sets `"files": ["src/index.ts"]` so rollup's TS plugin walks the dependency graph from the entry rather than typechecking the whole tree at build time. Use `yarn compile` for a full project-wide typecheck.

### Linting / formatting
- ESLint flat config at [eslint.config.mjs](eslint.config.mjs); the `demo/` and `custom-component-library/` directories are ignored from the root lint and have their own configs.
- Prettier: no semicolons, single quotes, 100 col, `trailingComma: es5`, 2-space indent ([.prettierrc](.prettierrc)).

### Tests
- Jest with the `ts-jest` preset; config at [jest.config.mjs](jest.config.mjs). Tests live in [test/](test/) and import from [src/](src/) directly.
- `modulePathIgnorePatterns` excludes [build/](build/), `build_package/`, and [demo/](demo/) so the demo's bundled snapshot of the package doesn't trigger a haste-map name collision.

### Publishing
- `prepublishOnly` runs `yarn build`, then [scripts/build_npm_readme.py](scripts/build_npm_readme.py) and [scripts/use_npm_readme.py](scripts/use_npm_readme.py) which swap the GitHub README for a slimmer npm one (assembled from the `<!-- NPM INTRO -->` / `<!-- NPM USAGE -->` blocks in [README.md](README.md)). `postpublish` restores the original README. If you edit those marker blocks, you're editing what shows up on npm.
- Never run `yarn release` / `yarn publish` unless the user explicitly asks.

### Demo deploy
- `yarn release-demo` runs `gh-pages -d build` from [demo/](demo/) and updates the live demo. Treat it the same as publish — don't run without an explicit ask.

## Working with the user

The repo owner is the package author. When in doubt about API shape, tree-shaking implications, or whether something belongs in core vs. the demo, ask rather than guessing — the "stay minimal" stance is a deliberate product decision.
