# CLAUDE.md — @json-edit-react/themes

Guidance for Claude Code when working in this sub-package.

## What this is

A small published package of theme objects for [`json-edit-react`](https://github.com/CarlosNZ/json-edit-react). Pure static data — each theme is a plain object describing styles and fragments. No runtime logic.

## Public API

Re-exported from [src/index.ts](src/index.ts):

- `githubDarkTheme`, `githubLightTheme`
- `monoDarkTheme`, `monoLightTheme`
- `candyWrapperTheme`, `psychedelicTheme`

Each is typed as `Theme` (imported from `json-edit-react`).

## Conventions

- **No runtime dependencies.** This package imports only the `Theme` type from `json-edit-react` (compile-time, erased at build). Don't add runtime deps.
- **`json-edit-react` is a peer dep** at `workspace:^` so pnpm resolves it to the local workspace during dev and to a real semver range at publish.
- **`sideEffects: false`** in package.json so bundlers tree-shake unused themes.
- Theme objects are static. Don't add functions or hooks here — the core `Theme` type accepts function-returning style values, but those belong with the consumer, not in the published theme object.

## Build

```sh
pnpm --filter @json-edit-react/themes build
```

Output: `build/index.cjs.js`, `build/index.esm.js`, `build/index.d.ts`.

## Adding a new theme

1. Add the theme object to [src/index.ts](src/index.ts) (same style as the existing six).
2. Add a changeset: `pnpm changeset` at the repo root, pick `@json-edit-react/themes`, minor bump.
3. Document the new theme name in [README.md](README.md).
