# Package Management Guide

The single reference for this repo's multi-package toolchain — installing, building, the demo harness, and releasing the four packages by hand. **[Quick reference](#quick-reference) is right below for fast lookup; the detailed reference follows.** New to pnpm/workspaces? Jump to [Overview](#overview).

Releases are **manual and ship-as-you-go** — no Changesets (see [Versioning and releasing](#versioning-and-releasing) for why).

> Just need the publish commands for one package? [publishing-cheat-sheet.md](publishing-cheat-sheet.md) is the condensed per-package one-pager.

---

# Quick reference

Per package, two steps: **bump the version, then publish.** pnpm doesn't prompt for a version like `yarn publish` did — you state the bump explicitly through a `bump:*` script, which also makes the version commit and tag. The fiddly parts (dist-tags, staging, the README wrapper, the subshell publish form) are baked into the `bump:*` / `pub:*` scripts. Concepts behind all this: [Versioning and releasing](#versioning-and-releasing).

> Stable releases publish to `latest`, prereleases to `beta`, and the dist-tag is baked into the script name (`pub:<pkg>` vs `pub:<pkg>:beta`). Full rationale: [Dist-tag rules](#dist-tag-rules).

## One command: `pnpm release`

[../scripts/release.mjs](../scripts/release.mjs) runs a whole single-package release interactively, and is the easiest way to ship one package:

```sh
pnpm release --dry-run                    # everything except the commit, tag and real publish
pnpm release                              # asks: which package? which version? then confirms
pnpm release themes                       # skip the package question
git push --follow-tags                    # it never pushes
```

It needs a clean tree, logs in to npm through the browser if the session has lapsed, and suggests the next versions (patch / minor / major, and a `beta.0` of each; a beta ticks to the next `beta.N`). It refuses unless the package's `CHANGELOG.md` has a `## X.Y.Z` heading for the version (a beta also passes on `## X.Y.Z-beta.N`), and for a sub-package it shows the peer range on core that will ship. Then it bumps `package.json`, runs lint / tests / typecheck / build (for a sub-package, core is built first, since sub-packages typecheck against core's `build/`), makes the version commit and annotated tag exactly as `bump:*` does, and publishes under `latest` or `beta` through the same commands as `pub:*`. If a check fails before the commit, `package.json` is put back; if the publish fails after it, it prints how to retry or undo. After a stable release it reminds you to move `beta` up if it's been left behind. The step-by-step scripts below remain for anything it doesn't cover, such as the [everything-together](#ship-everything-together-a-compat-break) ordering.

## Which scenario?

| You want to… | Section |
| --- | --- |
| Ship a stable release of one package | [Stable release](#ship-a-stable-release) |
| Ship a prerelease (beta) of one package | [Prerelease](#ship-a-prerelease) |
| Release everything together (a real compat break) | [Everything together](#ship-everything-together-a-compat-break) |
| Patch V1 | [V1 patch](#ship-a-v1-patch) |

## Build & preview

`pnpm run versions` is your before/after gauge; `preview-publish` builds a real `.tgz` without publishing. Deeper: [Daily commands](#daily-commands), [Mock-publish workflow](#mock-publish-workflow).

```sh
pnpm run versions                            # local (next publish) vs what's on npm, all four packages
pnpm -r build                                # build all four (or --filter <name> build for one)
pnpm preview-publish                         # core: build + stage build_package/ + pack at repo root
pnpm --filter @json-edit-react/themes preview-publish   # one sub-package (build + README swap + pack)
pnpm pack-all                                # all four → pack-output/ (READMEs swapped; peer deps stripped)
tar -tzf <pkg>-*.tgz                          # inspect a tarball's file list
tar -xzO -f <pkg>-*.tgz package/package.json  # check version + peer ranges
```

## Ship a stable release

```sh
pnpm run versions                         # 1. glance
#    edit CHANGELOG.md + commit your work — the tree must be CLEAN
pnpm bump:core patch                      # 2. version commit + annotated tag v2.0.1 (or minor | major | <exact>)
pnpm preview-publish && tar -tzf json-edit-react-*.tgz   # 3. inspect what ships
pnpm pub:core:latest                      # 4. publish to `latest`
git push --follow-tags                    # 5. push the version commit + its tag
pnpm run versions                         # 6. confirm npm shows the new version
```

A sub-package is the same shape (swap `themes` for `utils` / `components`):

```sh
#    edit packages/themes/CHANGELOG.md + commit — the tree must be clean
pnpm bump:themes patch                    # commit + tag @json-edit-react/themes@1.0.1
pnpm --filter @json-edit-react/themes preview-publish   # inspect the .tgz
pnpm pub:themes                           # publish to `latest`
git push --follow-tags
```

No core changes are needed for a sub-package release — it re-freezes its peer range to core's current `version` at pack time. The sub-package's tag is scoped (`@json-edit-react/themes@1.0.1`) since plain `v…` tags would collide across packages, and its README must be committed and clean (the publish wrapper restores it with `git checkout`).

## Ship a prerelease

Same flow, with the `:beta` variant of both scripts, so `latest` never moves:

```sh
pnpm bump:core:beta                       # 2.0.0 -> 2.0.1-beta.0, then 2.0.1-beta.1, …
pnpm preview-publish                      # inspect
pnpm pub:core:beta                        # publish to `beta`
git push --follow-tags

pnpm bump:themes:beta                     # sub-package: 1.0.0 -> 1.0.1-beta.0, …
pnpm pub:themes:beta                      # publish to `beta`
```

`bump:<pkg>:beta` increments the patch slot. For a prerelease of a minor or major, pass the npm pre-type through the plain script instead: `pnpm bump:core preminor --preid=beta` (`2.0.0` → `2.1.0-beta.0`); repeat with `bump:core:beta` for `beta.1`, `beta.2`, …

**Never publish a prerelease with the plain `pub:<pkg>` script** — it goes to `latest`, making the beta the default install. When the prerelease line is ready, ship it as a normal [stable release](#ship-a-stable-release) with an exact version (`pnpm bump:core 2.1.0`), then re-point `beta` so it isn't left behind `latest`: `npm dist-tag add json-edit-react@2.1.0 beta`.

## Ship everything together (a compat break)

When a core change actually breaks the sub-packages. **Order matters:** bump core *before* the sub-packages, so each freezes the correct `^<new core>` peer range at pack time.

```sh
pnpm run versions
#    update all four CHANGELOGs + commit your work — tree must be clean
pnpm bump:core major                      # core FIRST; each bump makes its own commit + tag
pnpm bump:utils major                     # (or whatever each package's change warrants)
pnpm bump:themes major
pnpm bump:components major
pnpm pack-all                             # all four, READMEs swapped
#    check each sub-package's REAL peer range from its tarball (see Verify below)
pnpm pub:utils && pnpm pub:themes && pnpm pub:components   # sub-packages first
pnpm pub:core:latest                      # core last
git push --follow-tags                    # push all four version commits + tags
pnpm run versions
```

Publish all four back to back: in between, `latest` briefly pairs a new sub-package with the old core (or the reverse, whichever order you choose), so fresh installs of both can hit a peer conflict.

## Ship a V1 patch

V1 lives on the `v1.x` branch, which keeps its original single-package yarn 1 toolchain. Work on it in a separate worktree so `main`'s checkout is untouched:

```sh
git worktree add ../json-edit-react-v1.x v1.x
cd ../json-edit-react-v1.x && yarn install
#    fix + add a note to the Changelog section of README.md + commit
yarn release                              # yarn publish: prompts for the version, commits + tags v1.x.y,
                                          #   and publishes to `v1-latest` (never `latest`)
git push --follow-tags
yarn release-demo                         # optional: redeploy the V1 demo (carlosnz.github.io/json-edit-react-v1)
cd - && git worktree remove ../json-edit-react-v1.x
```

## Verify after publishing

```sh
pnpm run versions                                     # all four at a glance
npm dist-tag ls json-edit-react                        # latest = newest stable, beta = newest prerelease, v1-latest = newest 1.x
```

In a packed tarball (`pnpm preview-publish`), confirm before shipping:

- the **version** is what you bumped to;
- the frozen peer range reads `^<core's current version>`, **not** a stale one (this is [Rule 2](#dist-tag-rules) paying off). Read it from the tarball itself — `pack-all`'s extracted copies in `pack-output/` have `peerDependencies` stripped so it can install runtime deps for the demo:
  ```sh
  (cd packages/themes && pnpm preview-publish > /dev/null \
    && tar -xzOf json-edit-react-themes-*.tgz package/package.json | grep -A3 '"peerDependencies"' \
    && rm json-edit-react-themes-*.tgz)
  ```
- the `README.md` is the npm form — bold-label blockquotes, not raw `[!NOTE]`;
- the file list is clean (no source, tests, `node_modules`); for `components`, its `dependencies` block lists the third-party libs at sensible ranges and they're not bundled into the build.

End-to-end co-install smoke test (catches peer-range mistakes the per-package checks miss):

```sh
cd "$(mktemp -d)" && npm init -y >/dev/null
npm install react react-dom json-edit-react \
  @json-edit-react/utils @json-edit-react/themes @json-edit-react/components
npm ls json-edit-react @json-edit-react/utils @json-edit-react/themes @json-edit-react/components
```

## Gotchas

- **`pnpm run versions` before and after** every release is your before/after snapshot. If "after" doesn't show the number you bumped to, something didn't publish.
- **Preview is mandatory, not optional.** There's no undo on npm (only an `unpublish` within 72 hours — a hassle). Inspect a real tarball before `pub:*`.
- **The dist-tag lives in the script name.** `pub:<pkg>` / `pub:core:latest` → `latest`; `pub:<pkg>:beta` / `pub:core:beta` → `beta`. Publishing a prerelease with the plain script makes it the default install.
- **`bump:*` needs a clean tree and makes a commit + tag.** Commit your CHANGELOG/work first; the bump then lands a version commit + annotated tag (core `v<version>` via `npm version`, sub-packages scoped `@json-edit-react/<name>@<version>` via [../scripts/bump-package.mjs](../scripts/bump-package.mjs)). Tags stay local — push with `git push --follow-tags`. Don't run `npm version` directly inside `packages/<name>`: away from the repo root it edits `package.json` but makes no commit or tag.
- **`pnpm -C <dir> publish` is broken** on pnpm 10.8.x (leaks the dir + command word into npm → `EUSAGE`). The `pub:<sub>` scripts use the `(cd <dir> && pnpm publish …)` subshell form. `-C`/`--filter` are fine for `build` and `pack`.
- **The README wrapper needs each target README committed and clean** — it restores via `git checkout`, so an uncommitted edit gets clobbered.
- **A README-only change still needs a new published version** — npm has no in-place README edit. Bump a patch and re-publish.
- **The default npm page shows the `latest`-tagged version's README.** A prerelease's README is only at `npmjs.com/package/<name>/v/<version>`.
- **Dist-tag names can't be valid semver ranges** — npm rejects `v1` (it means "any 1.x"), which is why V1's tag is `v1-latest`. `npm i json-edit-react@v1` still works, as a range.

---

# Detailed reference

## Overview

### The four packages

| Package | Path | What it ships |
| --- | --- | --- |
| `json-edit-react` | [../](../) (repo root) | The core editor component and all primary types |
| `@json-edit-react/utils` | [../packages/utils/](../packages/utils/) | Utility hooks + helpers (`useConfirmOnUpdate`, `useUndo`) |
| `@json-edit-react/themes` | [../packages/themes/](../packages/themes/) | Pre-built theme objects |
| `@json-edit-react/components` | [../packages/components/](../packages/components/) | Ready-to-use custom node components |

All four publish to npm independently with their own versions and changelogs.

### The workspace boundary

The **pnpm workspace** covers the root plus everything under `packages/*` — listed in [../pnpm-workspace.yaml](../pnpm-workspace.yaml):

```yaml
packages:
  - '.'
  - 'packages/*'
```

The `.` includes the repo root (core). `packages/*` matches utils, themes, and components.

**[../demo/](../demo/) is *outside* the workspace.** It's an independent yarn 1 project. This is deliberate:

- It's a test harness, not a publishable artifact.
- Its job is to validate the published packages "from the outside" — same view a real consumer gets from npm.
- It has its own `package.json`, `node_modules`, `yarn.lock`, and `packageManager: "yarn@1.22.22"` pin.
- The `VITE_JRE_SOURCE` env var lets it toggle between consuming local source, a built artifact, or the published npm version.

### Why pnpm

- **pnpm workspaces** give us symlinked cross-package deps without needing `yarn link` or `file:` references. When `@json-edit-react/themes` declares `"json-edit-react": "workspace:*"`, pnpm creates `packages/themes/node_modules/json-edit-react` → repo root. Edits in core are picked up instantly by themes/components/utils.
- **Versioning is manual.** Each package is bumped and published by hand, ship-as-you-go (`pnpm bump:*` / `pnpm pub:*`). The author decides cross-package compatibility deliberately rather than delegating it to an automated tool — see [Versioning and releasing](#versioning-and-releasing).

## One-time setup

### Per machine

```sh
# Enable corepack — this makes `pnpm` and `yarn` invocations honour each
# project's pinned packageManager version. Without it, you get the system
# pnpm/yarn regardless of project.
corepack enable

# Verify
pnpm --version    # → 10.8.1 (matches root package.json)
yarn --version    # → 1.22.22 (when run from demo/)
```

### Per clone

```sh
# At repo root — installs core + sub-packages together via the workspace.
pnpm install

# The demo is an independent yarn project. Install separately when needed:
cd demo && yarn install
```

There's also a convenience script `pnpm setup` at the root that runs `pnpm install && cd demo && yarn install`.

## Daily commands

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
pnpm -r build                                   # build all packages
pnpm --filter json-edit-react build             # build core only
pnpm --filter @json-edit-react/themes build     # build themes only
pnpm --filter @json-edit-react/components build # build components only
pnpm --filter @json-edit-react/utils build      # build utils only
```

`-r` is "recursive" — runs the script in every workspace. The root is included because of `include-workspace-root=true` in [../.npmrc](../.npmrc).

`pnpm build` (core) runs `pnpm lint` and `pnpm test` first via the `prebuild` hook — a failing test or lint stops the build. To force a build past a failing test (e.g. when iterating on a build artefact and an unrelated test is red), set `SKIP_TESTS=1`:

```sh
SKIP_TESTS=1 pnpm build      # builds even if tests fail; lint still runs
```

There's no equivalent skip for lint — fix the lint or use `pnpm rollup -c && rm -R build/dts` directly if you really need to bypass everything.

### Testing, linting, typechecking

```sh
pnpm test                                       # jest (at root)
pnpm lint                                       # eslint (at root)
pnpm compile                                    # full typecheck (at root)
pnpm --filter @json-edit-react/themes compile   # typecheck a specific package
```

Each sub-package has its own `tsconfig.json` and its own `pnpm compile` script.

**Build core before typechecking a sub-package.** Sub-packages resolve `json-edit-react` through a symlink to the repo root, whose `types` field points at the gitignored `build/index.d.ts` — so they typecheck against core's last *build*, not its current source. Edit `src/types.ts` without rebuilding and every sub-package reports errors against the old shapes (`UpdateFunctionProps is not generic`, `no exported member 'IconDefinition'`), which look like sub-package bugs and aren't. `pnpm -r build` and `pnpm pack-all` order core first, so they handle it for you; running `compile`, `build` or `pub:*` in a single sub-package does not.

### Running the demo

```sh
# Demo (port 5175) — modes via VITE_JRE_SOURCE
cd demo
yarn start:local       # uses local source (../src and ../packages/*/src)
yarn start:build       # uses built artifacts (../build_package and ../packages/*/build)
yarn start             # uses npm-installed versions
```

See [Demo local-source toggle](#demo-local-source-toggle) for what each mode actually resolves.

## Cross-package dev

When you edit a file in core ([../src/](../src/)) and a sub-package imports it via `'json-edit-react'`, the change is picked up automatically — pnpm's workspace symlink at `packages/themes/node_modules/json-edit-react` points at the repo root.

You don't need to `pnpm install` after editing core source. Just rebuild the dependent package (`pnpm --filter @json-edit-react/themes build`) and re-run whatever consumes it.

For the demo, the [../demo/vite.config.ts](../demo/vite.config.ts) alias system handles cross-package resolution at build time — vite rewrites `@json-edit-react/themes` to a real path on disk based on `VITE_JRE_SOURCE`. This works whether or not the package is workspace-linked.

## Mock-publish workflow

Use this whenever you want to test what a real consumer would get from npm — without actually publishing. `pnpm preview-publish` (per package) and `pnpm pack-all` (all four) are the blessed entry points; they route through the same README handling as a real publish, so the tarball is byte-accurate.

### Pack a single package

`pnpm pack` does **not** support `--filter` or `-r` in pnpm 10.x — run it from inside the package directory (or use `pnpm --filter <name> preview-publish`, which handles this):

```sh
cd packages/themes
pnpm pack
# → packages/themes/json-edit-react-themes-1.0.0.tgz
```

The output is a `.tgz` named `<package-name>-<version>.tgz` (with the scope's `@` and `/` flattened — `@json-edit-react/themes` becomes `json-edit-react-themes`). `pnpm pack` honours the package's `files` array and `.npmignore`, so the tarball contains exactly what a real `pnpm publish` would push.

### Install the tarball into a test app

```sh
# In any external project (not the json-edit-react repo)
npm install /full/path/to/.../json-edit-react-themes-1.0.0.tgz
```

The test app now has `@json-edit-react/themes` in its `node_modules` exactly as if it had been installed from npm. Any consumer-visible bug (missing file from `files`, wrong `exports` map, missing `types`) shows up here — before it's permanent on npm.

## Demo local-source toggle

[../demo/vite.config.ts](../demo/vite.config.ts) has an alias system controlled by the `VITE_JRE_SOURCE` environment variable. The aliases run at vite build time and don't depend on what's installed in node_modules.

| Mode | What it resolves to |
| --- | --- |
| `VITE_JRE_SOURCE=local` (default for `yarn start:local`) | `@json-edit-react` → `../src/` (core source) <br>`@json-edit-react/themes` → `../packages/themes/src/` <br>`@json-edit-react/components` → `../packages/components/src/` |
| `VITE_JRE_SOURCE=build` (default for `yarn start:build`) | Each package's `build/` output (rollup artefact, before packaging) |
| `VITE_JRE_SOURCE=pack` (default for `yarn start:pack`) | Each package's locally-packed tarball under `pack-output/<name>/package/` — what `pnpm publish` would actually upload. Run `pnpm pack-all` first. |
| `VITE_JRE_SOURCE=npm` (default for `yarn start`) | Falls through to demo's installed `node_modules` (whatever's been pulled from npm) |

The `local` mode is what you'll use 90% of the time during dev — edits in core/themes/components are picked up by vite's hot-reload without rebuilding.

The `pack` mode is the closest pre-publish dress rehearsal: `pnpm pack-all` builds and packs all packages exactly as `pnpm publish` would, extracts them into `pack-output/<name>/package/`, and `npm install`s their runtime deps so vite can resolve everything (e.g. `react-datepicker` for components). Then `yarn start:pack` / `yarn build:pack` consumes those extracted dirs. Most packaging issues — missing files from the `files` array, broken `exports` map, wrong `main`/`module`/`types` paths, bad `prepack` output — show up here. The sub-package READMEs are swapped to their npm form too, so `pack-output/<name>/package/README.md` is the easiest place to eyeball the final published README; this requires the sub-package READMEs committed + clean (or `SKIP_NPM_README_SWAP=1` to skip). `peerDependencies` are **not** validated in this mode: [../scripts/pack-all.mjs](../scripts/pack-all.mjs) strips them from the extracted `package.json` before installing, because workspace-internal peers would otherwise fail to resolve. Peer-dep correctness has to be reviewed by reading the staged `package.json` directly.

The `npm` mode is for **validating against the published artefact**. After publishing, run `pnpm sync-demos` from the repo root to bump the demo to the just-published versions, then `yarn start` to see exactly what a consumer would see.

## Versioning and releasing

Releases are **manual and ship-as-you-go** — implement, document (including the CHANGELOG), build, publish. There's no Changesets, no release-day batching, no automated version arithmetic. The command playbooks are in the [Quick reference](#quick-reference) above; this section is the concepts behind them. (The repo used Changesets until mid-2026; why it moved off — chiefly the peer-dependency cascade — is described in "No automatic cross-package cascade" below.)

### The release scripts

| Script | Does |
| --- | --- |
| `pnpm run versions` | one-glance: local (next publish) vs what's on npm, all four packages |
| `pnpm release [<pkg>] [--dry-run]` | the interactive one-command release of a single package ([One command](#one-command-pnpm-release)) |
| `pnpm bump:core <type>` | `npm version <type>` for core (`patch` / `minor` / `major` / `<exact>` / `pre*`), then commit + tag `v<version>` |
| `pnpm bump:core:beta` | tick core's prerelease number (`2.0.1-beta.0` → `2.0.1-beta.1`), then commit + tag |
| `pnpm bump:<sub> <type>` | same for `utils` / `themes` / `components`, via [../scripts/bump-package.mjs](../scripts/bump-package.mjs) (scoped tag, e.g. `@json-edit-react/themes@1.0.1`) |
| `pnpm bump:<sub>:beta` | tick a sub-package's prerelease number, then commit + scoped tag |
| `pnpm pub:core:latest` | build + stage + publish core to `latest` |
| `pnpm pub:core:beta` | build + stage + publish core to `beta` |
| `pnpm pub:<sub>` | publish a sub-package to `latest` (via the README wrapper) |
| `pnpm pub:<sub>:beta` | publish a sub-package to `beta` (via the README wrapper) |

`<type>` is anything `npm version` accepts, passed straight through: `pnpm bump:themes 1.2.0`, `pnpm bump:core preminor --preid=beta`. The sub-package bumps go through `bump-package.mjs` because `npm version` only commits + tags from the git repo root — inside `packages/<name>` it edits `package.json` and stops, so the script makes the version commit and scoped annotated tag itself.

### Before you publish

- `npm whoami` succeeds (logged in to the right account).
- Working tree is **clean** — the `bump:*` scripts refuse to run otherwise, and the README wrapper restores via `git checkout`. Commit your CHANGELOG/work first.
- `pnpm install` has been run at the repo root.
- *First scoped publish only:* the `@json-edit-react` npm **org** exists and you have publish rights, or the first `pub:<sub>` fails.

### Release tags

Every `bump:*` tags its release, annotated; core's `v…` tags go back ~140 releases.

- **Core** → `v<version>` (e.g. `v2.0.1`), npm's default prefix.
- **Sub-packages** → scoped (e.g. `@json-edit-react/themes@1.0.1`), so the four packages' tags never collide. The first sub-package tags are the `1.0.0` releases; the `0.9.0-beta.x` line was never tagged.
- **V1** → `v1.x.y`, made by `yarn publish` on the `v1.x` branch.

Tags are created **locally** — nothing is pushed automatically. Push the release commit and its tag together with `git push --follow-tags`. Since the bumps won't run on a dirty tree, commit your work (including the CHANGELOG entry) *before* bumping; the bump lands as its own version commit on top.

### Dist-tag rules

- **Stable releases → `latest`** (`pub:core:latest`, `pub:<sub>`). `latest` is what a plain `npm install` resolves to and what the npm page shows.
- **Prereleases → `beta`** (`pub:core:beta`, `pub:<sub>:beta`), so trying out a change never moves `latest`. After the stable version ships, re-point `beta` at it (`npm dist-tag add <pkg>@<version> beta`) so `@beta` never resolves to something older than `latest`.
- **V1 patches → `v1-latest`**, baked into the `v1.x` branch's `release` script and `publishConfig.tag`. npm rejects dist-tags that are valid semver ranges, so it can't be plain `v1` — though `npm i json-edit-react@v1` works anyway, as a range.
- **Rule 2 — bump core before packing any sub-package.** Each sub-package declares `"json-edit-react": "workspace:^"`, and pnpm freezes that into the published peer-dep as `^<core's current version field>` at pack time. So when a release needs a new core, core's `version` must already be bumped before you pack a sub-package, or you ship a peer range pointing at the old core. Confirm it in the packed `package.json` (from the tarball, not `pack-output/` — see [Verify after publishing](#verify-after-publishing)).

### Choosing a bump type

`npm version <type>` (via `bump:<pkg> <type>`) does the semver arithmetic:

| Type | Effect |
| --- | --- |
| `major` | `2.0.3` → `3.0.0` |
| `minor` | `2.0.3` → `2.1.0` |
| `patch` | `2.0.3` → `2.0.4` |
| `prerelease --preid=beta` (`bump:<pkg>:beta`) | `2.0.3` → `2.0.4-beta.0`; `2.0.4-beta.0` → `2.0.4-beta.1` |
| `preminor --preid=beta` | `2.0.3` → `2.1.0-beta.0` |
| `premajor --preid=beta` | `2.0.3` → `3.0.0-beta.0` |
| `<exact>` | whatever you give it — e.g. `2.1.0` to graduate a `2.1.0-beta.N` line |

### No automatic cross-package cascade — by design

This is *why* the repo left Changesets. Changesets force-bumped every sub-package to a new **major** whenever core was released, because changing a peer-dependency range is structurally breaking for that package's consumers — and it did this even when the new core was still within range. That guess is usually wrong here: a core `2.0.1 → 2.1.0` doesn't break anything the sub-packages rely on. You know when a core change actually breaks them, so **you** decide: a core-only release touches only core; a real compatibility break means bumping and republishing everything together ([ship everything together](#ship-everything-together-a-compat-break)).

### Publishing mechanics

- **Core publishes from a staging dir.** `pnpm build-package` builds, then [../scripts/stage-package.mjs](../scripts/stage-package.mjs) populates `build_package/` with a trimmed `package.json` (its `publishConfig` is intentionally stripped), the `build/` output, `LICENSE`, `CHANGELOG.md`, and the short npm README. The root's `publishConfig.directory: "build_package"` makes `pnpm publish` ship from there. `pub:core:*` chains `build-package` then `pnpm publish`.
- **Sub-packages publish from their own dir** through [../scripts/with-npm-readme.mjs](../scripts/with-npm-readme.mjs), which swaps the committed README for its npm-friendly form (admonitions → bold-label blockquotes) and restores it via `git checkout` afterwards — even on failure. Each target README must be committed + clean first. `publishConfig.access: public` ships them public (npm scopes default to private), and a `prepack: pnpm build` hook rebuilds at publish time. The `pub:<sub>` / `pub:<sub>:beta` scripts use a `(cd packages/<name> && pnpm publish)` subshell (the pnpm 10.8.x `-C … publish` bug).
- **Preview == publish.** No package uses `prepublishOnly` / `postpublish` hooks, and `preview-publish` and `pub:*` route through the same README handling — so `pnpm preview-publish` shows exactly what npm receives. A bare `pnpm pack` / `pnpm publish` skips the sub-package README swap, so always go through the scripts.
- **After publishing**, `pnpm run versions` confirms the new numbers, and `pnpm sync-demos` bumps the demo to the just-published versions (polling npm until they're visible; it only updates packages already in the demo's `dependencies`).

### Inspecting and managing dist-tags

npm dist-tags advertise published versions: `latest` is what `npm install <pkg>` returns; `beta` / `next` / `rc` / etc. are opt-in via `npm install <pkg>@<tag>`.

```sh
pnpm run versions                          # all four packages at a glance
npm dist-tag ls json-edit-react            # latest: 2.0.x, beta: …, v1-latest: 1.30.x

# Promote/demote without re-publishing:
npm dist-tag add json-edit-react@2.1.0-beta.2 next
npm dist-tag rm  json-edit-react next
```

Moving `latest` onto an already-published prerelease is possible (`npm dist-tag add <pkg>@<version> latest`), but publishing the stable version explicitly keeps the version number honest — see [Ship a prerelease](#ship-a-prerelease).

## Bundle-size verification

For now: pack a package and install into a minimal Vite project, build, and inspect the output.

```sh
# 1. Pack
pnpm --filter @json-edit-react/components pack

# 2. Create a minimal Vite app (or reuse an existing one)
cd /tmp && npm create vite@latest test-app -- --template react-ts
cd test-app && yarn install
yarn add /path/to/json-edit-react/packages/components/json-edit-react-components-*.tgz

# 3. Import only what you want to measure in src/App.tsx, e.g.
#   import { Hyperlink } from '@json-edit-react/components'
# (or import nothing from it, for a baseline)

# 4. Build and inspect
yarn build      # note the dist/assets/*.js sizes; repeat with different imports to compare
```

For a more systematic approach, see the **bundle-size test scaffolding** planned in [#356](https://github.com/CarlosNZ/json-edit-react/issues/356) — a separate-repo side-project that automates this across Vite, CRA, Next.js, Webpack, Parcel, and esbuild consumer projects. `vite build --report` or `source-map-explorer` against `dist/assets/*.js` give per-import breakdowns.

## Troubleshooting / FAQ

### "This project is configured to use pnpm..." when running yarn

You're in or under a directory where corepack found `packageManager: "pnpm@..."`. Solution:
- If you're in `demo/`, that's wrong — it should have its own `packageManager: "yarn@1.22.22"` pin. Check the local `package.json`.
- If you're in repo root, you should be using pnpm. Run `pnpm <command>` instead.

### `pnpm --filter json-edit-react ...` says "No projects matched the filters"

The root workspace is configured via `include-workspace-root=true` in [../.npmrc](../.npmrc) which means `--filter` and `-r` include root by default. If you ever remove that setting, you'd need `--include-workspace-root` on each `--filter`/`-r` command.

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

### How do I un-publish a bad release?

Within 72 hours of publishing: `npm unpublish @json-edit-react/<name>@<version>` (or `pnpm unpublish`). After 72 hours, npm won't let you — publish a patch instead with a fix.

### TypeScript reports conflicting React/csstype types

Pre-pinned via `pnpm.overrides` in root [../package.json](../package.json):

```json
"pnpm": {
  "overrides": {
    "csstype": "3.2.3",
    "@types/react": "19.3.0"
  }
}
```

Demo's yarn install picks up specific versions; pnpm at root would otherwise pick the latest within the semver range, causing TS to see two type-identity-different copies via the path mappings. If the demo ever upgrades its `@types/react` or `react`, update the overrides to match.

### Pre/post script hooks aren't running

Pre/post hooks for arbitrary scripts (`prebuild`, `postbuild`, etc.) are enabled via `enable-pre-post-scripts=true` in [../.npmrc](../.npmrc). If you remove that, only npm-defined lifecycle hooks (`prepublishOnly`, `postpublish`) run.

### How do I clean everything and reinstall from scratch?

```sh
# Workspace + sub-packages
rm -rf node_modules packages/*/node_modules build packages/*/build
pnpm install

# Demo (independent)
rm -rf demo/node_modules demo/build
cd demo && yarn install && cd ..
```
