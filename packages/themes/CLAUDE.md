# CLAUDE.md — @json-edit-react/themes

Guidance for Claude Code when working in this sub-package.

## What this is

A small published package of theme objects for [`json-edit-react`](https://github.com/CarlosNZ/json-edit-react). Mostly static data — each theme is a plain object describing styles and fragments. A theme may also supply its own icon glyphs via `icons` (an `IconDefinition` map) whose `content` is SVG/JSX markup; that's the one place a theme carries anything beyond plain style data. See "Shipping theme icons" below.

## Public API

Re-exported from [src/index.ts](src/index.ts):

- `githubDarkTheme`, `githubLightTheme`
- `monoDarkTheme`, `monoLightTheme`
- `candyWrapperTheme`, `psychedelicTheme`

Each is typed as `Theme` (imported from `json-edit-react`).

## Conventions

- **Minimal dependencies.** Imports only the `Theme` type from `json-edit-react` (compile-time, erased at build). The one runtime touchpoint is `react/jsx-runtime`, emitted *only* by a theme that ships `icons` (JSX) — so **`react` is an _optional_ peer dep** (see `peerDependenciesMeta` in package.json), and the rollup `external` keeps `react`/`react/jsx-runtime` unbundled. Don't add any other runtime deps.
- **`json-edit-react` is a peer dep** at `workspace:^` so pnpm resolves it to the local workspace during dev and to a real semver range at publish.
- **`sideEffects: false`** in package.json so bundlers tree-shake unused themes.
- Keep themes declarative. A theme's `icons` glyphs (SVG/JSX markup) are fine — they're data, not logic. But don't add **style functions** or hooks: the core `Theme` type accepts function-returning style values, yet those belong with the consumer, not in a published theme object.

## Shipping theme icons

A theme may define `icons` (per-glyph `IconDefinition`s) so its look includes its own glyphs, not just icon colours. Because a glyph's `content` is JSX, the entry file must be `.tsx`:

1. Rename [src/index.ts](src/index.ts) → `src/index.tsx`.
2. Point the build at it — rollup `input` and tsconfig `files` both → `src/index.tsx`.
3. Author the glyphs. `iconFromSvg` (from `@json-edit-react/utils`) turns raw SVG markup into the `IconDefinition` shape, or write the object directly (`content` is the inner markup, plus optional `viewBox`/`svgProps`/`scale`).

The build is already wired for this: `jsx: react-jsx` in tsconfig, `react` + `react/jsx-runtime` kept external in rollup, and `react` declared as an optional peer dep. A theme with no `icons` stays a plain `.ts` file with no React touchpoint — only flip to `.tsx` when a theme actually ships glyphs.

## Build

```sh
pnpm --filter @json-edit-react/themes build
```

Output: `build/index.cjs.js`, `build/index.esm.js`, `build/index.d.ts`.

## Adding a new theme

1. Add the theme object to [src/index.ts](src/index.ts) (same style as the existing six).
2. Add a changeset: `pnpm changeset` at the repo root, pick `@json-edit-react/themes`, minor bump.
3. Document the new theme name in [README.md](README.md).
