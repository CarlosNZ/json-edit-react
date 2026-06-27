# Package Management Guide

The single reference for this repo's multi-package toolchain — installing, building, the demo harness, and releasing the four packages by hand. **[Quick reference](#quick-reference) is right below for fast lookup; the detailed reference follows.** New to pnpm/workspaces? Jump to [Overview](#overview).

Releases are **manual and ship-as-you-go** — no Changesets (see [Versioning and releasing](#versioning-and-releasing) for why).

---

# Quick reference

Per package, two steps: **bump the version, then publish.** pnpm doesn't prompt for a version like `yarn publish` did — you state the bump explicitly (a script for betas, or `npm version <exact>`), then publish. The fiddly parts (dist-tags, staging, the README wrapper, the subshell publish form) are baked into the `bump:*` / `pub:*` scripts. Concepts behind all this: [Versioning and releasing](#versioning-and-releasing).

> Core betas publish to the `beta` tag; sub-packages publish to `latest` (they have no stable release). Full rationale: [Two dist-tag rules](#two-dist-tag-rules).

## Which scenario?

| You want to… | Section |
| --- | --- |
| Ship a new core beta | [Core beta](#ship-a-core-beta) |
| Ship a new beta of one sub-package | [Sub-package beta](#ship-a-sub-package-beta) |
| Release everything together (a real compat break) | [Everything together](#ship-everything-together-a-compat-break) |
| Graduate the v2 beta to `2.0.0` stable | [Graduate to stable](#graduate-the-v2-beta-to-stable) |
| Ship one package to `latest` by hand | [Single-package stable](#single-package-stable) |

## Build & preview

`pnpm run versions` is your before/after gauge; `preview-publish` builds a real `.tgz` without publishing. Deeper: [Daily commands](#daily-commands), [Mock-publish workflow](#mock-publish-workflow).

```sh
pnpm run versions                            # local (next publish) vs what's on npm, all four packages
pnpm -r build                                # build all four (or --filter <name> build for one)
pnpm preview-publish                         # core: build + stage build_package/ + pack at repo root
pnpm --filter @json-edit-react/themes preview-publish   # one sub-package (build + README swap + pack)
pnpm pack-all                                # all four → pack-output/ (READMEs swapped; mirrors publish)
tar -tzf <pkg>-*.tgz                          # inspect a tarball's file list
tar -xzO -f <pkg>-*.tgz package/package.json  # check version + peer ranges
```

## Ship a core beta

```sh
pnpm run versions                         # 1. glance
#    edit CHANGELOG.md + commit your work — the tree must be CLEAN
#    (npm version refuses to run on a dirty tree)
pnpm bump:core:beta                       # 2. version commit + annotated tag v2.0.0-beta.4
pnpm preview-publish && tar -tzf json-edit-react-*.tgz   # 3. inspect what ships
pnpm pub:core:beta                        # 4. publish to the `beta` tag
git push --follow-tags                    # 5. push the version commit + its tag
pnpm run versions                         # 6. confirm npm shows the new beta
```

`bump:core:beta` makes the `v2.0.0-beta.4` commit + tag for you (npm-native, matching the existing `v…` tags) and leaves it local until you push. For an exact number: `npm version 2.0.0-beta.7` (it still commits + tags).

## Ship a sub-package beta

No core changes needed — the sub-package re-freezes its peer range to core's current `version` at pack time.

```sh
pnpm run versions
#    edit packages/themes/CHANGELOG.md + commit — the tree must be clean
pnpm bump:themes:beta                     # 0.9.0-beta.1 -> 0.9.0-beta.2 + tag (swap themes→utils/components)
pnpm --filter @json-edit-react/themes preview-publish   # inspect the .tgz
pnpm pub:themes                           # publishes to `latest` (no --tag)
git push --follow-tags                    # push the commit + its scoped tag
pnpm run versions
```

The tag is scoped — `@json-edit-react/themes@0.9.0-beta.2` — since plain `v…` tags would collide across packages. The package's README must also be committed and clean (the publish wrapper restores it with `git checkout`).

## Ship everything together (a compat break)

When a core change actually breaks the sub-packages. **Order matters:** bump core *before* the sub-packages, so each freezes the correct `^<new core>` peer range at pack time.

```sh
pnpm run versions
#    update all four CHANGELOGs + commit your work — tree must be clean
pnpm bump:core:beta                       # core FIRST; each bump makes its own commit + tag
pnpm bump:utils:beta
pnpm bump:themes:beta
pnpm bump:components:beta
pnpm pack-all                             # all four .tgz in pack-output/, READMEs swapped
#    inspect pack-output/<name>/package/package.json peer ranges (Rule 2 — see below)
pnpm pub:utils && pnpm pub:themes && pnpm pub:components   # sub-packages first
pnpm pub:core:beta                        # core last
git push --follow-tags                    # push all four version commits + tags
pnpm run versions
```

## Graduate the v2 beta to stable

The one-time moment core leaves beta and `latest` moves off `1.30.2`.

```sh
#    finalise CHANGELOGs + commit — tree must be clean
npm version 2.0.0                         # core 2.0.0-beta.N -> 2.0.0, commit + tag v2.0.0
#    (bump any sub-packages to their stable numbers too if shipping them)
pnpm preview-publish                      # inspect
pnpm pub:core:latest                      # core to `latest`
git push --follow-tags                    # push the v2.0.0 commit + tag
pnpm run versions
```

See the [V2 release plan](#v2-release-plan) for the surrounding decisions.

## Single-package stable

One package to `latest` by hand, no beta suffix:

```sh
#    edit packages/themes/CHANGELOG.md + commit — tree must be clean
(cd packages/themes && npm version patch --tag-version-prefix=@json-edit-react/themes@)  # or minor/major/<exact>
pnpm pub:themes                           # sub-packages already publish to `latest`
git push --follow-tags                    # push the commit + scoped tag
```

Don't do this for **core** while `1.30.2` is the intended `latest` — use `pub:core:beta` for betas and [Graduate to stable](#graduate-the-v2-beta-to-stable) for the cutover.

## Verify after publishing

```sh
pnpm run versions                                     # all four at a glance
npm dist-tags ls json-edit-react                       # core: latest must stay 1.30.2, beta = 2.0.0-beta.x
pnpm publish --dry-run --tag beta --no-git-checks      # (optional) ask npm what it would do, without doing it
```

In a packed tarball (`pnpm preview-publish` / `pack-all`), confirm before shipping:

- the **version** is what you bumped to;
- the frozen peer range reads `^<core's current beta>`, **not** a stale one (this is [Rule 2](#two-dist-tag-rules) paying off);
- the `README.md` is the npm form — bold-label blockquotes, not raw `[!NOTE]`;
- the file list is clean (no source, tests, `node_modules`); for `components`, its `dependencies` block lists the third-party libs at sensible ranges and they're not bundled into the build.

End-to-end co-install smoke test (catches peer-range mistakes the per-package checks miss):

```sh
cd "$(mktemp -d)" && npm init -y >/dev/null
npm install react react-dom \
  json-edit-react@beta \
  @json-edit-react/utils @json-edit-react/themes @json-edit-react/components
```

## Gotchas

- **`pnpm run versions` before and after** every release is your before/after snapshot. If "after" doesn't show the number you bumped to, something didn't publish.
- **Preview is mandatory, not optional.** There's no undo on npm (only an `unpublish` within 72 hours — a hassle). Inspect a real tarball before `pub:*`.
- **Core can't accidentally hit `latest`.** The dist-tag lives in the script name: `pub:core:beta` vs `pub:core:latest`.
- **`bump:*` needs a clean tree and makes a commit + tag.** `npm version` refuses a dirty tree, so commit your CHANGELOG/work first; the bump then lands a version commit + annotated tag (core `v<version>`, sub-packages scoped `@json-edit-react/<name>@<version>`). Tags stay local — push with `git push --follow-tags`.
- **`pnpm -C <dir> publish` is broken** on pnpm 10.8.x (leaks the dir + command word into npm → `EUSAGE`). The `pub:<sub>` scripts use the `(cd <dir> && pnpm publish …)` subshell form. `-C`/`--filter` are fine for `build` and `pack`.
- **The README wrapper needs each target README committed and clean** — it restores via `git checkout`, so an uncommitted edit gets clobbered.
- **A README-only change still needs a new published version** — npm has no in-place README edit. Bump the beta number and re-publish (betas are cheap).
- **The default npm page shows the `latest`-tagged version's README.** Sub-packages publish each beta to `latest`, so their page shows the newest beta README. Core's `latest` is `1.30.2`, so `npmjs.com/package/json-edit-react` shows the **v1** README until `2.0.0` ships; the v2-beta README is at `…/json-edit-react/v/2.0.0-beta.x`.

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
# → packages/themes/json-edit-react-themes-0.9.0-beta.1.tgz
```

The output is a `.tgz` named `<package-name>-<version>.tgz` (with the scope's `@` and `/` flattened — `@json-edit-react/themes` becomes `json-edit-react-themes`). `pnpm pack` honours the package's `files` array and `.npmignore`, so the tarball contains exactly what a real `pnpm publish` would push.

### Install the tarball into a test app

```sh
# In any external project (not the json-edit-react repo)
npm install /full/path/to/.../json-edit-react-themes-0.9.0-beta.1.tgz
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
| `pnpm bump:core:beta` | tick core's beta number, then commit + tag it `v2.0.0-beta.4` |
| `pnpm bump:<sub>:beta` | same for `utils` / `themes` / `components` (scoped tag, e.g. `@json-edit-react/themes@0.9.0-beta.2`) |
| `pnpm pub:core:beta` | build + stage + publish core to the `beta` tag |
| `pnpm pub:core:latest` | publish core to `latest` (the only thing that moves it) |
| `pnpm pub:<sub>` | publish a sub-package to `latest` (via the README wrapper) |

For an exact number, skip the script: `npm version 2.0.0-beta.7` (or `npm version major|minor|patch`) — for a sub-package add `--tag-version-prefix=@json-edit-react/<name>@` so the tag is scoped. `npm version` only touches the package you're in, and commits + tags it.

### Before you publish

- `npm whoami` succeeds (logged in to the right account).
- Working tree is **clean** — `npm version` (the `bump:*` scripts) refuses to run otherwise, and the README wrapper restores via `git checkout`. Commit your CHANGELOG/work first.
- `pnpm install` has been run at the repo root.
- *First scoped publish only:* the `@json-edit-react` npm **org** exists and you have publish rights, or the first `pub:<sub>` fails.

### Release tags

`bump:*` (and the release `npm version` commands) tag every release — npm's native tagging, restored; core's `v…` tags go back ~140 releases.

- **Core** → `v<version>` (e.g. `v2.0.0-beta.4`), npm's default prefix.
- **Sub-packages** → scoped, via `--tag-version-prefix` baked into `bump:<sub>:beta` (e.g. `@json-edit-react/themes@0.9.0-beta.2`), so the four packages' tags never collide.

Tags are annotated and created **locally** — nothing is pushed automatically. Push the release commit and its tag together with `git push --follow-tags`. Since `npm version` won't run on a dirty tree, commit your work (including the CHANGELOG entry) *before* bumping; the bump lands as its own version commit on top.

### Two dist-tag rules

- **Core betas → `--tag beta`** (baked into `pub:core:beta`), because core's `latest` is the stable `1.30.2` and must not move. Only `pub:core:latest` touches `latest`.
- **Sub-package betas → `latest`** (no `--tag`), because they have no stable release — each beta *is* their `latest`, which is what `npm install @json-edit-react/<name>` resolves to and what their npm page shows. (npm points `latest` at a package's first published version regardless of `--tag`; publishing every subsequent beta to `latest` keeps it advancing, which is the only sensible value pre-1.0 and carries straight into the eventual stable release. If an early publish left a redundant `beta` dist-tag on a sub-package, remove it: `npm dist-tag rm @json-edit-react/<name> beta`.)
- **Rule 2 — bump core before packing any sub-package.** Each sub-package declares `"json-edit-react": "workspace:^"`, and pnpm freezes that into the published peer-dep as `^<core's current version field>` at pack time. So core's `version` must already be the new beta before you pack a sub-package, or you ship a peer range your own core beta can't satisfy. Confirm it in the packed `package.json`: the peer dep should read `^<core's current beta>`.

### Choosing a bump type

`npm version <type>` does the semver arithmetic. For packages at `>= 1.0.0` (e.g. `json-edit-react`):

| Type | Effect |
| --- | --- |
| `major` | `1.5.3` → `2.0.0` |
| `minor` | `1.5.3` → `1.6.0` |
| `patch` | `1.5.3` → `1.5.4` |
| `prerelease --preid=beta` | `2.0.0-beta.3` → `2.0.0-beta.4` |

For packages at `< 1.0.0` (e.g. a sub-package at `0.9.0`), the pre-1.0 convention treats the minor slot as the breaking indicator: `major` and `minor` both go `0.9.0` → `0.10.0`; `patch` goes `0.9.0` → `0.9.1`. To cross `0.x` → `1.0.0`, set it explicitly: `npm version 1.0.0`.

### No automatic cross-package cascade — by design

This is *why* the repo left Changesets. Changesets force-bumped every sub-package to a new **major** whenever core was released, because changing a peer-dependency range is structurally breaking for that package's consumers — and it did this even when the new core was still within range. That guess is usually wrong here: a core `beta.3 → beta.4` doesn't break anything the sub-packages rely on. You know when a core change actually breaks them, so **you** decide: a core-only beta touches only core; a real compatibility break means bumping and republishing everything together ([ship everything together](#ship-everything-together-a-compat-break)).

### Publishing mechanics

- **Core publishes from a staging dir.** `pnpm build-package` builds, then [../scripts/stage-package.mjs](../scripts/stage-package.mjs) populates `build_package/` with a trimmed `package.json` (its `publishConfig` is intentionally stripped), the `build/` output, `LICENSE`, `CHANGELOG.md`, and the short npm README. The root's `publishConfig.directory: "build_package"` makes `pnpm publish` ship from there. `pub:core:*` chains `build-package` then `pnpm publish`.
- **Sub-packages publish from their own dir** through [../scripts/with-npm-readme.mjs](../scripts/with-npm-readme.mjs), which swaps the committed README for its npm-friendly form (admonitions → bold-label blockquotes) and restores it via `git checkout` afterwards — even on failure. Each target README must be committed + clean first. `publishConfig.access: public` ships them public (npm scopes default to private), and a `prepack: pnpm build` hook rebuilds at publish time. The `pub:<sub>` scripts use a `(cd packages/<name> && pnpm publish)` subshell (the pnpm 10.8.x `-C … publish` bug).
- **Preview == publish.** No package uses `prepublishOnly` / `postpublish` hooks, and `preview-publish` and `pub:*` route through the same README handling — so `pnpm preview-publish` shows exactly what npm receives. A bare `pnpm pack` / `pnpm publish` skips the sub-package README swap, so always go through the scripts.
- **After publishing**, `pnpm run versions` confirms the new numbers, and `pnpm sync-demos` bumps the demo to the just-published versions (polling npm until they're visible; it only updates packages already in the demo's `dependencies`).

### Inspecting and managing dist-tags

npm dist-tags advertise published versions: `latest` is what `npm install <pkg>` returns; `beta` / `next` / `rc` / etc. are opt-in via `npm install <pkg>@<tag>`.

```sh
pnpm run versions                          # all four packages at a glance
npm dist-tag ls json-edit-react            # latest: 1.30.2, beta: 2.0.0-beta.x

# Promote/demote without re-publishing:
npm dist-tag add json-edit-react@2.0.0-beta.4 next
npm dist-tag rm  json-edit-react beta
```

Moving the `latest` tag onto a beta is one way to graduate a release, but the cleaner way for the v2 cutover is to publish the stable version explicitly (`pub:core:latest`) — see [Graduate to stable](#graduate-the-v2-beta-to-stable).

## V2 release plan

The path from the current `2.0.0-beta.N` line to a stable `2.0.0`:

> [!IMPORTANT]
> Create a `v1.x` branch off `main` before merging `v2.0-dev`, so v1 can still receive patches after `latest` moves to v2.

1. **Keep shipping betas** as core work lands — `pnpm bump:core:beta` + `pnpm pub:core:beta`, recording each change in `CHANGELOG.md`. Sub-packages publish their own betas to `latest` as they change.
2. **Decide the sub-package version line.** They're pre-1.0 (`0.9.x`); whether they cross to `1.0.0` at the v2 launch is a deliberate call (`1.0.0` signals committed API stability — possibly premature for new packages). Set whatever you choose explicitly with `npm version <exact>`.
3. **Cut stable.** Bump core to `2.0.0` (`npm version 2.0.0 --no-git-tag-version`), finalise the CHANGELOGs, and publish core to `latest` with `pnpm pub:core:latest`. This moves npm's `latest` from v1.x to v2.0.0, so plain `npm install json-edit-react` starts returning v2. [Graduate to stable](#graduate-the-v2-beta-to-stable) has the exact steps.

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

For a more systematic approach, see the **bundle-size test scaffolding** in [../V2-roadmap.md](../V2-roadmap.md) — a planned future side-project that automates this across Vite, CRA, Next.js, Webpack, Parcel, and esbuild consumer projects. `vite build --report` or `source-map-explorer` against `dist/assets/*.js` give per-import breakdowns.

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
    "csstype": "3.1.3",
    "@types/react": "19.1.1"
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
