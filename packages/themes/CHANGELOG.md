# @json-edit-react/themes

## 0.9.0-beta.2

### Patch Changes

- Fix per-theme tree-shaking (#382). Importing a single theme no longer pulls every theme's icon glyphs: an icon-less theme now shakes down to a few hundred bytes (was ~8.4 kB gzip), and an icon theme costs only its own glyphs. The build now stamps `/*#__PURE__*/` onto the eager `react/jsx-runtime` calls that construct theme glyphs, so bundlers can prove unused themes are droppable. No change to how themes or glyphs are authored, and no change to import paths.

## 0.9.0-beta.0

### Minor Changes

- 5d57994: Add five more pre-built themes: `solarizedDarkTheme`, `solarizedLightTheme`, `draculaTheme`, `monokaiTheme`, and `tokyoNightTheme`.
- fca0b35: Split themes into a separate publishable package.

  - New package: `@json-edit-react/themes` ships the six pre-built themes (`githubDarkTheme`, `githubLightTheme`, `monoDarkTheme`, `monoLightTheme`, `candyWrapperTheme`, `psychedelicTheme`).
  - **Breaking (json-edit-react v2)**: these theme exports are no longer re-exported from `json-edit-react`. Consumers must `import { ... } from '@json-edit-react/themes'`.
  - Also promoted as public API in core (additive, non-breaking among the v2 changes): `AutogrowTextArea` (joins existing `StringDisplay`, `StringEdit`, `toPathString`).

- 98d459f: Add the `r18jvTheme` — a light theme that ships its own icon glyphs via `Theme.icons`, demonstrating a theme whose look includes its own SVG glyphs (not just colours). It also uses a `property` style function to colour array-index keys like numbers while object keys stay green.
- a186a61: The package build now supports themes that ship their own icon glyphs (`theme.icons`): a glyph's JSX `content` compiles against `react/jsx-runtime`, which is kept external (never bundled). `react` is declared as an optional peer dependency — needed only by a theme that defines icons.
- 10f3537: Add `tmfTheme` — a warm light theme based on the Open mSupply / mSupply Foundation house palette (coral-orange accent, charcoal-slate ink, muted teal secondary on a warm-sand canvas).

### Patch Changes

- 14c4eda: Standardize publish workflows across all three packages (tooling-only).

  - **Core** now publishes from a self-contained `build_package/` staging directory (set via `publishConfig.directory`). Replaces the fragile `prepublishOnly` swap-and-restore dance; a failed publish can no longer leave the repo with a half-swapped README.
  - **Short-README link rewriting** in `scripts/build_npm_readme.py` now handles relative file links (e.g. `[migration-guide.md](migration-guide.md)`) in addition to anchor links, so npm-page links render correctly.
  - **Sub-packages** gain a `prepack: pnpm build` guard so `pnpm pack` / `pnpm publish` always ship a fresh build, and a `preview-publish` script that produces an inspectable `.tgz`.
  - **Sub-package builds** now clean up `build/dts/` intermediate output, so the published tarballs no longer include those redundant declaration files.

  Published runtime behaviour is unchanged.

- Updated dependencies [6b76705]
- Updated dependencies [de1cd5d]
- Updated dependencies [c846bc0]
- Updated dependencies [556b1cf]
- Updated dependencies [99ed120]
- Updated dependencies [b844e0f]
- Updated dependencies [94e5598]
- Updated dependencies [ae66784]
- Updated dependencies [13f5950]
- Updated dependencies [b82f8db]
- Updated dependencies [ffb32b3]
- Updated dependencies [7cb6ba7]
- Updated dependencies [a0872b5]
- Updated dependencies [1ac80d0]
- Updated dependencies [556b1cf]
- Updated dependencies [ee583bc]
- Updated dependencies [fc23b40]
- Updated dependencies [1cb7dc7]
- Updated dependencies [5ae18cb]
- Updated dependencies [03f6060]
- Updated dependencies [7cb6ba7]
- Updated dependencies [2c937a0]
- Updated dependencies [fca0b35]
- Updated dependencies [fca0b35]
- Updated dependencies [2cfdeae]
- Updated dependencies [ceb8dd9]
- Updated dependencies [b26c2cd]
- Updated dependencies [941a1cd]
- Updated dependencies [a20da5f]
- Updated dependencies [a186a61]
- Updated dependencies [2cfdeae]
- Updated dependencies [355b7f8]
- Updated dependencies [4b3576c]
- Updated dependencies [ece6d70]
- Updated dependencies [14c4eda]
- Updated dependencies [a0872b5]
- Updated dependencies [de1cd5d]
- Updated dependencies [f9458fc]
- Updated dependencies [a186a61]
- Updated dependencies [7cb6ba7]
- Updated dependencies [ece6d70]
  - json-edit-react@2.0.0
