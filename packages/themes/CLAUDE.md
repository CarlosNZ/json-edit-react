# CLAUDE.md — @json-edit-react/themes

Guidance for Claude Code when working in this sub-package.

## What this is

A small published package of theme objects for [`json-edit-react`](https://github.com/CarlosNZ/json-edit-react). Mostly static data — each theme is a plain object describing styles and fragments. A theme may also carry more than colours: its own icon glyphs via `icons` (an `IconDefinition` map whose `content` is SVG/JSX markup), and style functions that derive a value from a node's data. See "Shipping theme icons" below for the glyph mechanics.

## Public API

Re-exported from [src/index.ts](src/index.ts), each typed as `Theme` (imported from `json-edit-react`):

- `githubDarkTheme`, `githubLightTheme`
- `monoDarkTheme`, `monoLightTheme`
- `candyWrapperTheme`, `psychedelicTheme`
- `solarizedDarkTheme`, `solarizedLightTheme`
- `draculaTheme`, `monokaiTheme`, `tokyoNightTheme`
- `r18jvTheme` — ships its own icon glyphs (the worked example for "Shipping theme icons")

## Conventions

- **Minimal dependencies.** Imports only the `Theme` type from `json-edit-react` (compile-time, erased at build). The one runtime touchpoint is `react/jsx-runtime`, emitted *only* by a theme that ships `icons` (JSX) — so **`react` is an _optional_ peer dep** (see `peerDependenciesMeta` in package.json), and the rollup `external` keeps `react`/`react/jsx-runtime` unbundled. Don't add any other runtime deps.
- **`json-edit-react` is a peer dep** at `workspace:^` so pnpm resolves it to the local workspace during dev and to a real semver range at publish.
- **`sideEffects: false`** in package.json so bundlers tree-shake unused themes.
- **Style functions are allowed** where they're part of the theme's look — e.g. `r18jvTheme`'s `property` function colours array-index keys like numbers while object keys stay green. Keep them pure and cheap (they run per-node on every render) with no side effects or hooks. Plain static styles are still the default; reach for a function only when the look genuinely depends on a node's data.

## Shipping theme icons

A theme may define `icons` (per-glyph `IconDefinition`s) so its look includes its own glyphs, not just icon colours. A glyph's `content` is JSX, so a theme that ships icons — or that carries a colour palette / style functions — lives in its **own `.tsx` module** (e.g. [src/r18jv/index.tsx](src/r18jv/index.tsx)) and is re-exported from the plain [src/index.ts](src/index.ts). That keeps the index free of module-level consts and JSX. Author the `icons` map directly: `content` is the *inner* SVG markup (core renders and sizes the wrapping `<svg>`), plus optional `viewBox`/`svgProps`/`scale`. `r18jvTheme` is the worked example, and `iconFromSvg` (from `@json-edit-react/utils`) can convert raw SVG markup if you'd rather not hand-write the object.

The build follows the import graph from `src/index.ts`, so a re-exported `.tsx` module's JSX is compiled and emits `react/jsx-runtime` imports — kept external in rollup (`jsx: react-jsx` in tsconfig, `react` an optional peer dep). A colours-only theme stays a plain object in `index.ts` and adds no React touchpoint.

## Build

```sh
pnpm --filter @json-edit-react/themes build
```

Output: `build/index.cjs.js`, `build/index.esm.js`, `build/index.d.ts`.

## Adding a new theme

1. Add the theme. A plain (colours-only) theme goes inline in [src/index.ts](src/index.ts), same style as the existing ones. A theme that carries a colour palette, style functions, or icon glyphs goes in its own `.tsx` module (e.g. `src/<name>/index.tsx`), re-exported from `index.ts` — see "Shipping theme icons".
2. Add a `CHANGELOG.md` entry for the new theme (releases are manual, ship-as-you-go — see [dev-docs/package-management-guide.md](../../dev-docs/package-management-guide.md#quick-reference)).
3. Document the new theme name in [README.md](README.md).
4. If the theme adapts an existing colour scheme, credit the original author in the README's "Theme credits" table (and add a short credit comment at the top of the theme's source file). If it ships borrowed icon glyphs, also add a row to "Icon set credits". The README tables are the shipped attribution — source-file comments are stripped at build.
