# Publishing cheat sheet

Quick command reference for building, packing, and publishing the four packages — core (`json-edit-react`) and the three scoped sub-packages (`@json-edit-react/utils`, `@json-edit-react/themes`, `@json-edit-react/components`).

Two release modes:

- **Beta** → published by hand, per package. **Core** goes to the **`beta`** dist-tag; **sub-packages** go to **`latest`** (see Rule 1). `changeset publish` with no `--tag` and no pre-mode ships everything to `latest`, which is wrong for core, so beta is done by hand.
- **Full / latest** → driven by Changesets via `pnpm release`, all packages at once.

Two rules carry over from [v2-beta-publish-runbook.md](v2-beta-publish-runbook.md) — read it for the full first-publish procedure:

1. **Core betas → `--tag beta`; sub-package betas → `latest`.** Core's `latest` is the stable `1.30.1` and must not move, so core betas always pass `--tag beta`. The sub-packages have no stable release, so each new beta should *be* their `latest` — that's what `npm install @json-edit-react/<name>` resolves to and what their npm page shows. So sub-packages publish with **no `--tag`** (the version string stays `-beta.N`; only the dist-tag differs).
2. **Core's `version` field must be the beta version before packing any sub-package** — each sub-package freezes `"json-edit-react": "workspace:^"` into `^<core's current version>` at pack time.

Sub-package npm READMEs are produced by [scripts/with-npm-readme.mjs](../scripts/with-npm-readme.mjs): it swaps the committed README for its admonition-converted form during pack/publish, then restores it via `git checkout`. **Each target README must be committed (clean) first**, independent of `--no-git-checks`. The blessed scripts (`preview-publish`, `release`) route through it; a bare `pnpm publish` does not — so beta publishes below invoke the wrapper explicitly.

---

## Build

```sh
pnpm build                                   # core only (runs lint + tests via prebuild)
pnpm --filter @json-edit-react/themes build  # one sub-package (or -C packages/themes build)
pnpm -r build                                # all (alias: pnpm build-all)
```

## Pack / preview (inspect a real .tgz — publishes nothing)

```sh
pnpm preview-publish                                   # core: build + stage build_package/ + pack at repo root
pnpm --filter @json-edit-react/themes preview-publish  # one sub-package (build + README swap + pack)
pnpm pack-all                                          # all four → pack-output/ (swaps READMEs — mirrors publish; needs them committed)
```

Inspect any tarball:

```sh
tar -tzf <pkg>-*.tgz                                   # file list
tar -xzO -f <pkg>-*.tgz package/package.json           # peer ranges, version, fields
tar -xzO -f <pkg>-*.tgz package/README.md | head       # confirm bold-label blockquotes, not raw [!NOTE]
```

## Beta publish (manual, per package)

Publish order: **utils → themes → components → core** (core last). Sub-packages publish to **`latest`** (no `--tag`); core to **`beta`**. Each sub-package goes through the wrapper so its npm README is converted; core publishes from its staging dir (already converted), so no wrapper.

```sh
# Sub-package → latest (no --tag). The subshell + plain `pnpm publish` avoids
# the pnpm 10.8.x `-C ... publish` EUSAGE bug; publish reruns the prepack
# build. --no-git-checks because the branch/tree may not match pnpm's default
# publish-branch expectation.
(cd packages/utils && \
  node ../../scripts/with-npm-readme.mjs . -- \
  pnpm publish --access public --no-git-checks)

# ...repeat for packages/themes, then packages/components.

# Core → beta (from repo root — pnpm ships the staged build_package/ dir).
pnpm build-package
pnpm publish --tag beta --no-git-checks
```

There's no one-shot "publish all betas" command by design (`changeset publish` would push core to `latest`) — run the sequence above.

## Incremental beta — tweak one package, ship a new beta

The quick inner loop. No changeset, no `pnpm install`, no separate build (publish reruns `prepack`). The only requirement is a fresh version number — npm rejects republishing the same one.

```sh
# Sub-package → latest: bump the prerelease (0.9.0-beta.0 -> 0.9.0-beta.1),
# then publish with no --tag.
(cd packages/<name> && npm version prerelease --preid=beta --no-git-tag-version)
(cd packages/<name> && \
  node ../../scripts/with-npm-readme.mjs . -- \
  pnpm publish --access public --no-git-checks)

# Core → beta: bump the root version, then build + stage + publish from root.
npm version prerelease --preid=beta --no-git-tag-version
pnpm build-package && pnpm publish --tag beta --no-git-checks
#   SKIP_TESTS=1 pnpm build-package skips the jest suite (lint still runs).
```

A sub-package doesn't need core touched — it re-freezes its `json-edit-react` peer range to core's current `version` field, already a valid beta. Committing is optional for a code-only tweak (the wrapper's clean-check looks at the README only; `--no-git-checks` allows a dirty tree) — but commit if the tweak touched that package's README, and ideally so each published beta maps to a commit.

## Full release → `latest` (Changesets, all together)

```sh
# 1. Consume changesets: bump versions + write CHANGELOGs, delete .changeset/*.md.
pnpm changeset status --verbose     # preview first (writes nothing)
pnpm changeset version
git diff                            # review, especially core's shipped CHANGELOG.md

# 2. Relink the workspace to the new versions and re-validate.
pnpm install
pnpm compile && pnpm test
git add -A && git commit -m "Version packages"

# 3. Publish everything ahead of npm to `latest`. `release` = build-package
#    (core staging) + the with-npm-readme wrapper around `changeset publish`,
#    so every sub-package README is converted and restored automatically.
pnpm release
```

Single package to `latest` by hand (no `--tag` = latest):

```sh
(cd packages/themes && \
  node ../../scripts/with-npm-readme.mjs . -- \
  pnpm publish --access public --no-git-checks)
```

## Verify after publishing

```sh
npm view @json-edit-react/utils version dist-tags    # sub-package: latest = newest beta
npm dist-tags ls json-edit-react                      # core: latest must stay 1.30.1, beta = 2.0.0-beta.x
```

End-to-end co-install smoke test (catches peer-range mistakes the per-package checks miss). Sub-packages resolve from `latest` (plain name); core needs `@beta`:

```sh
cd "$(mktemp -d)" && npm init -y >/dev/null
npm install react react-dom \
  json-edit-react@beta \
  @json-edit-react/utils @json-edit-react/themes @json-edit-react/components
```

## Gotchas

- **`pnpm -C <dir> publish` is broken** on pnpm 10.8.x (leaks the dir + command word into npm → `EUSAGE`). Use the `(cd <dir> && pnpm publish …)` subshell form. `-C`/`--filter` are fine for `build` and `pack`.
- **The wrapper needs each target README committed and clean** — it restores via `git checkout`, so an uncommitted edit would either abort the run or be clobbered. Commit/stash README edits before publishing.
- **`pnpm pack-all` swaps the READMEs**, so `pack-output/<name>/package/README.md` mirrors what publishes — the easiest place to inspect the final READMEs. It needs the sub-package READMEs committed (clean); pass `SKIP_NPM_README_SWAP=1` to pack without the swap.
- **A README-only change still needs a new published version** — npm has no in-place README edit; the README is baked into each version. Bump the beta number and re-publish (betas are cheap). To inspect locally without publishing, use `preview-publish` or `pack-all` and read the tarball / `pack-output/`.
- **The default npm page shows the `latest`-tagged version's README.** Sub-packages publish each beta to `latest`, so their default page always shows the newest converted beta README. Core's `latest` is `1.30.1`, so `npmjs.com/package/json-edit-react` shows the **v1** README until `2.0.0` ships to `latest`; the v2-beta README lives at `npmjs.com/package/json-edit-react/v/2.0.0-beta.x`, and republishing a core beta won't change the main page.
- **Never run `pnpm release` / `pnpm publish` / `pnpm changeset publish` unless explicitly intended** — there's no `changeset publish --dry-run`; preview with `pnpm preview-publish` per package and `pnpm changeset status`.
