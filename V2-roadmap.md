# json-edit-react — V2.0 roadmap

Reference document for the v2.0 work. Sourced from [discussion #198](https://github.com/CarlosNZ/json-edit-react/discussions/198) (incl. comments) and a follow-up code-review pass.

The aim of v2.0 is **clean house, not ship features**. Feature additions belong in 2.x.

---

## Suggested ordering

1. Generic `JsonEditor<T>` + path identity (foundational — types & identity model)
2. New `UpdateFunction` return shape + per-node `isValid` (interlocked)
3. `restrict*` → `allow*` rename
4. `useImperativeHandle` triggers
5. `JsonViewer` export + `onRenameProperty` (additive, can land any time)
6. Themes / custom-component package split (mechanical)
7. Fine-grained re-rendering (last — benefits from settled types)

Spike (1) first — it tells us whether the rest of the type model survives contact with real consumers.

---

## 1. Generic `JsonEditor<T>` on data type

`JsonData` in [src/types.ts](src/types.ts) collapses to `unknown`, so consumers lose their types crossing the boundary (`data`, `setData`, every `UpdateFunction` callback, `NodeData.fullData`, `FilterFunction`, etc.).

```ts
interface JsonEditorProps<T = JsonData> {
  data: T
  setData?: (data: T) => void
  onUpdate?: UpdateFunction<T>
  // ...
}
```

Ripples through every callback signature — only realistic in a major. Type gymnastics around `NodeData` and the custom-node generics are the risky part; prototype early.

## 2. Path identity — drop dot-joined strings

[`toPathString`](src/helpers.ts) joins keys with `.` and patches empty strings with `\0`. Keys containing dots produce ambiguous paths. Worse, `areChildrenBeingEdited` in [TreeStateProvider.tsx](src/contexts/TreeStateProvider.tsx) does `pathString.includes(...)` — a **substring** match, so `"foo"` claims `"foobar"`'s children are being edited.

Use `CollectionKey[]` as node identity everywhere; only stringify for React keys (and use a safe encoding there).

## 3. `UpdateFunction` return shape

Current return type has five legal shapes (`void | ErrorString | boolean | [tag, value] | Promise<...>`). Replace with one canonical shape:

```ts
true | void | undefined           // proceed
false                             // reject (generic error)
{ value?: T, isValid?: boolean, error?: string }  // value overrides, error displays, isValid sets node state
Promise<any of the above>         // async validators remain first-class
```

Decide explicitly: when `value` is set **and** `isValid: false` — apply the new value but flag it? Reject? Doc it.

## 4. Per-node `isValid` state

New `isValid` property on each node, settable via Update Function returns (above) and via a sibling standing validator:

```ts
validate?: (nodeData) => true | string  // runs on mount + after external data changes
```

Two sources (last-update result + standing validator) need to compose cleanly.

UI must visibly distinguish **rejected** (revert, current behaviour) from **accepted-but-flagged** (new). Otherwise consumers conflate them.

## 5. `restrict*` → `allow*` rename

The "true means no" cognitive load is real. Open question: hard cutover at 2.0, or ship `allow*` aliases in a 1.x minor with `restrict*` deprecated, then drop at 2.0?

## 6. `useImperativeHandle` for triggers

Replace the `externalTriggers` state-as-RPC pattern with a proper ref handle:

```ts
ref.current.collapse(path)
ref.current.startEdit(path)
ref.current.cancelEdit()
```

Idiomatic React, TS autocompletes the actions, removes a piece of awkward state.

## 7. Export `JsonViewer`

Same component as `<JsonEditor viewOnly />`, but a separate named export — discoverable, reads better in consumer code, no tree-shaking cost.

## 8. `onRenameProperty` callback

Current "delete + add" semantics force consumers to detect renames by hand and lose order info. Distinct callback. (From [discussion #228](https://github.com/CarlosNZ/json-edit-react/discussions/228#discussioncomment-15144209).)

## 9. Split themes + custom components into separate packages — ✅ done

Move out of core entirely. Themes can grow (variants, contrast modes, images) without ever weighing on the "zero runtime deps" promise.

- [`@json-edit-react/themes`](packages/themes/) — the six pre-built themes, peer-depends on core, no runtime deps.
- [`@json-edit-react/components`](packages/components/) — `LinkCustomComponent` + 11 more (DatePicker, ColorPicker, Markdown, etc.). Single-entry ESM with `sideEffects: false`. Third-party libs are regular deps and lazy-loaded in heavy components so unused ones don't hit the consumer's runtime bundle. Sub-path exports are documented as the escape hatch if legacy CJS consumers ever report bundle bloat (see [packages/components/CLAUDE.md](packages/components/CLAUDE.md)).

Repo restructure that came with this:

- pnpm workspace at root covers `.`, `packages/themes`, `packages/components`. [demo/](demo/) and [custom-component-library/](custom-component-library/) stay independent yarn-1 projects (validation harnesses with arms-length view of published artefacts). The `VITE_JRE_SOURCE` toggle was extended to cover the two new packages.
- [Changesets](https://github.com/changesets/changesets) for independent version bumps and changelogs across the three packages.
- New maintainer cheat sheet: [package-management-guide.md](package-management-guide.md).
- v1 → v2 migration notes for consumers: [migration-guide.md](migration-guide.md).

## 10. Terminology — "node", not "component"

Internal types already standardise on `CustomNode`, `NodeData`, `CollectionNode`, `ValueNode`. Align public API ("custom nodes" everywhere). Matches the tree mental model.

## 11. Fine-grained re-rendering

[`CollectionNode`](src/CollectionNode.tsx) renders the whole tree recursively. On 10k-node payloads every keystroke during an edit re-renders all visible siblings (and re-runs `jsonStringify` on collections up the spine via `useEffect([data])`).

Approach in stages, measure with a 10k-node payload between each:

1. **`React.memo` + stable callbacks + node identity by path** — lowest effort, probably 80% of the win.
2. **Context selector** (`use-context-selector` or own impl) — each node subscribes to its slice; smallest API change for surgical updates.
3. **External store** (Zustand/Jotai-style atoms keyed by path) — biggest refactor, unlocks future undo/redo + time travel cheaply.

Only escalate if measurements demand it.

---

## Additional cleanup (do while breaking changes are allowed)

### Drop controlled/uncontrolled dual mode

[`useData`](src/hooks/useData.ts) supports both. The README already steers users hard toward controlled. Drop the uncontrolled branch — simpler state ownership, removes a class of "external state drifted from internal" bugs.

### Group the prop surface

`JsonEditorProps` is ~50 flat fields. Group:

- `restrict` (→ `allow`) — edit, delete, add, drag, type, viewOnly
- `display` — arrayIndices, stringQuotes, collectionCount, iconTooltips, indent, fontSize, minWidth, maxWidth
- `keyboard` — all keyboard config
- `customize` — nodes, buttons, text, icons, textEditor

Cuts cognitive load, harder to misroute props.

### Keyboard config: preset + overrides

16 fine-grained fields. Consider named presets (`'default' | 'vim' | ...`) with selective overrides.

### CustomNode flags audit

[`CustomNodeDefinition`](src/CustomNode.ts) has ~17 optional fields. Pass over which still earn their keep. Candidates to revisit: `passOriginalNode` (probably default-on), `showCollectionWrapper`, `showOnView`/`showOnEdit` defaults.

### Stop mutating in `restoreUndefined`

[`restoreUndefined`](src/helpers.ts) mutates its input. Non-mutating walker is safer for consumers using `jsonParse`.

### SSR placeholder

[`JsonEditor`](src/JsonEditor.tsx) returns `null` pre-hydration → layout pop. Reserve height with a placeholder.

### Bump React peer to ≥18

The `import React from 'react'` rule and JSX namespace handling exist for 16/17. v2.0 is the moment.

### Drop default re-exports of `assign` / `extract`

In [src/index.ts](src/index.ts) — unless they're really intended public API, removing them severs an unnecessary coupling.

### TreeStateProvider refactor

[TreeStateProvider.tsx](src/contexts/TreeStateProvider.tsx) currently conflates three unrelated concerns behind one omnibus context: editing state, collapse broadcasts, and drag source. State is split awkwardly across `useState` and `useRef` (`cancelOp`, `tabDirection`, `previouslyEdited`) and the collapse broadcast self-resets via a magic `setTimeout(..., 2000)`. Every consumer of any one slice re-renders on changes to any other — directly at odds with the perf work in section 11.

Break it down:

1. **Split into three independent providers.** `EditingProvider`, `CollapseProvider`, `DragSourceProvider`. Drag source already lives next to [useDragNDrop](src/hooks/useDragNDrop.ts) conceptually — move it. Each provider exports its own hook (`useEditing`, `useCollapse`, `useDragSource`); the existing `useTreeState` either composes them or is dropped.

2. **Editing as a reducer / state machine.** Today's editing flow has implicit transitions (`idle → editing(path, cancelOp, mode)`, `editing → editing(other path, calls old cancelOp)`, `editing → idle`, Tab-navigation retry loop). Model these explicitly with a reducer; `dispatch` is stable by definition, which composes with the memo work in section 11. `cancelOp`, `tabDirection`, `previouslyEdited` move into reducer state rather than being side-channel refs.

3. **Replace the collapse `setTimeout` reset.** The 2-second auto-reset is fragile (assumes every `CollectionNode` reacts within the window) and surprising to read. Two options:
   - Treat `CollapseState` as a **versioned command** — each `setCollapseState` bumps a counter; nodes compare last-seen version to detect new commands. No timer.
   - Treat collapse as an **imperative broadcast** — fire via a subscription model rather than holding it in state at all. Pairs naturally with the `useImperativeHandle` work in section 6.

4. **Drop substring matching in `areChildrenBeingEdited`.** Currently `currentlyEditingElement.includes(pathString)` — a literal substring check on the dot-joined path string. Once paths are arrays (section 2), this becomes a proper prefix check (`editingPath.every((k, i) => k === nodePath[i]) && editingPath.length >= nodePath.length`). Bundle this change with the path-identity work.

5. **Stable callbacks.** The current JSX `value={{ ... }}` object rebuilds inline arrows every render (notably the `setCollapseState` wrapper). `useCallback`/reducer dispatch + a memoized context value object — prerequisite for the `React.memo` pass in section 11 to actually pay off.

Ordering: (1) is mechanical and unlocks the rest. (2) before (5) since the reducer gives you the stable dispatch for free. (3) and (4) can land independently.

### Bundle-size test scaffolding (separate repo)

A `json-edit-react-bundle-tests` repo with minimal consumer projects across the major bundlers — Vite, CRA (Webpack 5), Next.js (App + Pages routers), Webpack with CJS output, Parcel 2, esbuild. Each imports a configurable subset of `@json-edit-react/components` (and themes). A root `./report.sh` runs all builds and emits a comparison table of gzipped sizes per import combination, broken down by component via `source-map-explorer` or `webpack-bundle-analyzer`.

Goals:

- Verify Option B+ tree-shaking actually works the way it's supposed to in real bundlers.
- Catch regressions when adding new components or bumping deps.
- Have concrete numbers to point at when answering "how big does my bundle get if I import X?".

Lives outside this repo so it doesn't pull bundler/framework deps into the workspace; runs on its own cadence.

### Backfill tests

[test/](test/) currently has only [nextPrevious.test.ts](test/nextPrevious.test.ts). Edit flow, type conversion, key rename, search filter, DnD, undo-on-cancel, controlled data — all uncovered. Add RTL coverage during v2 so the refactor doesn't regress users.
