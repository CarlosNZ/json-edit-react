# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

`json-edit-react` is a published React component library (`JsonEditor`) for inline editing/viewing of JSON / object data. The core package is intentionally **self-contained**: plain HTML/CSS, no UI framework dependencies, no runtime dependencies, and React as a peer dependency (`>=18.0.0`).

Three companion packages ship optional extras:

- `@json-edit-react/themes` — pre-built themes (peer-deps on core, no runtime deps)
- `@json-edit-react/components` — pre-built custom node components (peer-deps on core, regular deps on lazy-loaded third-party libs like `react-datepicker`)
- `@json-edit-react/utils` — utility hooks and helpers (peer-deps on core, default zero runtime deps). Ships `useConfirmOnUpdate` and `useUndo`; more helpers planned for the v2 release. See [packages/utils/CLAUDE.md](packages/utils/CLAUDE.md) and issues #307 / #285 / #319.

All publish independently to npm with their own versions.

A high-level architectural overview is maintained at https://deepwiki.com/CarlosNZ/json-edit-react and the full user-facing API is documented in [README.md](README.md). Toolchain commands and release flow are in [package-management-guide.md](dev-docs/package-management-guide.md). v1 → v2 migration notes for consumers are in [migration-guide.md](migration-guide.md).

## Repository layout

This is a **pnpm workspace** (root, plus `packages/*`). [demo/](demo/) is intentionally **outside the workspace** as an independent yarn-1 install — a validation harness that consumes the published artefacts at arm's length.

- [src/](src/) — the core published library (entry: [src/index.ts](src/index.ts))
- [packages/themes/](packages/themes/) — `@json-edit-react/themes`
- [packages/components/](packages/components/) — `@json-edit-react/components`
- [packages/utils/](packages/utils/) — `@json-edit-react/utils` (utility hooks + helpers; ships `useConfirmOnUpdate` + `useUndo`, more landing for v2)
- [demo/](demo/) — Vite app deployed to https://carlosnz.github.io/json-edit-react. Independent yarn project. Doubles as the dev environment for all three packages via the `VITE_JRE_SOURCE` toggle, and showcases how third parties consume `@json-edit-react/components` (the `customComponentLibrary` data set).
- [test/](test/) — Jest tests for core.
- [scripts/](scripts/) — Python + Node helpers for the publish + build flow (core only — README rewriting, staging, packing, the test step for `prebuild`).
- [json-schema-tools/](json-schema-tools/) — auxiliary tooling, not part of the package.
- [build/](build/) — Rollup output for core. The only core artefact shipped to npm. Each sub-package has its own `packages/<name>/build/`.
- [dev-docs/](dev-docs/) — internal development docs: not shipped, not user-facing. The toolchain + release reference ([dev-docs/package-management-guide.md](dev-docs/package-management-guide.md) — quick-reference playbooks on top, detailed reference below), performance architecture + measurement ([dev-docs/PERF-ARCHITECTURE.md](dev-docs/PERF-ARCHITECTURE.md), [dev-docs/PERF-MEASUREMENT.md](dev-docs/PERF-MEASUREMENT.md) for the manual in-browser procedure, [dev-docs/PERF-BENCH.md](dev-docs/PERF-BENCH.md) for the headless `pnpm bench` suite), and editing-model design notes ([dev-docs/EditingModel-new.md](dev-docs/EditingModel-new.md), temporary — fold in and delete when the model lands). Keep these current as the code evolves.

The workspace boundary is configured in [pnpm-workspace.yaml](pnpm-workspace.yaml). Each sub-package has its own [CLAUDE.md](packages/themes/CLAUDE.md) with package-specific guidance.

### Key files in core ([src/](src/))

| File | Role |
| --- | --- |
| [JsonEditor.tsx](src/JsonEditor.tsx) | Top-level component, the main export |
| [CollectionNode.tsx](src/CollectionNode.tsx) | Renders objects/arrays (recursive) |
| [ValueNodeWrapper.tsx](src/ValueNodeWrapper.tsx) + [ValueNodes.tsx](src/ValueNodes.tsx) | Leaf value rendering + per-type editors. `StringDisplay` and `StringEdit` here are part of the **public API** — `@json-edit-react/components` composes on top of them. |
| [CustomNode.ts](src/CustomNode.ts) | Custom-node type infrastructure. The built-in `LinkCustomComponent` was moved to `@json-edit-react/components` in v2. |
| [contexts/](src/contexts/) | `ThemeProvider`, `EditingProvider`, `CollapseProvider`, and a thin composing `TreeStateProvider`. Each slice exposes its own hook (`useEditing`, `useCollapse`); consumers import only what they use. |
| [hooks/](src/hooks/) | `useCommon`, `useTriggers`, `useDragNDrop`, `useCollapseTransition`, plus `DragSourceProvider` (the third tree-state slice — lives here next to its sole consumer `useDragNDrop`). |
| [helpers.ts](src/helpers.ts) | `matchNode`, `matchNodeKey`, `isCollection`, `toPathString`, `getNextOrPrevious`, etc. |
| [types.ts](src/types.ts) | `JsonEditorProps` and all exported types |
| [localisation.ts](src/localisation.ts) | UI strings and `TranslateFunction` |
| [Icons.tsx](src/Icons.tsx), [ButtonPanels.tsx](src/ButtonPanels.tsx), [KeyDisplay.tsx](src/KeyDisplay.tsx), [AutogrowTextArea.tsx](src/AutogrowTextArea.tsx) | UI building blocks. `AutogrowTextArea` is part of the public API (added in v2). |
| [style.css](src/style.css) | Bundled CSS (inlined by `rollup-plugin-styles`) |

Themes are no longer in core — see [packages/themes/](packages/themes/).

## Common commands

Run from the repo root (uses pnpm). See [package-management-guide.md](dev-docs/package-management-guide.md) for the full cheat sheet.

```sh
pnpm install          # install root + all workspace packages
pnpm setup            # install root + demo (chains pnpm install && cd demo && yarn install)
pnpm dev              # run the demo against local src (VITE_JRE_SOURCE=local)
pnpm demo             # run the demo against the npm-installed version
pnpm demo:pack        # pack all three packages and run the demo against the tarballs (VITE_JRE_SOURCE=pack)
pnpm pack-all         # produce pack-output/<name>/package/ — consumed by demo :pack scripts
pnpm test             # jest
pnpm lint             # eslint
pnpm compile          # tsc --noEmit && ts-prune (dead-export check)
pnpm build            # rollup → build/ (core only); prebuild runs lint + tests
SKIP_TESTS=1 pnpm build  # build, skipping tests (lint still runs)
pnpm -r build         # build all three packages
pnpm run versions     # one-glance: local (next publish) vs what's on npm, all four packages
pnpm bump:core:beta   # bump + commit + tag core's beta (v2.0.0-beta.4); bump:<sub>:beta tags scoped. Needs a clean tree
pnpm pub:core:beta    # build + stage + publish core to the `beta` tag — DON'T run unless explicitly asked
pnpm pub:themes       # publish a sub-package to `latest` (pub:utils / pub:components) — DON'T run unless asked
```

The demo can resolve `json-edit-react`, `@json-edit-react/themes`, and `@json-edit-react/components` from four places via `VITE_JRE_SOURCE` (`local` | `build` | `pack` | `npm`). See [demo/vite.config.ts](demo/vite.config.ts), with the full table in [package-management-guide.md](dev-docs/package-management-guide.md). When iterating on library changes, use `VITE_JRE_SOURCE=local` (e.g. `pnpm dev`) so edits in [src/](src/) or `packages/*/src/` are picked up by Vite immediately. Use `pack` (via `pnpm pack-all`) as the pre-publish dress rehearsal.

## Conventions and gotchas

### Public API surface
- Everything consumers can import from core is re-exported from [src/index.ts](src/index.ts). Same for `packages/themes/src/index.ts` and `packages/components/src/index.ts`. Treat changes there as semver-significant — renaming or removing exports breaks downstream users.
- Adding a new core prop generally requires updates in three places: the type in [types.ts](src/types.ts) (`JsonEditorProps`), the implementation/threading in [JsonEditor.tsx](src/JsonEditor.tsx) (and downward through contexts/hooks as needed), and the props reference table in [README.md](README.md).
- The README is **present-tense only** — never say "in v1 this used to be...". All "what changed" content lives in [migration-guide.md](migration-guide.md) and grows incrementally.

### State model
- The recommended pattern is for consumers to own `data` state and pass `setData`. The `onUpdate` family is for side effects / validation / mutation, **not** for state ownership. Don't suggest using `onUpdate` to update external state — the README explicitly steers users away from that.

### Performance / re-rendering (§16)
- Before changing the render path — `CollectionNode`, `ValueNodeWrapper`, `useCommon`, the editing store, the `React.memo` comparator ([memoNode.ts](src/utils/memoNode.ts)), or any node prop — read [dev-docs/PERF-ARCHITECTURE.md](dev-docs/PERF-ARCHITECTURE.md). It states the invariants that keep fine-grained re-rendering correct: referential stability of every node prop, per-node primitive editing selectors, and the rule "subscribe for what a node renders; read live for what an event handler does — never from a frozen closure or a memoizable prop." Most regressions here are staleness bugs that break one of those.

### Themes
- Pre-built themes ship in [`@json-edit-react/themes`](packages/themes/). Core exports only `defaultTheme` (the implicit baseline) and the `Theme` / `ThemeInput` types.
- The themes package has no runtime deps — it imports only the `Theme` type from core (erased at build).

### Custom components
- Pre-built custom node components ship in [`@json-edit-react/components`](packages/components/). 12 components, each in its own folder with `component.tsx + definition.ts + index.ts`.
- Heavy components (`DatePicker`, `Markdown`, `ColorPicker`) use `React.lazy` for their third-party libs so the bundled cost is deferred to first render.
- Single ESM entry with `sideEffects: false` (Option B+). Sub-path exports are documented as the escape hatch if legacy CJS consumers report bundle bloat — see [packages/components/CLAUDE.md](packages/components/CLAUDE.md).

### React compatibility
- Peer dep is `react >=18.0.0`, and the codebase targets the automatic JSX runtime (tsconfig `jsx: react-jsx`). JSX does **not** need `import React` in scope — the `react/react-in-jsx-scope` and `react/jsx-uses-react` rules are off. Only import React (or named members) where a file actually references the `React.*` namespace (`React.CSSProperties`, `React.KeyboardEvent`, `React.FC`, etc.) or a React value (`React.memo`).

### Dependencies
- The **core** library has **zero** runtime deps. Don't add any without a strong reason — the "no external UI library" promise is part of the product. UI-rich features (CodeMirror, Chakra, AJV, Firebase) belong in the demo, not in `src/`.
- `@json-edit-react/themes` also has zero runtime deps (peer-dep on core for types only).
- `@json-edit-react/components` is the one place third-party deps are allowed. New deps there should be lazy-loadable and used by a specific component.
- Anything imported only by the demo must not be reachable from `src/` or `packages/*/src/`.
- `pnpm.overrides` in root [package.json](package.json) pins `csstype` and `@types/react` versions to match what demo's yarn install resolves — otherwise pnpm picks newer minor/patch versions and TS path mappings produce phantom type-identity mismatches.

### Build
- Core's rollup config is at [rollup.config.mjs](rollup.config.mjs). Each sub-package has its own under `packages/<name>/rollup.config.mjs`. All three produce CJS, ESM, and a flattened `.d.ts`.
- Only `build/` ships per package. Core's `tsconfig.json` deliberately sets `"files": ["src/index.ts"]` so rollup's TS plugin walks the dependency graph from the entry rather than typechecking the whole tree at build time. Use `pnpm compile` for a full project-wide typecheck.
- Core's `prebuild` runs `pnpm lint && node scripts/run-prebuild-tests.mjs` — a failing lint OR test halts the build. `SKIP_TESTS=1 pnpm build` skips the test step only (lint stays mandatory). No equivalent skip for lint; if you genuinely need to bypass everything, run `rollup -c && rm -R build/dts` directly.

### Linting / formatting
- ESLint flat config at [eslint.config.mjs](eslint.config.mjs) covers core only. The `packages/` and `demo/` directories are ignored from the root lint and have (or will have) their own configs.
- Prettier: no semicolons, single quotes, 100 col, `trailingComma: es5`, 2-space indent ([.prettierrc](.prettierrc)).

### Tests
- Jest + ts-jest, `testEnvironment: 'jsdom'`. Config at [jest.config.mjs](jest.config.mjs); ts-jest is pointed at [test/tsconfig.json](test/tsconfig.json) (the root `tsconfig.json` has `files: ["src/index.ts"]` and excludes tests). Tests live in [test/](test/) and import from [src/](src/) directly. Both `.ts` and `.tsx` test files are picked up by `testMatch`.
- RTL stack: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. jest-dom's global matcher augmentation (`toBeInTheDocument`, `toHaveClass`, `toHaveFocus`, etc.) is wired via the ambient declaration in [test/jest-dom.d.ts](test/jest-dom.d.ts) — required because jest-dom v6 only exposes types via package `exports`, which the `types` compiler option doesn't follow. Runtime side-effect import lives in [test/setupTests.ts](test/setupTests.ts).
- `.css` imports are stubbed via `moduleNameMapper` ([test/style-mock.js](test/style-mock.js)) so Jest doesn't try to parse the Rollup-handled CSS.
- `modulePathIgnorePatterns` excludes [build/](build/), `build_package/`, [demo/](demo/), and `pack-output/` to avoid haste-map name collisions from bundled snapshots.
- Tests fire automatically as part of `pnpm build` via the prebuild hook (see Build section above for the `SKIP_TESTS=1` escape hatch).
- **Keep tests current with the work.** When changing user-facing behaviour — adding/altering props, changing edit/mutation/search/restriction flows, fixing a reported bug — add or update tests in the same change. Bug fixes ideally include a regression test that fails *before* the fix; the fix flips it to green, which both proves the fix and prevents the bug returning. The tests pin the *contract* (what's on screen, what `setData` receives), not the implementation, so clean internal refactors should leave them green. If you find yourself wanting to delete or weaken a test to land a change, pause and check whether the change is actually a contract break that needs a separate decision.

### Publishing
- **Releases are manual and ship-as-you-go** — no Changesets. Per package, two steps: bump the version (`pnpm bump:<pkg>:beta`, or `npm version <exact>`), then publish (`pnpm pub:<pkg>`). CHANGELOG entries are written by hand at release time. The playbooks and full toolchain reference are in [dev-docs/package-management-guide.md](dev-docs/package-management-guide.md#quick-reference).
- **Two dist-tag rules.** Core betas always publish with `--tag beta` (baked into `pub:core:beta`) so core's stable `latest` (`1.30.2`) never moves; only the explicit `pub:core:latest` touches `latest`. Sub-packages have no stable release, so each beta *is* their `latest` — they publish with no `--tag`. Also: core's `version` must be bumped before packing any sub-package, since each freezes `"json-edit-react": "workspace:^"` into `^<core's current version>` at pack time.
- **Core publishes from a staging directory.** `pnpm build-package` runs [scripts/stage-package.mjs](scripts/stage-package.mjs), which populates `build_package/` with a trimmed `package.json`, the `build/` output, `LICENSE`, `CHANGELOG.md`, and a short npm `README.md` generated from the `<!-- NPM INTRO -->` / `<!-- NPM USAGE -->` blocks in [README_V2.md](README_V2.md) (the v2-beta source; flips back to [README.md](README.md) when v2 ships) via [scripts/build_npm_readme.py](scripts/build_npm_readme.py), which also converts GitHub admonitions to plain-markdown bold-label blockquotes (npm strips inline styles). The root's `publishConfig.directory: "build_package"` tells pnpm to publish from there. The repo root's `README.md` is never modified.
- **Sub-packages publish from their own dirs.** They have `prepack: pnpm build`, keep `publishConfig.access: public`, and author their READMEs with GitHub admonitions ([packages/themes/README.md](packages/themes/README.md), [packages/components/README.md](packages/components/README.md)). No staging dir — instead [scripts/with-npm-readme.mjs](scripts/with-npm-readme.mjs) temporarily swaps each committed README for its admonition-converted form during `pnpm pack` / `pnpm publish` (passthrough mode of `build_npm_readme.py`, link rewriting off so in-page anchors stay in-page), then restores it via `git checkout` — even on failure or interrupt. Each target README must be tracked and clean first so the restore can't clobber uncommitted work. The `pub:<pkg>` scripts use the `(cd <dir> && pnpm publish)` subshell form (the pnpm 10.8.x `-C … publish` bug) and still replace `workspace:` peer-dep specifiers as usual.
- **Preview before publishing.** Every package has a `preview-publish` script that produces a real `.tgz` you can inspect with `tar -tzf`; `pnpm run versions` shows local-vs-npm for all four at a glance. No package uses `prepublishOnly` / `postpublish` hooks, and `preview-publish` / `pub:*` both route through the README handling, so previews mirror what publishes. A bare `pnpm pack` / `pnpm publish` skips the sub-package README swap, so always go through the scripts.
- Never run `pub:*` / `pnpm publish` unless the user explicitly asks. For pre-release testing, use `pnpm preview-publish` (and the per-package variants) and `pnpm run versions` — see [package-management-guide.md](dev-docs/package-management-guide.md).

### Demo deploy
- `yarn release-demo` runs `gh-pages -d build` from [demo/](demo/) and updates the live demo. Treat it the same as publish — don't run without an explicit ask.

## Working with the user

The repo owner is the package author. When in doubt about API shape, tree-shaking implications, or whether something belongs in core vs. one of the sub-packages vs. the demo, ask rather than guessing — the "stay minimal" stance is a deliberate product decision.
