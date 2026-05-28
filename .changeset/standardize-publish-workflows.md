---
'@json-edit-react/components': patch
'@json-edit-react/themes': patch
'json-edit-react': patch
---

Standardize publish workflows across all three packages (tooling-only).

- **Core** now publishes from a self-contained `build_package/` staging directory (set via `publishConfig.directory`). Replaces the fragile `prepublishOnly` swap-and-restore dance; a failed publish can no longer leave the repo with a half-swapped README.
- **Short-README link rewriting** in `scripts/build_npm_readme.py` now handles relative file links (e.g. `[migration-guide.md](migration-guide.md)`) in addition to anchor links, so npm-page links render correctly.
- **Sub-packages** gain a `prepack: pnpm build` guard so `pnpm pack` / `pnpm publish` always ship a fresh build, and a `preview-publish` script that produces an inspectable `.tgz`.
- **Sub-package builds** now clean up `build/dts/` intermediate output, so the published tarballs no longer include those redundant declaration files.

Published runtime behaviour is unchanged.
