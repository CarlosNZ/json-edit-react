# Publishing Cheat Sheet

A one-page lookup for shipping each of the four packages. For the scenario playbooks, the reasoning behind any of it, and troubleshooting, see [package-management-guide.md](package-management-guide.md) — this page is deliberately just the commands.

Releases are **manual and ship-as-you-go**. Every release is the same two steps: **bump, then publish.** Nothing is automated, nothing cascades.

---

## The four packages at a glance

| Package | Dir | Bump a beta | Publish | Lands on dist-tag |
| --- | --- | --- | --- | --- |
| `json-edit-react` (core) | repo root | `pnpm bump:core:beta` | `pnpm pub:core:beta` | `beta` |
| `@json-edit-react/utils` | `packages/utils` | `pnpm bump:utils:beta` | `pnpm pub:utils` | `latest` |
| `@json-edit-react/themes` | `packages/themes` | `pnpm bump:themes:beta` | `pnpm pub:themes` | `latest` |
| `@json-edit-react/components` | `packages/components` | `pnpm bump:components:beta` | `pnpm pub:components` | `latest` |

**Why core is the odd one out:** core has a live stable release (`1.30.2`) on `latest` that must not move until v2 ships, so its betas go to the `beta` tag. The sub-packages have no stable release, so each beta *is* their `latest` and they publish with no `--tag`.

`pnpm run versions` prints local-vs-npm for all four. Run it before and after every release — it's the before/after snapshot that tells you whether anything actually shipped.

---

## Before you bump — every time

1. **Write the CHANGELOG entry by hand** (the package's own `CHANGELOG.md`). No Changesets in this repo.
2. **Commit everything.** `npm version` refuses to run on a dirty tree, and for sub-packages the README wrapper restores via `git checkout`, so an uncommitted README edit gets clobbered.
3. **Preview the tarball.** There is no undo on npm beyond a 72-hour `unpublish`.

Each `bump:*` makes its own version commit **and** an annotated tag — `v<version>` for core, scoped `@json-edit-react/<name>@<version>` for sub-packages (plain `v…` tags would collide across packages). Tags stay local until you `git push --follow-tags`.

---

## Ship a core beta

```sh
pnpm run versions            # 1. glance
                             #    CHANGELOG.md + commit first — tree must be clean
pnpm bump:core:beta          # 2. 2.0.0-beta.N -> beta.N+1, commit + tag
pnpm preview-publish         # 3. build + stage + pack at repo root
tar -tzf json-edit-react-*.tgz    #    inspect what ships
pnpm pub:core:beta           # 4. publish to the `beta` tag
git push --follow-tags       # 5. push the version commit + tag
pnpm run versions            # 6. confirm
```

For an exact number instead of a prerelease increment: `npm version 2.0.0-beta.12` (still commits + tags).

Core publishes from the `build_package/` staging dir, not the repo root — `publishConfig.directory` handles that, and `build-package` populates it (trimmed `package.json`, `build/`, `LICENSE`, `CHANGELOG.md`, and a generated npm `README.md`). The repo's own `README.md` is never touched.

## Ship a sub-package beta

Swap `themes` for `utils` / `components` throughout. No core changes needed.

```sh
pnpm run versions
                             # packages/themes/CHANGELOG.md + commit — tree clean
pnpm bump:themes:beta        # 0.9.0-beta.N -> beta.N+1, commit + scoped tag
pnpm --filter @json-edit-react/themes preview-publish   # inspect the .tgz
pnpm pub:themes              # publishes to `latest` (no --tag)
git push --follow-tags
pnpm run versions
```

Each sub-package's peer dep on core is `workspace:^` in the repo and is frozen to `^<core's current version>` at pack time. That means: **if core's version matters for this release, bump core first.**

## Ship everything together

Only when a core change actually breaks the sub-packages. **Order matters** — core's version bump has to land before anything is packed, and core publishes last so its dependents are already on npm.

```sh
                             # all four CHANGELOGs + commit — tree clean
pnpm bump:core:beta          # core FIRST
pnpm bump:utils:beta
pnpm bump:themes:beta
pnpm bump:components:beta
pnpm pack-all                # all four -> pack-output/, READMEs swapped
                             # check each pack-output/<name>/package/package.json
                             # peer range reads ^<new core version>
pnpm pub:utils && pnpm pub:themes && pnpm pub:components
pnpm pub:core:beta           # core LAST
git push --follow-tags
pnpm run versions
```

## Ship a stable (non-beta) release

Sub-packages already publish to `latest`, so a stable release is just a non-prerelease bump:

```sh
(cd packages/themes && npm version patch \
  --tag-version-prefix=@json-edit-react/themes@)     # or minor/major/<exact>
pnpm pub:themes
git push --follow-tags
```

For **core**, this is the one-time v2 cutover — `npm version 2.0.0` then `pnpm pub:core:latest`. Don't run `pub:core:latest` while `1.30.2` is meant to stay `latest`; see [Graduate the v2 beta to stable](package-management-guide.md#graduate-the-v2-beta-to-stable).

---

## Verify a release

```sh
pnpm run versions                      # all four, local vs npm
npm dist-tag ls json-edit-react        # core: latest=1.30.2, beta=2.0.0-beta.x
npm view json-edit-react@beta version  # what `@beta` actually resolves to
```

In the packed tarball, confirm the version is what you bumped to, the frozen peer range isn't stale, the `README.md` is the npm form (bold-label blockquotes, not raw `[!NOTE]`), and the file list has no source/tests/`node_modules`.

---

## Traps

- **npmjs.com's "Current Tags" panel is cached** and lags the registry after a publish. A correctly-tagged beta can look untagged on the website for a while. `npm dist-tag ls` is the source of truth — trust it over the web page.
- **Preview is mandatory.** Always inspect a real `.tgz` before `pub:*`.
- **A README-only change still needs a new published version** — npm has no in-place README edit. Bump the beta and re-publish; betas are cheap.
- **Core can't accidentally hit `latest`** — the dist-tag is baked into the script name (`pub:core:beta` vs `pub:core:latest`).
- **Always go through the `pub:*` / `preview-publish` scripts.** A bare `pnpm publish` in a sub-package skips the npm-README swap.
- **`pnpm -C <dir> publish` is broken** on pnpm 10.8.x, which is why `pub:<sub>` uses the `(cd <dir> && pnpm publish)` subshell form. `-C` / `--filter` are fine for `build` and `pack`.
- **Core's npm page shows the v1 README** until `2.0.0` ships, because the default page renders whatever `latest` points at. The v2-beta README lives at `…/json-edit-react/v/2.0.0-beta.x`.
- **Never run `pub:*` or `release-demo` unattended** — publishing and the demo deploy are both explicit, ask-first actions.
