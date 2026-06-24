# v2.0.0 beta — first manual publish runbook

A step-by-step procedure for the **first** v2 publish, done entirely by hand (separate `build` and `publish` commands, no `pnpm release`). Target versions:

| Package | Version | npm dist-tag |
| --- | --- | --- |
| `json-edit-react` (core) | `2.0.0-beta.0` | `beta` |
| `@json-edit-react/utils` | `0.9.0-beta.0` | `beta` |
| `@json-edit-react/themes` | `0.9.0-beta.0` | `beta` |
| `@json-edit-react/components` | `0.9.0-beta.0` | `beta` |

Publish order: **utils → themes → components → core** (core last so the subpackages it ships alongside are already up).

## Two rules that keep this safe

**Rule 1 — everything goes to the `beta` tag, never `latest`.** `pnpm release` is `changeset publish`, and `changeset publish` with no `--tag` and no pre-mode is hard-coded to publish to `latest` (it does *not* read the prerelease suffix from the version string). We sidestep that entirely by publishing each package by hand with an explicit `--tag beta`. Core already has a stable `latest` (`1.30.1`), so `--tag beta` leaves it untouched — verify that after the core publish.

**Rule 2 — core's `version` field must read `2.0.0-beta.0` *before* you pack any subpackage.** Each subpackage declares `"json-edit-react": "workspace:^"`, and pnpm freezes that into the *published* peer-dep as `^<core's current version field>` at pack time. Core's field is currently `2.0.0-dev`, and `2.0.0-beta.0` does **not** satisfy `^2.0.0-dev` (because `beta` < `dev` in prerelease ordering). So if you pack a subpackage before fixing core's field, you ship a peer range your own core beta can't satisfy. `^2.0.0-beta.0` is the range you want — it accepts every `2.0.0-beta.N` and the eventual `2.0.0` final.

**Note on brand-new packages and `latest`.** npm always points `latest` at a package's very first published version, even when you pass `--tag beta`, because `latest` must exist and there's nothing else to point it at. So the three subpackages will end up with `latest` = `0.9.0-beta.0`. That's fine — they have no stable release yet, so a beta `latest` is the only sensible value, and it advances to a real release when you cut the 2.0.0 final. The package whose `latest` genuinely matters is core, and core is safe because it already has a stable `latest`.

## Why changeset consumption moves to the front

Your plan had "consume changesets" at the core stage, but the ~60 pending changesets target **all four** packages, and `pnpm changeset version` consumes them **atomically** in one pass — you can't consume "just core's." Doing it up front means: core's shipped `CHANGELOG.md` is ready before you stage core, and core's `version` field is correct before the first subpackage pack (Rule 2). Running it later would also re-bump the already-published subpackages, which is just churn. So changeset work lives in **Phase 0**, and the core stage becomes a pure build + publish.

Also note: `changeset version` *computes* the next numbers — core → `2.0.0`, and the subpackages → `0.1.0` / `0.2.0` / `1.0.0`. None of those is `0.9.0`, so we run it for the changelog + consumption and then hand-set the exact versions.

## Prerequisites (check once, before Phase 0)

- `npm whoami` succeeds (you're logged in to the right account).
- The `@json-edit-react` npm **org** exists and you have publish rights — the first scoped publish fails otherwise.
- You're on the intended branch and the working tree is clean (commit or stash anything in flight).
- `pnpm install` has been run at the repo root.

---

## Phase 0 — Version stamp + changelog (once, before any publish)

```sh
# 0.1  Clean slate
git status                       # tree clean, on the right branch
pnpm install

# 0.2  Preview what the changesets will do — your "changeset test run".
#      This is non-destructive: it prints planned bumps, writes nothing.
pnpm changeset status --verbose

# 0.3  Consume the changesets for real (writes CHANGELOGs, bumps
#      versions, deletes the .changeset/*.md files).
pnpm changeset version

# 0.4  Review everything it changed — especially core's CHANGELOG.md,
#      which ships to npm.
git diff
```

Then **hand-set the exact versions** (`changeset version` will have computed different numbers — override them):

- root `package.json` → `"version": "2.0.0-beta.0"`
- `packages/utils/package.json` → `"version": "0.9.0-beta.0"`
- `packages/themes/package.json` → `"version": "0.9.0-beta.0"`
- `packages/components/package.json` → `"version": "0.9.0-beta.0"`

Optionally tidy the top `CHANGELOG.md` header in each to match the beta version (core's changelog ships, so at least fix that one — change the generated `## 2.0.0` heading to `## 2.0.0-beta.0`).

```sh
# 0.5  Relink the workspace to the new versions, then sanity-check core.
pnpm install
pnpm compile
pnpm test

# 0.6  Commit the stamp (do NOT push/publish yet).
git add -A
git commit -m "Stamp v2.0.0-beta.0 / 0.9.0-beta.0 and consume changesets"
```

> **Checkpoint.** If the `changeset status` output or the `git diff` looks off (unexpected bump levels, a package you didn't expect to move, a malformed changelog), pause and send it to me before committing.

---

## Phase 1 — `@json-edit-react/utils` → `0.9.0-beta.0`

```sh
# 1.1  Build.
pnpm -C packages/utils build

# 1.2  Dry pack into a scratch dir and inspect — do NOT publish yet.
rm -rf /tmp/jre-pack && mkdir -p /tmp/jre-pack
pnpm -C packages/utils pack --pack-destination /tmp/jre-pack
tar -tzf /tmp/jre-pack/*.tgz                       # file list
tar -xzf /tmp/jre-pack/*.tgz -C /tmp/jre-pack
cat /tmp/jre-pack/package/package.json             # see below
```

In that packed `package.json`, confirm:
- `"version": "0.9.0-beta.0"`
- `"peerDependencies"."json-edit-react": "^2.0.0-beta.0"` ← **this is Rule 2 paying off**; if it reads `^2.0.0-dev`, stop — core's version field wasn't set before packing.
- `files` / contents are what you expect (no stray source, tests, or `node_modules`).

```sh
# 1.3  Publish to the beta tag — run from INSIDE the package dir via a
#      subshell. Do NOT use `pnpm -C packages/utils publish`: pnpm 10.8.x
#      leaks the -C dir and the command word into the npm call, so npm
#      sees multiple package-specs and fails with EUSAGE. (publish reruns
#      the prepack build — fine. --no-git-checks because the tree/branch
#      may not match pnpm's default publish-branch expectation.)
(cd packages/utils && pnpm publish --tag beta --access public --no-git-checks)
```

```sh
# 1.4  Verify on npm.
npm view @json-edit-react/utils version dist-tags
```

Then open `https://www.npmjs.com/package/@json-edit-react/utils` and check: README renders, version shown is `0.9.0-beta.0`, the `beta` tag is listed, the install snippet, the "Dependencies" tab shows the `^2.0.0-beta.0` peer dep, and the published file list looks right.

> **Checkpoint.** You wanted to thoroughly inspect the npm page before continuing — do that here. Ping me if anything's surprising.

---

## Phase 2 — `@json-edit-react/themes` → `0.9.0-beta.0`

Identical shape to Phase 1, swapping `packages/themes`:

```sh
pnpm -C packages/themes build
rm -rf /tmp/jre-pack && mkdir -p /tmp/jre-pack
pnpm -C packages/themes pack --pack-destination /tmp/jre-pack
tar -tzf /tmp/jre-pack/*.tgz
tar -xzf /tmp/jre-pack/*.tgz -C /tmp/jre-pack && cat /tmp/jre-pack/package/package.json
(cd packages/themes && pnpm publish --tag beta --access public --no-git-checks)
npm view @json-edit-react/themes version dist-tags
```

Same `package.json` checks (version, `^2.0.0-beta.0` peer dep, no runtime `dependencies` — themes is zero-dep). Then inspect the npm page.

---

## Phase 3 — `@json-edit-react/components` → `0.9.0-beta.0`

Same shape, `packages/components`:

```sh
pnpm -C packages/components build
rm -rf /tmp/jre-pack && mkdir -p /tmp/jre-pack
pnpm -C packages/components pack --pack-destination /tmp/jre-pack
tar -tzf /tmp/jre-pack/*.tgz
tar -xzf /tmp/jre-pack/*.tgz -C /tmp/jre-pack && cat /tmp/jre-pack/package/package.json
(cd packages/components && pnpm publish --tag beta --access public --no-git-checks)
npm view @json-edit-react/components version dist-tags
```

Extra checks specific to components — it's the one package with real runtime deps:
- The `dependencies` block lists the expected third-party libs (codemirror, react-datepicker, react-markdown, react-select, colord, etc.) at sensible ranges, and they're **not** bundled into the build output (they should resolve as deps, with the heavy ones lazy-loaded at runtime).
- The tarball is meaningfully larger than the other two — sanity-check the file list for anything unexpected.

Then inspect the npm page (it'll show the dependency list).

---

## Phase 4 — core: test run (no publish)

This is your "build core with a test run of everything" — it produces a real tarball from the staging dir without shipping it.

```sh
# 4.1  Build + stage + pack a real .tgz (build_package/ is the publish dir).
pnpm preview-publish

# 4.2  Inspect the staged tarball.
tar -tzf build_package/*.tgz
```

Confirm in the staged `build_package/package.json`:
- `"version": "2.0.0-beta.0"`
- `peerDependencies` has `react` (core is otherwise zero-dep).
- `CHANGELOG.md` is present in the tarball, and the README is the **short npm** one (not the long GitHub README).
- No `publishConfig` field (it's intentionally stripped from the staged copy).

```sh
# 4.3  Optional: ask npm exactly what it would do, without doing it.
pnpm publish --dry-run --tag beta --no-git-checks
```

Nothing is published in this phase.

---

## Phase 5 — core: publish for real

```sh
# 5.1  Rebuild + re-stage fresh (build_package/ is regenerated).
pnpm build-package

# 5.2  Publish from the repo root — pnpm reads publishConfig.directory
#      (build_package) and ships that staged dir. This is the manual
#      equivalent of `pnpm release` minus `changeset publish`.
pnpm publish --tag beta --no-git-checks
```

```sh
# 5.3  Verify — the critical check.
npm dist-tags ls json-edit-react
```

This **must** show `latest: 1.30.1` (unchanged) and `beta: 2.0.0-beta.0`. If `latest` moved, something published without `--tag beta` — stop and tell me. Then confirm `npm view json-edit-react@beta` and inspect the npm page.

> **Checkpoint.** Confirm the dist-tags before treating the release as done.

---

## Phase 6 — end-to-end install smoke test

Prove the four packages actually co-install and the peer ranges line up — this catches a peer-dep mistake the per-package checks can miss.

```sh
cd "$(mktemp -d)"
npm init -y >/dev/null
npm install react react-dom \
  json-edit-react@beta \
  @json-edit-react/utils@beta \
  @json-edit-react/themes@beta \
  @json-edit-react/components@beta
```

Expect a clean install with no `ERESOLVE` / unmet-peer errors. Core should resolve to `2.0.0-beta.0`. A tiny `import { JsonEditor } from 'json-edit-react'` in a throwaway file is a worthwhile extra confidence check.

---

## After this first run — ongoing beta cadence

The changesets are all consumed now, and there is **no** `.changeset/pre.json` in play (we never entered pre-mode), so the workflow stays simple:

- **A new beta of one package**: hand-bump just that package's `version` (keep the dotted `-beta.N` suffix and keep it moving forward), `build`, then `publish --tag beta`. Packages drift out of sync freely — that's expected.
- **Re-publishing a subpackage after core's beta moves**: its peer range re-freezes to core's *current* `version` field. Keep that field monotonic so the range never goes backwards.
- **Record changes for the eventual 2.0.0 changelog**: add a `pnpm changeset` per change as usual; they accumulate and get consumed when you cut the final.
- **Cutting 2.0.0 final**: publish core `2.0.0` to `latest` (advancing it off `1.30.1`), and publish the subpackage finals so their `latest` advances off the betas.
