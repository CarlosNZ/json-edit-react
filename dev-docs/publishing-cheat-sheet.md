# Publishing Cheat Sheet

A one-page lookup for shipping each of the four packages. For the scenario playbooks, the reasoning behind any of it, and troubleshooting, see [package-management-guide.md](package-management-guide.md) — this page is deliberately just the commands.

Releases are **manual and ship-as-you-go**. Every release is the same two steps: **bump, then publish.** Nothing is automated, nothing cascades.

---

## The four packages at a glance

| Package | Dir | Bump | Publish stable (`latest`) | Publish prerelease (`beta`) |
| --- | --- | --- | --- | --- |
| `json-edit-react` (core) | repo root | `pnpm bump:core <type>` / `bump:core:beta` | `pnpm pub:core:latest` | `pnpm pub:core:beta` |
| `@json-edit-react/utils` | `packages/utils` | `pnpm bump:utils <type>` / `bump:utils:beta` | `pnpm pub:utils` | `pnpm pub:utils:beta` |
| `@json-edit-react/themes` | `packages/themes` | `pnpm bump:themes <type>` / `bump:themes:beta` | `pnpm pub:themes` | `pnpm pub:themes:beta` |
| `@json-edit-react/components` | `packages/components` | `pnpm bump:components <type>` / `bump:components:beta` | `pnpm pub:components` | `pnpm pub:components:beta` |

`<type>` is anything `npm version` takes: `patch`, `minor`, `major`, an exact version, or `preminor --preid=beta` and friends. **The dist-tag is in the publish script's name** — a prerelease published with the plain script becomes the default install.

V1 is maintained separately on the `v1.x` branch and publishes to `v1-latest` — see [Ship a V1 patch](package-management-guide.md#ship-a-v1-patch).

**Or in one go:** `pnpm release` asks which package and which version, checks the CHANGELOG, then bumps, runs the checks, commits + tags and publishes under the right dist-tag (`pnpm release --dry-run` first to rehearse; `git push --follow-tags` afterwards). See [One command](package-management-guide.md#one-command-pnpm-release).

`pnpm run versions` prints local-vs-npm for all four. Run it before and after every release — it's the before/after snapshot that tells you whether anything actually shipped.

---

## Before you bump — every time

1. **Write the CHANGELOG entry by hand** (the package's own `CHANGELOG.md`). No Changesets in this repo.
2. **Commit everything.** The bump scripts refuse to run on a dirty tree, and for sub-packages the README wrapper restores via `git checkout`, so an uncommitted README edit gets clobbered.
3. **Preview the tarball.** There is no undo on npm beyond a 72-hour `unpublish`.

Each `bump:*` makes its own version commit **and** an annotated tag — `v<version>` for core, scoped `@json-edit-react/<name>@<version>` for sub-packages (plain `v…` tags would collide across packages). Tags stay local until you `git push --follow-tags`.

---

## Ship a stable release

```sh
pnpm run versions            # 1. glance
                             #    CHANGELOG.md + commit first — tree must be clean
pnpm bump:core patch         # 2. 2.0.0 -> 2.0.1, commit + tag v2.0.1
pnpm preview-publish         # 3. build + stage + pack at repo root
tar -tzf json-edit-react-*.tgz    #    inspect what ships
pnpm pub:core:latest         # 4. publish to `latest`
git push --follow-tags       # 5. push the version commit + tag
pnpm run versions            # 6. confirm
```

Core publishes from the `build_package/` staging dir, not the repo root — `publishConfig.directory` handles that, and `build-package` populates it (trimmed `package.json`, `build/`, `LICENSE`, `CHANGELOG.md`, and a generated npm `README.md`). The repo's own `README.md` is never touched.

A sub-package (swap `themes` for `utils` / `components`):

```sh
                             # packages/themes/CHANGELOG.md + commit — tree clean
pnpm bump:themes patch       # 1.0.0 -> 1.0.1, commit + scoped tag
pnpm --filter @json-edit-react/themes preview-publish   # inspect the .tgz
pnpm pub:themes              # publish to `latest`
git push --follow-tags
pnpm run versions
```

Each sub-package's peer dep on core is `workspace:^` in the repo and is frozen to `^<core's current version>` at pack time. That means: **if core's version matters for this release, bump core first.**

## Ship a prerelease

The `:beta` variant of both scripts, for any package:

```sh
pnpm bump:themes:beta        # 1.0.0 -> 1.0.1-beta.0, then -beta.1, …
pnpm --filter @json-edit-react/themes preview-publish
pnpm pub:themes:beta         # publish to `beta` — `latest` doesn't move
git push --follow-tags
```

For a minor/major prerelease: `pnpm bump:core preminor --preid=beta` (`2.0.0` → `2.1.0-beta.0`), then `bump:core:beta` for each further beta. To graduate, ship a stable release with the exact number (`pnpm bump:core 2.1.0` + `pnpm pub:core:latest`), then re-point `beta`: `npm dist-tag add json-edit-react@2.1.0 beta`.

## Ship everything together

Only when a core change actually breaks the sub-packages. **Order matters** — core's version bump has to land before anything is packed. Publish all four back to back.

```sh
                             # all four CHANGELOGs + commit — tree clean
pnpm bump:core major         # core FIRST
pnpm bump:utils major        # (or whatever each change warrants)
pnpm bump:themes major
pnpm bump:components major
pnpm pack-all                # all four, READMEs swapped
                             # check each sub-package's peer range FROM ITS TARBALL
                             # (pack-output/ copies have peerDependencies stripped)
pnpm pub:utils && pnpm pub:themes && pnpm pub:components
pnpm pub:core:latest         # core LAST
git push --follow-tags
pnpm run versions
```

---

## Verify a release

```sh
pnpm run versions                      # all four, local vs npm
npm dist-tag ls json-edit-react        # latest = stable, beta = prerelease, v1-latest = 1.x
```

In the packed tarball, confirm the version is what you bumped to, the frozen peer range isn't stale, the `README.md` is the npm form (bold-label blockquotes, not raw `[!NOTE]`), and the file list has no source/tests/`node_modules`.

---

## Traps

- **npmjs.com's "Current Tags" panel is cached** and lags the registry after a publish. A correctly-tagged release can look untagged on the website for a while. `npm dist-tag ls` is the source of truth — trust it over the web page.
- **Preview is mandatory.** Always inspect a real `.tgz` before `pub:*`.
- **A README-only change still needs a new published version** — npm has no in-place README edit. Bump a patch and re-publish.
- **Prereleases go through the `:beta` scripts only.** `pub:<pkg>` / `pub:core:latest` publish to `latest`, whatever the version number says.
- **Don't run `npm version` directly in `packages/<name>`** — away from the repo root it makes no commit or tag. Use `pnpm bump:<name>`.
- **`pack-output/` isn't the published manifest.** `pack-all` strips `peerDependencies` / `devDependencies` from its extracted copies; read peer ranges from a tarball.
- **Always go through the `pub:*` / `preview-publish` scripts.** A bare `pnpm publish` in a sub-package skips the npm-README swap.
- **`pnpm -C <dir> publish` is broken** on pnpm 10.8.x, which is why `pub:<sub>` uses the `(cd <dir> && pnpm publish)` subshell form. `-C` / `--filter` are fine for `build` and `pack`.
- **Dist-tag names can't be semver ranges** — npm rejects `v1`, hence V1's `v1-latest`.
- **Never run `pub:*` or `release-demo` unattended** — publishing and the demo deploy are both explicit, ask-first actions.
