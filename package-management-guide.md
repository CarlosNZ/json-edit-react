# Package Management Guide

A practical reference for working with this repo's multi-package setup. Written for someone who's comfortable with npm/yarn but new to pnpm, workspaces, and Changesets.

## TL;DR

```sh
# One-time setup (per machine)
corepack enable              # turns on the per-project package manager pinning

# Daily
pnpm install                 # install all workspace deps (run from repo root)
pnpm -r build                # build core + themes + components
pnpm test                    # tests at the root
pnpm changeset               # add a changeset before opening a PR

# Demo / CCL (still on yarn 1, independent installs)
cd demo && yarn install && yarn start:local
cd custom-component-library && yarn install && yarn dev:local

# Preview-publish — produces a real .tgz you can inspect (no registry contact)
pnpm preview-publish                                            # core (stages, then packs from build_package/)
pnpm --filter @json-edit-react/themes preview-publish           # themes
pnpm --filter @json-edit-react/components preview-publish       # components
# → tarballs land in build_package/ (core) or packages/<name>/ (sub-packages)
```

## Overview

### The three packages

| Package | Path | What it ships |
|---|---|---|
| `json-edit-react` | [./](./) (repo root) | The core editor component and all primary types |
| `@json-edit-react/themes` | [packages/themes/](packages/themes/) | Six pre-built theme objects |
| `@json-edit-react/components` | [packages/components/](packages/components/) | 12 ready-to-use custom node components |

All three publish to npm independently with their own versions and changelogs.

### The workspace boundary

The **pnpm workspace** covers exactly these three packages — listed in [pnpm-workspace.yaml](pnpm-workspace.yaml):

```yaml
packages:
  - '.'
  - 'packages/*'
```

The `.` includes the repo root (core). `packages/*` matches themes and components.

**[demo/](demo/) and [custom-component-library/](custom-component-library/) are *outside* the workspace.** They're independent yarn 1 projects. This is deliberate:

- They're test harnesses, not publishable artifacts.
- Their job is to validate the published packages "from the outside" — same view a real consumer gets from npm.
- Each has its own `package.json`, `node_modules`, `yarn.lock`, and `packageManager: "yarn@1.22.22"` pin.
- The `VITE_JRE_SOURCE` env var lets them toggle between consuming local source, a built artifact, or the published npm version.

### Why pnpm + Changesets

- **pnpm workspaces** give us symlinked cross-package deps without needing `yarn link` or `file:` references. When `@json-edit-react/themes` declares `"json-edit-react": "workspace:*"`, pnpm creates `packages/themes/node_modules/json-edit-react` → repo root. Edits in core are picked up instantly by themes/components.
- **Changesets** handles independent versioning. Each PR adds a markdown file declaring which packages bump and how (major/minor/patch). At release time, those markdowns get consumed into version bumps and changelogs. Without this, hand-bumping three packages would get error-prone.

## One-time setup

### Per machine

```sh
# Enable corepack — this makes `pnpm` and `yarn` invocations honour each
# project's pinned packageManager version. Without it, you get the system
# pnpm/yarn regardless of project.
corepack enable

# Verify
pnpm --version    # → 10.8.1 (matches root package.json)
yarn --version    # → 1.22.22 (when run from demo/ or custom-component-library/)
```

### Per clone

```sh
# At repo root — installs core + themes + components together via the workspace.
pnpm install

# Demo and CCL are independent yarn projects. Install separately when needed:
cd demo && yarn install
cd custom-component-library && yarn install
```

There's also a convenience script `pnpm setup` at the root that runs `pnpm install && cd demo && yarn install`.

## Daily commands cheat sheet

All run from the **repo root** unless otherwise noted.

### Installing

```sh
pnpm install                                    # install everything
pnpm add -Dw <pkg>                              # add a root-level devDep
pnpm --filter json-edit-react add <pkg>         # add a dep to core specifically
pnpm --filter @json-edit-react/themes add <pkg> # add a dep to themes
```

The `-w` (workspace) flag scopes to the root. The `--filter <name>` flag scopes to a specific workspace package.

### Building

```sh
pnpm -r build                                   # build all three packages
pnpm --filter json-edit-react build             # build core only
pnpm --filter @json-edit-react/themes build     # build themes only
pnpm --filter @json-edit-react/components build # build components only
```

`-r` is "recursive" — runs the script in every workspace. The root is included because of `include-workspace-root=true` in [.npmrc](.npmrc).

### Testing, linting, typechecking

```sh
pnpm test                                       # jest (at root)
pnpm lint                                       # eslint (at root)
pnpm compile                                    # full typecheck (at root)
pnpm --filter @json-edit-react/themes compile   # typecheck a specific package
```

Each sub-package has its own `tsconfig.json` and its own `pnpm compile` script.

### Running the demo / CCL

```sh
# Demo (port 5175) — three modes via VITE_JRE_SOURCE
cd demo
yarn start:local       # uses local source (../src and ../packages/*/src)
yarn start:build       # uses built artifacts (../build_package and ../packages/*/build)
yarn start             # uses npm-installed versions

# CCL (port 5176) — same three modes
cd custom-component-library
yarn dev:local
yarn dev:build
yarn dev
```

See "Demo and CCL local-source toggle" below for what each mode actually resolves.

## Cross-package dev

When you edit a file in core ([src/](src/)) and themes or components imports it via `'json-edit-react'`, the change is picked up automatically — pnpm's workspace symlink at `packages/themes/node_modules/json-edit-react` points at the repo root.

You don't need to `pnpm install` after editing core source. Just rebuild the dependent package (`pnpm --filter @json-edit-react/themes build`) and re-run whatever consumes it.

For the demo and CCL, the [vite.config.ts](demo/vite.config.ts) alias system handles cross-package resolution at build time — vite rewrites `@json-edit-react/themes` to a real path on disk based on `VITE_JRE_SOURCE`. This works whether or not the package is workspace-linked.

## Mock-publish workflow (replaces `yarn pack`)

Use this whenever you want to test what a real consumer would get from npm — without actually publishing.

### Pack a single package

`pnpm pack` does **not** support `--filter` or `-r` in pnpm 10.x — you have to run it from inside the package directory:

```sh
cd packages/themes
pnpm pack
# → packages/themes/json-edit-react-themes-0.1.0.tgz
```

The output is a `.tgz` named `<package-name>-<version>.tgz` (with the scope's `@` and `/` flattened — `@json-edit-react/themes` becomes `json-edit-react-themes`).

Important: `pnpm pack` honours the package's `files` array and `.npmignore`. The tarball contains exactly what a real `pnpm publish` would push — no extra dev cruft.

### Pack all three

```sh
(cd packages/themes && pnpm pack)
(cd packages/components && pnpm pack)
pnpm pack    # at repo root, packs core (json-edit-react)
```

Each package produces its own `.tgz` next to its `package.json`.

### Install the tarball into a test app

```sh
# In any external project (not the json-edit-react repo)
yarn add /full/path/to/json-edit-react/packages/themes/json-edit-react-themes-0.1.0.tgz
# or
npm install /full/path/to/.../json-edit-react-themes-0.1.0.tgz
# or
pnpm add /full/path/to/.../json-edit-react-themes-0.1.0.tgz
```

The test app now has `@json-edit-react/themes` in its `node_modules` exactly as if it had been installed from npm. Same on-disk contents. Any consumer-visible bug (missing file from `files`, wrong `exports` map, missing `types`) shows up here.

### Why this matters before a real publish

Once you `pnpm publish`, the tarball is on npm forever (you can `unpublish` within 72 hours, but it's a hassle). The dress-rehearsal `.tgz` lets you catch packaging issues — missing files, broken `exports`, type-export quirks — before they're permanent.

## Demo and CCL local-source toggle

Both [demo/vite.config.ts](demo/vite.config.ts) and [custom-component-library/vite.config.ts](custom-component-library/vite.config.ts) have an alias system controlled by the `VITE_JRE_SOURCE` environment variable. The aliases run at vite build time and don't depend on what's installed in node_modules.

| Mode | What it resolves to |
|---|---|
| `VITE_JRE_SOURCE=local` (default for `yarn start:local`) | `@json-edit-react` → `../src/` (core source) <br>`@json-edit-react/themes` → `../packages/themes/src/` <br>`@json-edit-react/components` → `../packages/components/src/` |
| `VITE_JRE_SOURCE=build` (default for `yarn start:build`) | Same but pointing at each package's `build/` output (built artefact) |
| `VITE_JRE_SOURCE=npm` (default for `yarn start`) | Falls through to demo's installed `node_modules` (whatever's been pulled from npm) |

The `local` mode is what you'll use 90% of the time during dev — edits in core/themes/components are picked up by vite's hot-reload without rebuilding.

The `npm` mode is for **validating against the published artefact**. After publishing, run `pnpm sync-demos` from the repo root to bump demo and CCL to the just-published versions, then `yarn start` to see exactly what a consumer would see.

## Versioning with Changesets

Changesets is how we manage independent version bumps across the three packages. Think of it as "a changelog entry written at PR time, queued up, and applied at release time."

### The mental model

- **You don't bump versions by hand.** Instead, you add a "changeset" — a markdown file declaring which packages changed and how (`major`, `minor`, `patch`).
- Multiple PRs each add their own changesets. They queue up in [.changeset/](.changeset/).
- At release time, you run `pnpm changeset version`. It consumes all pending changesets into `package.json` bumps and `CHANGELOG.md` entries, then deletes the consumed files.
- Then `pnpm changeset publish` publishes anything whose local version is ahead of the npm registry.

### Adding a changeset

When you finish a PR that affects published behaviour:

```sh
pnpm changeset
```

Interactive prompt:
1. **Which packages changed?** Use space to toggle, enter to confirm. Pick the packages your PR touched.
2. **What's the bump type for each?**
   - `major` — breaking change (consumer must update code)
   - `minor` — new feature, backward compatible
   - `patch` — bug fix, no API change
3. **Summary** — one sentence. This becomes the `CHANGELOG.md` entry. Aim for "Add X" / "Fix Y" / "Remove Z" — what the consumer will see.

Result: a new file in [.changeset/](.changeset/) like `.changeset/hot-walls-fly.md`. Commit it with your PR.

### Inspecting pending changesets

```sh
pnpm changeset status
```

Shows what bumps will happen on the next release.

```sh
ls .changeset/
```

Lists all pending markdown files.

### How version numbers are chosen

You don't pick a target version directly — you pick a **bump type** in the changeset (`major` / `minor` / `patch`) and `pnpm changeset version` does the semver arithmetic.

For packages at `>= 1.0.0` (e.g. `json-edit-react`), standard semver:

| Highest bump type in pending changesets | Effect |
|---|---|
| `major` | `1.5.3` → `2.0.0` |
| `minor` | `1.5.3` → `1.6.0` |
| `patch` | `1.5.3` → `1.5.4` |

For packages at `< 1.0.0` (e.g. fresh `@json-edit-react/themes` at `0.1.0`), Changesets respects the pre-1.0 semver convention — the minor slot is the "breaking" indicator:

| Highest bump type in pending changesets | Effect |
|---|---|
| `major` | `0.1.0` → `0.2.0` (treated as a minor bump) |
| `minor` | `0.1.0` → `0.2.0` |
| `patch` | `0.1.0` → `0.1.1` |

You don't automatically jump from `0.x` to `1.0.0` via a `major` changeset. When you're ready to promote a sub-package to `1.0.0`, edit its `package.json` version field by hand before the next `pnpm changeset publish`. The CHANGELOG entry for that promotion can be a regular changeset declaring the move.

**Cross-package cascade:** when one package gets a `major` bump and another peer-depends on it via `workspace:^`, Changesets propagates the bump downstream automatically (the peer-dep range has to change, which is itself a breaking change for the dependent). That's why `pnpm changeset status` may show packages bumped beyond what their own changeset declared — the changeset for `json-edit-react: major` cascades into `@json-edit-react/themes` and `@json-edit-react/components` even though their own changesets said `minor`.

### Releasing

When ready to publish:

```sh
# 1. Make sure everything builds and tests pass
pnpm install
pnpm -r build
pnpm test

# 2. Consume all pending changesets — bumps package.json versions, writes CHANGELOG.md
pnpm changeset version

# 3. Inspect the diff. Each affected package.json has a new version,
#    and each has a fresh CHANGELOG.md entry. Pending .changeset/*.md files
#    have been deleted (this is normal).
git diff

# 4. Commit the version bumps
git add -A
git commit -m "Release v..."

# 5. Inspect what will ship (real .tgz files, no registry contact)
pnpm preview-publish                                       # core → build_package/*.tgz
pnpm --filter @json-edit-react/themes preview-publish      # → packages/themes/*.tgz
pnpm --filter @json-edit-react/components preview-publish  # → packages/components/*.tgz
tar -tzf build_package/json-edit-react-*.tgz | sort        # inspect each, repeat for the others

# 6. Publish to npm (the `release` script orchestrates: -r build, build-package, changeset publish)
pnpm release

# 7. Push commit + tags
git push --follow-tags

# 8. Bump demo + CCL to the just-published versions
#    (polls npm until each new version is visible, then `yarn add` in each consumer)
pnpm sync-demos
```

`pnpm changeset publish` walks each workspace package, compares its local version against npm, and runs `pnpm publish` for anything that's ahead. For core, the root `package.json`'s `publishConfig.directory: "build_package"` tells Changesets to publish from the staged directory rather than the repo root — so step 6 builds and stages `build_package/` (a self-contained dir with a trimmed `package.json` and the short npm README) before Changesets ever runs. For sub-packages, `publishConfig.access: public` is set in each scoped package's `package.json` to ensure they ship as public (npm scopes default to private), and their `prepack: pnpm build` hook rebuilds at publish time.

**Pack == publish guarantee.** No package uses `prepublishOnly` / `postpublish` hooks. That means `pnpm pack` and `pnpm publish` produce byte-identical tarballs — what `pnpm preview-publish` shows you in step 5 is exactly what npm receives in step 6.

**Note:** `changeset publish` does not have a `--dry-run` flag of its own. The intended preflight is `pnpm preview-publish` (per package) as in step 5. To preview the *workspace-wide* bump set without consuming changesets, inspect `pnpm changeset status` or run `pnpm changeset version` on a throwaway branch.

### Beta / prerelease releases

Changesets has a built-in **pre mode** for shipping releases under a custom dist-tag (e.g. `beta`, `next`, `alpha`, `rc`) so users don't get them by default — they have to opt in with `npm install <pkg>@beta`.

The flow:

```sh
# 1. Enter pre mode with a tag — this becomes the npm dist-tag
pnpm changeset pre enter beta

# 2. Add changesets as normal for whatever's going into the prerelease
pnpm changeset

# 3. Bump versions — Changesets appends the pre tag
pnpm changeset version
#    → @json-edit-react/themes:    0.1.0     → 0.2.0-beta.0
#    → json-edit-react:            1.30.1    → 2.0.0-beta.0

# 4. Publish — pre-tagged releases automatically use the dist-tag from the pre mode
pnpm changeset publish
#    → @json-edit-react/themes@0.2.0-beta.0 published with dist-tag "beta"
#    → `npm install @json-edit-react/themes` still returns 0.1.0 (latest)
#    → `npm install @json-edit-react/themes@beta` returns 0.2.0-beta.0

# 5. Iterate — each new `changeset version` while in pre mode bumps to the next pre-release:
#    0.2.0-beta.0 → 0.2.0-beta.1 → 0.2.0-beta.2 → ...

# 6. When ready for the stable release, exit pre mode
pnpm changeset pre exit

# 7. Cut the stable release
pnpm changeset version          # collapses 0.2.0-beta.N → 0.2.0
pnpm changeset publish          # publishes 0.2.0 with dist-tag "latest"
```

Pre mode is tracked via a `.changeset/pre.json` file that gets committed alongside your other changesets. **Don't forget step 6** — staying in pre mode means every future `changeset version` keeps generating prerelease bumps.

#### One-off snapshot releases (no pre mode)

For quick preview / "publish whatever's in HEAD right now under a custom tag" without entering pre mode:

```sh
pnpm changeset version --snapshot beta
# → bumps to 0.0.0-beta-<timestamp> (e.g., 0.0.0-beta-20260527142133)
pnpm changeset publish --tag beta --no-git-tag
```

`--snapshot` uses timestamps in the version string so each snapshot is unique without consuming pending changesets. Good for CI-driven per-PR previews. `--no-git-tag` keeps these out of your release history.

#### Inspecting and managing dist-tags

npm dist-tags are how published versions are advertised. By default:

- `latest` → returned by `npm install <pkg>`
- `beta` / `next` / `alpha` / `rc` / anything else → opt-in via `npm install <pkg>@<tag>`

```sh
npm dist-tag ls @json-edit-react/themes
# latest: 0.1.0
# beta:   0.2.0-beta.3

# Manually promote/demote tags without re-publishing:
npm dist-tag add @json-edit-react/themes@0.2.0-beta.3 next
npm dist-tag rm @json-edit-react/themes beta
```

Useful for promoting a beta to `latest` once you've decided it's stable enough, or for retracting a tag.

### Changesets config

[.changeset/config.json](.changeset/config.json) defines the workflow:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.4/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Key fields:
- `"fixed": []` — no packages are version-locked together (each bumps independently).
- `"linked": []` — same as fixed, in modern terms.
- `"access": "public"` — scoped packages publish publicly.
- `"baseBranch": "main"` — release branch.

### Bumping a version manually

You can hand-edit `version` in a package's `package.json` whenever Changesets' automatic arithmetic doesn't match what you want. Two common reasons:

1. **Promoting a 0.x package to 1.0.0.** Changesets keeps 0.x packages on the pre-1.0 minor-as-breaking convention. To go from `0.x` → `1.0.0`, edit `version` directly.
2. **Hotfix where Changesets is overkill.**

```sh
# Edit the version directly
vim packages/themes/package.json    # change "version": "0.2.0" → "1.0.0"

# Publish from inside the package dir
cd packages/themes
pnpm publish
```

Discouraged in general because it skips the auto-generated changelog. For the 1.0.0 promotion specifically, the cleanest approach is: hand-edit the version, then add a normal changeset describing the promotion so the changelog still captures it.

## Bundle-size verification

For now: pack a package and install into a minimal Vite project, build, and inspect the output.

```sh
# 1. Pack
pnpm --filter @json-edit-react/components pack

# 2. Create a minimal Vite app (or reuse an existing one)
cd /tmp && npm create vite@latest test-app -- --template react-ts
cd test-app
yarn install
yarn add /path/to/json-edit-react/packages/components/json-edit-react-components-0.1.0.tgz

# 3. Import only what you want to measure
# Edit src/App.tsx to:
#   import { LinkCustomComponent } from '@json-edit-react/components'
# (or import nothing from it, for a baseline)

# 4. Build and inspect
yarn build
# Note the dist/assets/*.js sizes

# 5. Repeat with different imports to compare
```

For a more systematic approach, see the **bundle-size test scaffolding** in [V2-roadmap.md](V2-roadmap.md) — a planned future side-project (`json-edit-react-bundle-tests` repo) that automates this across Vite, CRA, Next.js, Webpack, Parcel, and esbuild consumer projects.

`vite build --report` or `source-map-explorer` against `dist/assets/*.js` give per-import breakdowns.

## Troubleshooting / FAQ

### "This project is configured to use pnpm..." when running yarn

You're in or under a directory where corepack found `packageManager: "pnpm@..."`. Solution:
- If you're in `demo/` or `custom-component-library/`, that's wrong — those should have their own `packageManager: "yarn@1.22.22"` pin. Check the local `package.json`.
- If you're in repo root, you should be using pnpm. Run `pnpm <command>` instead.

### `pnpm --filter json-edit-react ...` says "No projects matched the filters"

The root workspace is configured via `include-workspace-root=true` in [.npmrc](.npmrc) which means `--filter` and `-r` include root by default. If you ever remove that setting, you'd need `--include-workspace-root` on each `--filter`/`-r` command.

### How do I add a dep to just the themes package?

```sh
pnpm --filter @json-edit-react/themes add <pkg>
```

This adds to `packages/themes/package.json` and re-resolves the workspace.

### Why isn't my workspace symlink resolving?

Check that the dependent's `package.json` lists the source as a workspace dep:

```json
"peerDependencies": { "json-edit-react": "workspace:^" },
"devDependencies":  { "json-edit-react": "workspace:*" }
```

Then re-run `pnpm install`. The symlink lands at `packages/<name>/node_modules/json-edit-react` → repo root.

### The demo's "npm" mode can't find @json-edit-react/themes

Right — the themes and components packages haven't been published to npm yet. The `npm` mode for those packages only works after the first publish. Use `local` mode (`VITE_JRE_SOURCE=local`) in the meantime; it routes through vite aliases to the in-repo source.

After the first publish, run `pnpm sync-demos` (or update demo/CCL `package.json` deps manually) to install the published versions.

### How do I un-publish a bad release?

Within 72 hours of publishing: `npm unpublish @json-edit-react/<name>@<version>` (or `pnpm unpublish`). After 72 hours, npm won't let you — publish a patch instead with a fix.

### TypeScript reports conflicting React/csstype types

Pre-pinned via `pnpm.overrides` in root [package.json](package.json):

```json
"pnpm": {
  "overrides": {
    "csstype": "3.1.3",
    "@types/react": "19.1.1"
  }
}
```

Demo's yarn install picks up specific versions; pnpm at root would otherwise pick the latest within the semver range, causing TS to see two type-identity-different copies via the path mappings. If the demo or CCL ever upgrades their `@types/react` or `react`, update the overrides to match.

### Pre/post script hooks aren't running

Pre/post hooks for arbitrary scripts (`prebuild`, `postbuild`, etc.) are enabled via `enable-pre-post-scripts=true` in [.npmrc](.npmrc). If you remove that, only npm-defined lifecycle hooks (`prepublishOnly`, `postpublish`) run.

### How do I clean everything and reinstall from scratch?

```sh
# Workspace + sub-packages
rm -rf node_modules packages/*/node_modules build packages/*/build
pnpm install

# Demo and CCL (independent)
rm -rf demo/node_modules demo/build custom-component-library/node_modules custom-component-library/dist
cd demo && yarn install && cd ..
cd custom-component-library && yarn install && cd ..
```
