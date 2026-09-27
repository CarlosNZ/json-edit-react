# V2.0 release — transition checklist

Temporary working doc for the V2.0 cutover. Delete it once the release is done and the follow-ups are filed as issues.

**Target end state**

| | Before | After |
| --- | --- | --- |
| `npm i json-edit-react` | `1.30.2` | `2.0.0` |
| `json-edit-react@beta` | `2.0.0-beta.10` | `2.0.0` (re-pointed) |
| `json-edit-react@v1` | — | `1.30.2` (new dist-tag) |
| `@json-edit-react/{utils,themes,components}` | `0.9.0-beta.x` | `1.0.0` |
| Repo `README.md` | V1 docs + beta banner | V2 docs (from `README_V2.md`) |
| V1 docs | `README.md` on `main` | `README.md` on the `v1.x` branch |
| `carlosnz.github.io/json-edit-react/` | V1 demo + "V2 in beta" banner | V2 demo |
| `carlosnz.github.io/json-edit-react-v1/` | — | V1 demo (new repo `CarlosNZ/json-edit-react-v1`) |
| `carlosnz.github.io/json-edit-react-v2/` | V2 preview demo | Redirect shim → `/json-edit-react/` (same path + query) |

**Why this order.** The npm READMEs are frozen at publish time, so the docs changes land *before* any publish. Core publishes *before* the sub-packages this time, the opposite of the "ship everything together" playbook. The sub-packages' `1.0.0` will freeze a `^2.0.0` peer range, and if they went first there'd be a window where `npm i @json-edit-react/themes` can't resolve a core that satisfies it. Going the other way, core `2.0.0` still satisfies the old sub-package betas (`^2.0.0-beta.x` includes `2.0.0`), so there's no broken window. The V1 demo goes up first so the V2 banner's "looking for V1?" link is never dead.

---

## Phase 0 — Pre-flight fixes (on `main`, before anything else)

**Verification run (2026-09-27, `main` @ `9a85925`). No technical blockers.** Everything below passed, and the tree was clean afterwards:

- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm compile` (tsc clean; ts-prune flags only three internal unused exports: `ResolvedStyles`, `useEditing` / `useFilterActive` re-exports in `src/contexts/index.ts`)
- `pnpm test`: 34 suites, 750 passed, 2 todo (includes `packages/*/test`)
- `pnpm -r build`, with all four `verify-treeshake` guards OK and no TS warnings in the sub-package builds
- `pnpm pack-all` + core `preview-publish`: file lists clean, admonitions converted in all four npm READMEs
- Demo type-check and `vite build` against the **packed** artefacts; Node ESM + CJS import of every published entry

**Decide before tagging components `1.0.0`.** Each of these is semver-major to change *after* 1.0:

- [x] **`react-datepicker` 7 → 9** (#408). `datePickerProps` passes straight through to the library, so moving to 9 *after* 1.0 would mean a components major. **Trialled 2026-09-27 and it's a drop-in.** With `^9.1.0` in a scratch worktree, components builds, type-checks (including the public `datePickerProps` type) and passes both tree-shake guards, and all 750 tests pass. In Chrome, the date-picker example on 7.6.0 and 9.1.0 is pixel-near-identical: same calendar box (±1px), same font and day-cell sizes, same time list. The only visible change is the header border moving above the weekday row. Typed input (`Oct 3, 2025 4:45 PM`) parses and commits identically on both, so the v8 `parseDate` change doesn't bite our default formats. Recommendation: **bump before 1.0**, since there's no rework.
  - [x] `packages/components/package.json`: `"react-datepicker": "^9.1.0"`, then `pnpm install`. The saved diff is in the session scratchpad as `react-datepicker-9.patch`, but it's a one-line change plus the lockfile.
  - [x] `demo/package.json`: `"react-datepicker": "^9.1.0"`, then `cd demo && yarn install`. The demo's own copy is what `pack` / `build` modes resolve, so bump it too or those modes keep testing 7.
  - [x] `packages/components/CHANGELOG.md`: add a line under 1.0.0. Consumers passing date-fns `locale` objects via `datePickerProps` need date-fns v4 locales (react-datepicker 8 moved to date-fns 4).
- [x] **`/widgets` entry shape** (#404). **Decided: ship 1.0 with `/widgets` unchanged (option A).** It costs ~3.3 kB gzip of unused react-datepicker CSS for `/widgets` users who don't use the date picker. The follow-up is non-breaking, so it can be a 1.x minor: try fixing it inside `ReactDatePicker` first (option D), and fall back to per-widget subpaths alongside the barrel (option C). Triage is in [this #404 comment](https://github.com/CarlosNZ/json-edit-react/issues/404#issuecomment-5854450862).

**Cosmetic, fine to leave for later**

- `CHANGELOG.md` is copied into `build_package/` but never reaches the tarball: `files: ["build/**/*"]`, and npm doesn't auto-include changelogs. It was the same for 1.30.2. Either add it to the staged `files` or stop copying it.
- The core npm README's `<img src="image/…">` paths stay relative. Glance at the npm page after publishing to check the logo and screenshot render; beta.10 has the same setup.
- arethetypeswrong: "unexpected module syntax" on `.esm.js` files in packages without `"type": "module"`. Bundlers are fine, and Node reparses with a warning. This has been the case since v1.
- Metadata gaps: no `engines` or `bugs` anywhere, and no `author` on the sub-packages.

## Phase 1 — Give V1 its own home (`v1.x` branch)

The edits are prepared, uncommitted, in a **separate worktree at `../json-edit-react-v1.x`** (branch `v1.x`), so your main checkout never has to switch branches. Its root, `custom-component-library/` and `demo/` deps are installed, and the demo builds with the new base: every asset is under `/json-edit-react-v1/`, `noindex` is present, and it uses `json-edit-react@1.30.2` from npm. It also renders with the new banner, with no page errors.

- [x] **Stop V1 publishes from clobbering `latest`.** In `package.json`, `"release": "yarn publish --tag v1"`, plus `"publishConfig": { "tag": "v1" }` as a belt-and-braces guard.
- [x] **V1 README notice** (inside the `NPM INTRO` block, so it also reaches any future 1.x npm page): "You're reading the V1 docs", with links to the V2 docs, V2 demo, migration guide and V1 demo, plus a `json-edit-react@v1` install hint. The `@beta` install lines are gone.
- [x] **V1 demo → `json-edit-react-v1`**:
  - [x] `demo/vite.config.ts`: `base: '/json-edit-react-v1/'`
  - [x] `demo/package.json`: `homepage` → `…/json-edit-react-v1`; `deploy` → `gh-pages -d build --repo https://github.com/CarlosNZ/json-edit-react-v1.git`
  - [x] `demo/index.html`: `<meta name="robots" content="noindex">`. The `og:*` URLs still point at the primary site.
  - [x] `demo/src/Banner.tsx`: "You're viewing the demo for **V1**. **Version 2** is now the current release — try the V2 demo, or read the migration guide". New `DISMISS_KEY` (`v1DemoBannerDismissedAt`).
  - [x] **Doc links repointed at `v1.x`** (21 links in `App.tsx` + `demoData/dataDefinitions.tsx`). The `#readme` / `#custom-nodes` style anchors would otherwise land on the V2 README, and the `blob/main/custom-component-library/…` and `blob/main/demo/src/demoData/…` files don't exist on `main`. The one `#filter-functions` link now points at `#restrictedit-restrictdelete--restrictadd`, because the V1 README has no Filter Functions heading. The V1 README's *own* `#filter-functions` links are broken in the same way; that's pre-existing, left alone.
- [x] Review the diff in `../json-edit-react-v1.x`, then commit and `git push origin v1.x`
- [x] Create the empty public repo: `gh repo create CarlosNZ/json-edit-react-v1 --public --description "V1 demo for json-edit-react (current version: carlosnz.github.io/json-edit-react)"`
- [x] `cd ../json-edit-react-v1.x/demo && yarn deploy` (builds first via `predeploy`)
- [x] In the new repo's **Settings → Pages**, set Source to the `gh-pages` branch if it isn't picked up automatically. Check that https://carlosnz.github.io/json-edit-react-v1/ loads, that `?data=starWars` works, and that the banner shows.
- [x] Afterwards: `git worktree remove ../json-edit-react-v1.x`, or keep it for future V1 patches.

## Phase 2 — Docs cutover (on `main`, all committed before bumping)

**README swap**

- [x] `git mv -f README_V2.md README.md` to replace the V1 README. The V1 copy lives on in `v1.x`.
- [x] Re-create `README_V2.md` as a short stub: "Moved to [README.md](README.md)". Published beta npm READMEs, old issues and the old V1 demo banner all link to `blob/main/README_V2.md`, so keep the stub for a release cycle or two.
- [x] Replace every `carlosnz.github.io/json-edit-react-v2/` URL with `carlosnz.github.io/json-edit-react/`. There are about 50 hits across `README.md`, `packages/components/README.md`, `packages/utils/README.md` and `demo/vite.config.ts` (comment only):
  ```sh
  git grep -l 'json-edit-react-v2/' -- ':!CHANGELOG.md' \
    | xargs sed -i '' 's#carlosnz.github.io/json-edit-react-v2/#carlosnz.github.io/json-edit-react/#g'
  git grep -n 'json-edit-react-v2'   # should leave only demo/package.json's deploy-v2 scripts
  ```
- [x] `README.md` line ~40, the `[!IMPORTANT]` block: remove "which is currently in beta". Point "V1 docs are here" at `https://github.com/CarlosNZ/json-edit-react/tree/v1.x#readme` (it currently links to the repo root, which will be V2), and add the V1 demo link.
- [x] `README.md` "Optional Companion Packages" (line ~50): fix `[themes] (#themes)`, where the stray space means it doesn't render as a link. Also fix the **UTILITIES** entry, which links to `npmjs.com/package/@json-edit-react/themes` instead of `/utils`.
- [x] `README.md` "Changelog" section (line ~1517): `[V1 changelog](./README.md#changelog)` becomes a self-link after the swap. Point it at `https://github.com/CarlosNZ/json-edit-react/blob/v1.x/README.md#changelog`.
- [ ] Optional: check that `image/screenshot.png` shows the V2 look.

**Migration guide.** There are five anchors that break once `README.md` is V2:

- [x] `#update-functions` → `#reacting-to-changes` (line ~396)
- [x] `#optimistic-updates-and-gating-hold` → `#async-updates--gating--hold` (line ~462)
- [x] `#event-callbacks` → `#listening-to-the-lifecycle--oneditevent` (line ~511)
- [x] `#imperative-handle-editorref` → `#driving-the-editor--the-editorref-handle` (line ~636)
- [x] `#themes--styles` → `#appearance--theming` (line ~734)

**npm README plumbing (core)**

- [x] `scripts/stage-package.mjs` (~line 100–108): source `README_V2.md` → `README.md`, and delete the "flip to README.md when v2 ships" comment.
- [x] `scripts/build_npm_readme.py` (~line 6, 211–212): change the default `--source` and docstring from `README_V2.md` to `README.md`.
- [x] `.README_npm.md`: delete the "Don't forget to replace this link…" comment. Point the FULL DOCUMENTATION link at `https://github.com/CarlosNZ/json-edit-react`.

**CHANGELOGs** (hand-written: announce and link, keep it brief)

- [x] `CHANGELOG.md`: add a `## 2.0.0` section at the top. One or two lines: "Stable release of V2 — see the [migration guide](migration-guide.md) for upgrading from V1," plus anything since beta.10.
- [x] `CHANGELOG.md`: fix the seven `../migration-guide.md#…` links in the beta.0 entries (the path is wrong at the root; it should be `migration-guide.md`). Several of those anchors also use the old section numbers (for example `#11-restrict-props…` is now `#5-…`). This file ships in the npm tarball.
- [x] `packages/components/CHANGELOG.md`: fix the two `../migration-guide.md` links. They should be `../../migration-guide.md`, and the section numbers are stale too.
- [x] `packages/{utils,themes,components}/CHANGELOG.md`: add a `## 1.0.0` entry to each ("First stable release" plus anything since the last beta).

**Demo (main)**

- [x] `demo/src/Banner.tsx`: rewrite from "Version 2 is now in beta" to "🎉 **Version 2 is here** — [migration guide] if upgrading · Looking for V1? [V1 demo](https://carlosnz.github.io/json-edit-react-v1/) · [V1 docs](…/tree/v1.x#readme)". Bump `DISMISS_KEY` (for example `v2_releaseBannerDismissedAt`) so everyone sees it once. The `README_V2.md` link in it becomes `README.md`.
- [x] `demo/package.json`: remove the `build-v2` / `deploy-v2` scripts. The redirect shim in Phase 5 doesn't need them.

- [x] Final sweep: `git grep -nE 'README_V2|json-edit-react-v2|@beta|in beta|currently in beta' -- ':!CHANGELOG.md' ':!dev-docs/'`. Only the `README_V2.md` stub and the historical CHANGELOG entries should remain.
- [ ] Commit the lot. The tree must be clean for `npm version`.

## Phase 3 — Bump + dress rehearsal

- [ ] `npm version 2.0.0`: bumps core first (Rule 2), then commits and tags `v2.0.0`.
- [ ] Bump the three sub-packages. Each makes its own commit and scoped tag:
  ```sh
  (cd packages/utils      && npm version 1.0.0 --tag-version-prefix=@json-edit-react/utils@)
  (cd packages/themes     && npm version 1.0.0 --tag-version-prefix=@json-edit-react/themes@)
  (cd packages/components && npm version 1.0.0 --tag-version-prefix=@json-edit-react/components@)
  ```
- [ ] `pnpm pack-all`, then check each `pack-output/<name>/package/package.json`:
  - [ ] the peer dep reads `"json-edit-react": "^2.0.0"`, not `^2.0.0-beta.10`
  - [ ] the READMEs are in npm form (bold-label blockquotes, not `[!NOTE]`) and link to `/json-edit-react/`, not `-v2`
- [ ] `pnpm preview-publish` (core): check the staged `build_package/README.md` intro, the FULL DOCUMENTATION link, and `tar -tzf json-edit-react-2.0.0.tgz` for a clean file list.
- [ ] `pnpm demo:pack`: click through a handful of main-app data sets and `/examples/*` pages in Chrome, and do one drag-and-drop pass in Firefox (manual, per the DnD guard notes).

## Phase 4 — Publish

- [ ] `pnpm pub:core:latest`: moves `latest` to `2.0.0`.
- [ ] `npm dist-tag add json-edit-react@2.0.0 beta`: re-points `@beta` so anyone following old install instructions gets the stable release rather than `beta.10`.
- [ ] `npm dist-tag add json-edit-react@1.30.2 v1`: gives V1 users a stable handle (`npm i json-edit-react@v1`).
- [ ] `pnpm pub:utils && pnpm pub:themes && pnpm pub:components`
- [ ] `git push --follow-tags`: pushes `main` plus all four tags.
- [ ] `pnpm run versions`, then `npm dist-tag ls json-edit-react`, which should show `latest: 2.0.0, beta: 2.0.0, v1: 1.30.2`.
- [ ] Co-install smoke test (catches peer-range mistakes):
  ```sh
  cd "$(mktemp -d)" && npm init -y >/dev/null
  npm install react react-dom json-edit-react \
    @json-edit-react/utils @json-edit-react/themes @json-edit-react/components
  npm ls json-edit-react @json-edit-react/utils @json-edit-react/themes @json-edit-react/components
  ```
  Expect `2.0.0` and `1.0.0` ×3, with no `ERESOLVE` and no peer warnings.

## Phase 5 — Demo cutover

- [ ] `pnpm sync-demos`: bumps the demo's pinned deps to `2.0.0` / `1.0.0` (it polls npm until they're visible). Commit and push.
- [ ] `pnpm release-demo`: V2 goes to `carlosnz.github.io/json-edit-react/`. Then verify:
  - [ ] the root loads with the new banner, and the "V1 demo" link works
  - [ ] a deep link such as `/json-edit-react/examples/json-viewer` works (SPA `404.html` fallback)
  - [ ] a V1-era link such as `/json-edit-react/?data=starWars` works
  - [ ] View Source has **no** `<meta name="robots" content="noindex">` (it's the primary base)
  - [ ] a hard refresh works (Pages CDN can lag a few minutes)
- [ ] **Turn `json-edit-react-v2` into a redirect.** The beta npm READMEs and other places link there, including `/examples/<slug>` deep links. Deploy a two-file site, with the same content in `index.html` and `404.html`:
  ```html
  <!doctype html>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <title>json-edit-react demo has moved</title>
  <script>
    location.replace(location.href.replace('/json-edit-react-v2/', '/json-edit-react/'))
  </script>
  <p>Moved to <a href="https://carlosnz.github.io/json-edit-react/">carlosnz.github.io/json-edit-react</a>.</p>
  ```
  Put both files in an empty directory and run `npx gh-pages -d . --repo https://github.com/CarlosNZ/json-edit-react-v2.git`. Then update the repo description ("Moved → carlosnz.github.io/json-edit-react"). Don't delete or archive the repo, or the redirect stops working.

## Phase 6 — GitHub housekeeping

- [ ] Create a **GitHub Release** for `v2.0.0`, marked Latest. Include highlights, install lines and the migration guide link. Optionally add releases for the three `@json-edit-react/*@1.0.0` tags.
- [ ] **Milestone v2.0**: move the 7 open issues (#2, #189, #195, #268, #283, #404, #405) to **V2.x**, then close the milestone.
  - [ ] Close #189 ("Are you sure" before delete). V2's async `onUpdate` + `useConfirmOnUpdate` in `@json-edit-react/utils` is exactly this; comment with a link to the Modal confirmation example.
  - [ ] Close #117 ("Support promises for callbacks like onDelete"). `onUpdate` is async-aware in V2.
  - [ ] #268: split the remaining roving-tabindex / keyboard-entry work into its own post-v2 issue, then close #268.
- [ ] Post a **Discussion announcement** in the **Announcements** category. The README notice (and so the npm page) links to that category, so the V2 thread needs to be its newest post. Pin it, and reply in #198 ("Planning for V2") pointing to it.
- [ ] DeepWiki: trigger a re-index so it describes V2, not V1.

## Phase 7 — Post-release cleanup (not tonight)

- [ ] `CLAUDE.md` + `dev-docs/package-management-guide.md` + `dev-docs/publishing-cheat-sheet.md`: rewrite the dist-tag rules for the new steady state. Core stable releases now go to `latest`, the "`latest` must stay `1.30.2`" rule is gone, `pub:core:beta` is for future prereleases only, and V1 patches ship from `v1.x` with `--tag v1`. Delete the "V2 release plan" / "Graduate to stable" sections.
- [ ] Remove `V2-roadmap.md` (or archive it) and this checklist.
- [ ] `To-do.md`: components + utils docs polish (example links, back-to-top links, utils TOC).
- [ ] #408 follow-ups, notably `react-datepicker` 7 → 9 in `@json-edit-react/components` (a runtime dep, so it reaches consumers).
- [ ] #404 follow-up: try option D (lazy-load the library CSS in `ReactDatePicker`), falling back to C (per-widget subpaths alongside `/widgets`). Both can ship as a 1.x minor.
- [ ] Prune the stale local `claude/*` branches.
