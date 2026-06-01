# json-edit-react — V2.0 roadmap

Reference document for the v2.0 work. Sourced from [discussion #198](https://github.com/CarlosNZ/json-edit-react/discussions/198) (incl. comments) and a follow-up code-review pass.

The aim of v2.0 is **clean house, not ship features**. Feature additions belong in 2.x.

---

## Suggested ordering

Numbering matches the section numbers below. Items joined with `+` are interlocked and best tackled together.

- §1 Generic `JsonEditor<T>` ✅ (foundational type model)
- §2 Path identity ✅ (foundational identity model) — [#246](https://github.com/CarlosNZ/json-edit-react/issues/246)
- §3 Tests ✅ (regression net for everything that follows) — [#61](https://github.com/CarlosNZ/json-edit-react/issues/61)
- §4 `TreeStateProvider` refactor ✅ (depends on §2; unlocks the perf work in §16) — [#247](https://github.com/CarlosNZ/json-edit-react/issues/247) / [#272](https://github.com/CarlosNZ/json-edit-react/pull/272)
- §5 Drop controlled/uncontrolled dual mode + §11 `JsonViewer` ✅ (state simplification, bundled) — [#248](https://github.com/CarlosNZ/json-edit-react/issues/248) / [#261](https://github.com/CarlosNZ/json-edit-react/pull/261)
- §6 + §7 New `UpdateFunction` return shape + per-node `isValid` (interlocked) — [#249](https://github.com/CarlosNZ/json-edit-react/issues/249)
- §8 + §9 `restrict*` → `allow*` rename + group the prop surface (API surface) — [#250](https://github.com/CarlosNZ/json-edit-react/issues/250)
- §10 `useImperativeHandle` triggers — [#251](https://github.com/CarlosNZ/json-edit-react/issues/251)
- §12 `onRenameProperty` callback (additive, can land any time) — [#252](https://github.com/CarlosNZ/json-edit-react/issues/252)
- §13 Themes / custom-component package split ✅ (mechanical)
- §14 Terminology — "node", not "component" — [#253](https://github.com/CarlosNZ/json-edit-react/issues/253)
- §15 CustomNode flags audit — [#254](https://github.com/CarlosNZ/json-edit-react/issues/254)
- §16 Fine-grained re-rendering ✅ (dependency-free editing store + `React.memo`) — [#255](https://github.com/CarlosNZ/json-edit-react/issues/255)
- Additional cleanup (umbrella) — [#256](https://github.com/CarlosNZ/json-edit-react/issues/256)

---

## 1. Generic `JsonEditor<T>` on data type — ✅ done

`JsonData` in [src/types.ts](src/types.ts) collapsed to `unknown`, so consumers lost their types crossing the boundary (`data`, `setData`, every `UpdateFunction` callback, `NodeData.fullData`, `FilterFunction`, etc.).

```ts
interface JsonEditorProps<T = JsonData> {
  data: T
  setData?: (data: T) => void
  onUpdate?: UpdateFunction<T>
  // ...
}
```

Landed in [#240](https://github.com/CarlosNZ/json-edit-react/pull/240). `T` flows to `data`, `setData`, the root-data slots of `UpdateFunction` / `OnChangeFunction` / `OnErrorFunction`, and `NodeData.fullData` (which propagates into every `FilterFunction` variant). Default `T = JsonData` keeps existing untyped code source-compatible. Per-node `value` / `parentData` stay wide — they're arbitrary-depth slices no static type can describe. The recursive internal `Editor` stays pinned to `JsonEditorProps<JsonData>`; the outer wrapper casts at the boundary. `CustomNodeDefinition` intentionally didn't gain a `T` generic — would have made mixed-shape arrays unworkable. See [migration-guide.md](migration-guide.md) for consumer guidance.

## 2. Path identity — drop dot-joined strings — ✅ done

[`toPathString`](src/helpers.ts) joined keys with `.` and patched empty strings with `\0`. Keys containing dots produced ambiguous paths, and `areChildrenBeingEdited` in [TreeStateProvider.tsx](src/contexts/TreeStateProvider.tsx) used `pathString.includes(...)` — a **substring** match — so `"foo"` claimed `"foobar"`'s children were being edited.

Landed in [#260](https://github.com/CarlosNZ/json-edit-react/pull/260). `CollectionKey[]` is the canonical node identity throughout — editing state is `{ path, mode }`, drag source carries `path` only, and `areChildrenBeingEdited` plus the drag-onto-self guard use new array predicates (`pathsEqual`, `isDescendantOf`). `toPathString` survives as a public utility but its encoding switched to `/` + `encodeURIComponent` (injective, with a `'\0'` sentinel for the single-empty-key edge case); the `'key_'` second arg is removed since mode is now a field. Also fixed a latent same-family bug in `handleDrop` where `sourceBase`/`thisBase` were joined with mismatched separators. See [migration-guide.md](migration-guide.md#5-topathstring-encoding-changed).

## 3. Tests — ✅ done

Landed across three stacked PRs: harness + helper unit tests ([#265](https://github.com/CarlosNZ/json-edit-react/pull/265)), render-basics ([#267](https://github.com/CarlosNZ/json-edit-react/pull/267)), and behavioural coverage ([#269](https://github.com/CarlosNZ/json-edit-react/pull/269)) — edit flow, structural mutations, restrictions/callbacks, search/filter, and the Tab-+-filter interaction. RTL + jsdom harness, `pnpm build` now runs tests via prebuild with a `SKIP_TESTS=1` escape hatch. Followups: a11y on icon buttons → [#268](https://github.com/CarlosNZ/json-edit-react/issues/268), and a post-§4/§16 forensic render-issue pass → [#266](https://github.com/CarlosNZ/json-edit-react/issues/266). Drag-and-drop and undo-on-cancel remain uncovered — tracked in [#270](https://github.com/CarlosNZ/json-edit-react/issues/270) for later.

## 4. `TreeStateProvider` refactor — ✅ done

Landed in [#272](https://github.com/CarlosNZ/json-edit-react/pull/272) across five reviewable commits; Part 4 was subsequently revised in [#275](https://github.com/CarlosNZ/json-edit-react/pull/275) (see fix for #273 below).

1. **Provider split.** One omnibus `TreeStateProvider` became three slice-specific providers: `EditingProvider` and `CollapseProvider` in [src/contexts/](src/contexts/), and `DragSourceProvider` in [src/hooks/](src/hooks/) (sibling to `useDragNDrop`, its only consumer). A thin composing `<TreeStateProvider>` wrapper still wraps the three for `JsonEditor`'s render — no public API change.
2. **Consumer narrowing.** `useTreeState` deleted; each of the 7 call sites now imports only the slice hook(s) it needs (`useEditing` / `useCollapse` / `useDragSource`). Slice-isolation activated and pinned by [test/sliceIsolation.test.tsx](test/sliceIsolation.test.tsx).
3. **Editing state machine.** The overloaded `setCurrentlyEditingElement(path, cancelOpOrKey?)` replaced by five named, `useCallback`-stable actions: `startEdit(path, options?)`, `cancelEdit()`, `setTabDirection`, `recordPreviousEdit`, `setPreviousValue`. All editing fields bundled into one `useState` object for atomic multi-field transitions. Tab-nav retry loop moved out of the render body and into a `useEffect` (later upgraded to `useLayoutEffect` to avoid a paint-flicker — see §16 for the architecturally cleaner followup).
4. **Collapse state model.** Initially landed in #272 as a pub-sub broadcast (`Set<handler>` in a ref, zero React re-renders), but this couldn't cascade past the initial mount frontier — late-mounted descendants missed the broadcast — surfaced as [#273](https://github.com/CarlosNZ/json-edit-react/issues/273). Reworked in #275 to a state-based model with a version counter: `setCollapseState` writes `commands` and bumps `version`; each `CollectionNode` tracks `lastSeenVersionRef` to apply broadcasts exactly once on the first version it sees. Commands persist until the next broadcast (no clear timer — a fixed timer is fundamentally fragile for arbitrarily large trees), so cascade reliably reaches every level past the initial mount frontier. `handleAdd` and `handleChangeDataType` call `setCollapseState(null)` so user-driven new mounts use their default state rather than inheriting a sweeping broadcast. 14-scenario end-to-end test suite in [test/collapseBroadcasts.test.tsx](test/collapseBroadcasts.test.tsx). The mechanism is correct but acknowledged complex — legibility refactor tracked in [#276](https://github.com/CarlosNZ/json-edit-react/issues/276).
5. **Memoize + audit.** Each provider's context value wrapped in `useMemo`. Eslint-disabled deps across consumer files audited — one redeemed (`cancelEdit` added back to JsonEditor's dep array), three sharpened with explanatory comments, the rest left as legitimate "fire only on X" semantic decisions. Identity-stability test pins the memoization promise for §16 to build on.

The "drop substring matching in `areChildrenBeingEdited`" item from the original plan was already done as part of §2's path-identity work — `isDescendantOf` from [src/utils/pathTools.ts](src/utils/pathTools.ts) does the prefix check correctly on arrays.

Followups carried into other roadmap items: §10 gained a "To consider" note for an `expandPath`-style imperative helper; §16 gained the "Followup carried from §4 Part 3" entry (make `getNextOrPrevious` filter-aware to drop the `useLayoutEffect` redirect).

## 5. Drop controlled/uncontrolled dual mode — ✅ done

Landed in [#261](https://github.com/CarlosNZ/json-edit-react/pull/261), bundled with §11. `JsonEditor` is now strictly controlled — `setData` is a required prop, TypeScript-enforced. The internal `useData` hook (which previously branched between external `setData` and internal `useState`) is deleted; `JsonEditor` reads `data`/`setData` from props directly. The `viewOnly` prop is removed at the same time (read-only displays now use the new `<JsonViewer />` — see §11; dynamic permissions-style toggling stays on `<JsonEditor>` with `restrictEdit/restrictAdd/restrictDelete`). See [migration-guide.md §6](migration-guide.md#6-setdata-is-required-viewonly-removed-jsonviewer-added).

## 6. `UpdateFunction` return shape

Current return type has five legal shapes (`void | ErrorString | boolean | [tag, value] | Promise<...>`). Replace with one canonical shape:

```ts
true | void | undefined           // proceed
false                             // reject (generic error)
{ value?: T, isValid?: boolean, error?: string }  // value overrides, error displays, isValid sets node state
Promise<any of the above>         // async validators remain first-class
```

Decide explicitly: when `value` is set **and** `isValid: false` — apply the new value but flag it? Reject? Doc it.

## 7. Per-node `isValid` state

New `isValid` property on each node, settable via Update Function returns (above) and via a sibling standing validator:

```ts
validate?: (nodeData) => true | string  // runs on mount + after external data changes
```

Two sources (last-update result + standing validator) need to compose cleanly.

UI must visibly distinguish **rejected** (revert, current behaviour) from **accepted-but-flagged** (new). Otherwise consumers conflate them.

## 8. `restrict*` → `allow*` rename

The "true means no" cognitive load is real. Open question: hard cutover at 2.0, or ship `allow*` aliases in a 1.x minor with `restrict*` deprecated, then drop at 2.0?

## 9. Group the prop surface

`JsonEditorProps` is ~50 flat fields. Group:

- `allow` (post-rename, section 8) — edit, delete, add, drag, type, viewOnly
- `display` — arrayIndices, stringQuotes, collectionCount, iconTooltips, indent, fontSize, minWidth, maxWidth
- `keyboard` — all keyboard config
- `customize` — nodes, buttons, text, icons, textEditor

Cuts cognitive load, harder to misroute props.

## 10. `useImperativeHandle` for triggers

Replace the `externalTriggers` state-as-RPC pattern with a proper ref handle:

```ts
ref.current.collapse(path)
ref.current.startEdit(path)
ref.current.cancelEdit()
```

Idiomatic React, TS autocompletes the actions, removes a piece of awkward state.

After §4 Part 4, `setCollapseState` is already state-based with a version counter — the imperative handle for `collapse(...)` is a thin wrapper that calls it directly. Editing actions on the handle (`startEdit`/`cancelEdit`) bind to the named actions in `EditingProvider` (§4 Part 3). No new infrastructure needed here; this becomes a small public-API exposure on top of the existing internals.

## 11. Export `JsonViewer` — ✅ done

Landed in [#261](https://github.com/CarlosNZ/json-edit-react/pull/261), bundled with §5. `<JsonViewer />` is the canonical read-only entry point — a thin wrapper over `JsonEditor` that hard-codes `setData={noop}` and locks all four `restrict*` filters on. `JsonViewerProps<T>` is `Omit<JsonEditorProps<T>, 'setData' | 'onUpdate' | 'onEdit' | 'onAdd' | 'onDelete' | 'onChange' | 'restrictEdit' | 'restrictAdd' | 'restrictDelete' | 'restrictDrag' | 'restrictTypeSelection' | 'externalTriggers'>` — drops the props that aren't meaningful in a viewer. `externalTriggers` is also scrubbed at runtime in the wrapper since it would otherwise bypass the restrict filters (see [#251](https://github.com/CarlosNZ/json-edit-react/issues/251) — to revisit alongside §10). The v1 `viewOnly` prop is removed in the same PR.

## 12. `onRenameProperty` callback

Current "delete + add" semantics force consumers to detect renames by hand and lose order info. Distinct callback. (From [discussion #228](https://github.com/CarlosNZ/json-edit-react/discussions/228#discussioncomment-15144209).)

## 13. Split themes + custom components into separate packages — ✅ done

Move out of core entirely. Themes can grow (variants, contrast modes, images) without ever weighing on the "zero runtime deps" promise.

- [`@json-edit-react/themes`](packages/themes/) — the six pre-built themes, peer-depends on core, no runtime deps.
- [`@json-edit-react/components`](packages/components/) — `LinkCustomComponent` + 11 more (DatePicker, ColorPicker, Markdown, etc.). Single-entry ESM with `sideEffects: false`. Third-party libs are regular deps and lazy-loaded in heavy components so unused ones don't hit the consumer's runtime bundle. Sub-path exports are documented as the escape hatch if legacy CJS consumers ever report bundle bloat (see [packages/components/CLAUDE.md](packages/components/CLAUDE.md)).

Repo restructure that came with this:

- pnpm workspace at root covers `.`, `packages/themes`, `packages/components`. [demo/](demo/) and [custom-component-library/](custom-component-library/) stay independent yarn-1 projects (validation harnesses with arms-length view of published artefacts). The `VITE_JRE_SOURCE` toggle was extended to cover the two new packages.
- [Changesets](https://github.com/changesets/changesets) for independent version bumps and changelogs across the three packages.
- New maintainer cheat sheet: [package-management-guide.md](package-management-guide.md).
- v1 → v2 migration notes for consumers: [migration-guide.md](migration-guide.md).

## 14. Terminology — "node", not "component"

Internal types already standardise on `CustomNode`, `NodeData`, `CollectionNode`, `ValueNode`. Align public API ("custom nodes" everywhere). Matches the tree mental model.

## 15. CustomNode flags audit

[`CustomNodeDefinition`](src/CustomNode.ts) has ~17 optional fields. Pass over which still earn their keep. Candidates to revisit: `passOriginalNode` (probably default-on), `showCollectionWrapper`, `showOnView`/`showOnEdit` defaults.

## 16. Fine-grained re-rendering — ✅ done

[`CollectionNode`](src/CollectionNode.tsx) rendered the whole tree recursively: every edit start/move re-rendered all nodes (the editing-context fan-out — every node read `useEditing()`), and every commit re-rendered the tree top-down and re-ran `jsonStringify` on collections up the spine via `useEffect([data])`. On a fully-expanded ~19k-node payload, starting an edit took ~3.1s, a commit ~8s (felt), Tab-nav ~2.2s.

Done **dependency-free** (no Zustand/Jotai/`use-context-selector`) across four stacked PRs, measuring a ~19k-node fixture between each stage:

- **Measurement harness** ([#278](https://github.com/CarlosNZ/json-edit-react/pull/278)) — dev-only `React.Profiler` overlay in the demo + a sentinel-custom-node render-scope test harness (zero changes to shipped code), plus reproducible size-ladder fixtures (`data/medium|very-large|massive-test-data.json5`).
- **Stage B — lazy `jsonStringify`** ([#279](https://github.com/CarlosNZ/json-edit-react/pull/279)) — the collection JSON-edit buffer is computed on demand (on entering edit) rather than eagerly on mount + re-derived on every data change. Removing that per-node `useEffect([data])` also cut per-render overhead on the fan-out.
- **Stage C — selectable editing store** ([#280](https://github.com/CarlosNZ/json-edit-react/pull/280)) — editing state moved from a context *value* to a tiny external store exposed via React's built-in `useSyncExternalStore` (hence the **React peer bump to `>=18`**). The context value is the stable store object, so `useContext` never re-renders; each node subscribes only to its own `isEditing` / `isEditingKey` / `childrenEditing` boolean. `canDrag` no longer depends on global editing state (the "don't drag while editing" check moved to drag-start). Moving an edit now re-renders only the nodes involved.
- **Stage D — `React.memo` boundary** ([#282](https://github.com/CarlosNZ/json-edit-react/pull/282)) — `CollectionNode` / `ValueNodeWrapper` wrapped in `React.memo` with a custom comparator ([src/utils/memoNode.ts](src/utils/memoNode.ts)) that keys off `data` by reference (structural sharing in [assign.ts](src/utils/assign.ts) → untouched sibling subtrees bail), compares `parentData` (key-rename safety), and ignores `fullData` identity + side-effect callbacks so inline consumer callbacks don't defeat it. Required stabilising the `onEdit`/`onAdd`/`onDelete`/`onMove` family (refs-to-latest), the churning prop defaults, and — a latent bug hitting all consumers — memoizing `ThemeProvider`'s context value.

Measured (medium ~19k, fully expanded): **Enter-edit 3126 → 2 ms, Commit 4624 → 14 ms, Tab-move 2197 → 1 ms.** React re-render cost is now **O(edited node + its ancestor spine), independent of tree size.** The original three-step plan (memo → context-selector → external store) collapsed into "external store via `useSyncExternalStore` + memo" — the dependency-free in-house equivalent of stages 2 + 3.

**Stage E (full path-keyed store) — deliberately skipped.** It would shave the last whole-tree re-renders (e.g. the global `canDrag` flips on first/last edit of a session), but the measurements show React is no longer the bottleneck, so it isn't worth the refactor. Revisit only if a future feature (undo/redo time-travel) wants a path-keyed store for other reasons.

**`content-visibility` add-on — tried, not merged.** Experiment on branch `255-content-visibility-paint` (committed, un-PR'd): `content-visibility: auto` + `contain-intrinsic-size` on `.jer-collection-element`. Verdict: only a marginal scroll-repaint gain; it does **not** fix the real remaining pain (drag-and-drop on a fully-expanded ~19k tree — a native-browser limit; Firefox won't even initiate the drag); and `contain: paint` introduced regressions (Chrome leaves stale dropzone-overlay "trails" during a drag; the expand chevron, which overflows its row slightly, gets clipped). The real lever for trees that large is virtualization/windowing — a large, separate effort, awkward with arbitrary-depth trees + the collapse animation — and in practice collapse levels keep such trees smooth.

**Followup still carried from §4 Part 3:** the Tab-navigation retry in [ValueNodeWrapper.tsx](src/ValueNodeWrapper.tsx) still lands editing on a filtered/uneditable target and then redirects via `useLayoutEffect`. Stage C moved its state reads (`tabDirection`, `previouslyEditedElement`) onto the store snapshot but kept the redirect. Making `getNextOrPrevious` filter-aware — so the Tab handler picks a viable target up front and never lands on a non-viable one — would eliminate the setState-after-render pattern. Touches `getNextOrPrevious` plus its callers in `ValueNodeWrapper.tsx` and `KeyDisplay.tsx`.

---

## Additional cleanup (do while breaking changes are allowed)

### Keyboard config: preset + overrides

16 fine-grained fields. Consider named presets (`'default' | 'vim' | ...`) with selective overrides.

### Stop mutating in `restoreUndefined`

[`restoreUndefined`](src/helpers.ts) mutates its input. Non-mutating walker is safer for consumers using `jsonParse`.

### SSR placeholder

[`JsonEditor`](src/JsonEditor.tsx) returns `null` pre-hydration → layout pop. Reserve height with a placeholder.

### Bump React peer to ≥18

The `import React from 'react'` rule and JSX namespace handling exist for 16/17. v2.0 is the moment.

### Drop default re-exports of `assign` / `extract`

In [src/index.ts](src/index.ts) — unless they're really intended public API, removing them severs an unnecessary coupling.

### Bundle-size test scaffolding (separate repo)

A `json-edit-react-bundle-tests` repo with minimal consumer projects across the major bundlers — Vite, CRA (Webpack 5), Next.js (App + Pages routers), Webpack with CJS output, Parcel 2, esbuild. Each imports a configurable subset of `@json-edit-react/components` (and themes). A root `./report.sh` runs all builds and emits a comparison table of gzipped sizes per import combination, broken down by component via `source-map-explorer` or `webpack-bundle-analyzer`.

Goals:

- Verify Option B+ tree-shaking actually works the way it's supposed to in real bundlers.
- Catch regressions when adding new components or bumping deps.
- Have concrete numbers to point at when answering "how big does my bundle get if I import X?".

Lives outside this repo so it doesn't pull bundler/framework deps into the workspace; runs on its own cadence.
