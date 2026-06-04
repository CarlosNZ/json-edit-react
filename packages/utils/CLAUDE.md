# CLAUDE.md — @json-edit-react/utils

Guidance for Claude Code when working in this sub-package.

## What this is

A published package of **utility hooks and helpers** for
[`json-edit-react`](https://github.com/CarlosNZ/json-edit-react) — logic that's
useful alongside the editor but deliberately kept out of the zero-dependency
core. Unlike `@json-edit-react/components` (things you _render_), this package is
things you _call_: hooks, generators, and plain functions.

This package is **nascent** — scaffolded ahead of its first real helper. The
planned contents are:

- **Confirm-before-update hooks** — `useJsonEditorConfirm` (logic-only primitive)
  and `useConfirmOnUpdate` (declarative wrapper). Gate edits on a confirmation
  dialog by reusing core's async `onUpdate` contract; the consumer supplies the
  modal UI. ([#307](https://github.com/CarlosNZ/json-edit-react/issues/307))
- **JSON Schema → Filter Functions** — turn a JSON Schema into the `allow*`
  filter functions (`allowEdit`, `allowDelete`, `allowAdd`, `allowTypeSelection`,
  `allowDrag`, …) so the editor UI can't produce schema-invalid data.
  ([#285](https://github.com/CarlosNZ/json-edit-react/issues/285))
- **Search helpers** — ready-made `searchFilter` functions for common search
  patterns. ([#319](https://github.com/CarlosNZ/json-edit-react/issues/319))

## Public API

Everything consumers can import is re-exported from [src/index.ts](src/index.ts).
Treat changes there as semver-significant. The entry is currently an empty
placeholder — add `export * from './<group>'` lines as each helper group lands.

## Conventions

- **Default to zero runtime dependencies.** Like `@json-edit-react/themes`, this
  package should import only _types_ from `json-edit-react` (erased at build).
  The confirm hooks and search helpers are pure React/TS logic — keep them
  dep-free.
- **Quarantine the one risky dependency (#285).** The JSON Schema → filters
  generator is the only planned helper that might want a parser. Decide per-helper
  whether it's runtime or a one-shot codegen step (run it, get a config object you
  import). **Do not let it set the dependency posture for the whole package** —
  that's the whole reason these helpers live here and not in
  `@json-edit-react/components` (whose `dependencies` field would force every
  consumer to download `react-datepicker` et al. just to get a search helper).
  If a runtime parser is unavoidable, make it lazy-loaded and isolated to that
  one module.
- **`json-edit-react` is a peer dep** at `workspace:^`; **`react`** is a peer dep
  at `>=18.0.0` (matching core — these helpers include hooks).
- **`sideEffects: false`** so bundlers tree-shake unused helpers. Combined with a
  single ESM entry (the same "Option B+" approach as `components`), importing one
  helper must not pull another's code. **Per-helper sub-path exports are the
  escape hatch** if a heavy helper (e.g. #285's generator) starts leaking into
  bundles that only import the light ones — add explicit `exports` map entries
  and matching rollup inputs at that point, not before.
- **Keep tests current.** Add tests with each helper (the confirm hook's
  deferred-promise lifecycle especially rewards a regression test).

## Build

```sh
pnpm --filter @json-edit-react/utils build
```

Output: `build/index.cjs.js`, `build/index.esm.js`, `build/index.d.ts`.

## Adding a helper

1. Create `src/<group>/` (`confirm`, `schema`, `search`) with the
   implementation and an `index.ts` barrel.
2. Re-export it from [src/index.ts](src/index.ts).
3. Check the dependency policy above — prefer zero runtime deps.
4. Add a changeset: `pnpm changeset` at the repo root, pick
   `@json-edit-react/utils`.
5. Document it in [README.md](README.md) (present tense).
