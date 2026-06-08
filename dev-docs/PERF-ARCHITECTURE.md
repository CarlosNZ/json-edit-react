# Performance architecture (§16 fine-grained re-rendering)

**Read this before touching the render path** (`CollectionNode`, `ValueNodeWrapper`,
`useCommon`, the editing store, or any node prop). It states the invariants that make
the fine-grained rendering correct, so you don't have to reverse-engineer them from
the code — and so the next person who wants to *simplify* this has a map.

Related: the staged plan and rationale live in [V2-roadmap.md](../V2-roadmap.md) §16. This
doc is the steady-state contract; the roadmap is the history of how we got here.

---

## The one rule

> **Subscribe to what a node _renders_. Read _live_ (imperatively) for what an event
> handler _does_. Never read live/global state from a frozen closure or a memoizable prop.**

Everything below is a consequence of that sentence. The whole subsystem is a trade: we
keep **cached copies** of things (memoized props, stable refs, snapshot buffers) so we
can skip work — and **every cached copy is a staleness liability.** The rule above is
how we keep the caching honest.

If you only remember one thing: when you need "the latest X" inside an event handler,
get it from a live source (`getLatestData()`, a ref-to-latest, or `store.getSnapshot()`),
**not** from `props`/`nodeData` and **not** from a `useCallback` closure.

---

## Why this exists

A naive recursive tree re-renders **every** node on **any** change. Two distinct costs:

1. **Editing fan-out.** Editing state (which node is being edited) lives in one place.
   If every node *subscribes to the whole thing*, starting/moving an edit re-renders all
   N nodes just to recompute one node's `isEditing`.
2. **Commit cascade.** Children render via `{...props}`; without a memo boundary a single
   `setData` re-renders the whole tree top-to-bottom and re-serializes every collection
   on the spine.

The enabling lever for fixing both: **structural sharing** in
[assign.ts](../src/utils/assign.ts). `assignProperty` rebuilds only the **spine** (root →
edited node) via `{...data}` / `[...data]`; every untouched sibling subtree keeps its
**identical object reference** across a commit. That stable reference is what lets a
`React.memo` boundary bail out of re-rendering untouched subtrees.

---

## The invariants (the contract)

1. **A node's render is a pure function of its OWN stable inputs** — its `data`, `path`,
   `searchText`, and display options. It must NOT depend, at render time, on another
   subtree's data. (It *may* read `nodeData.fullData` at render, but only as a
   best-effort snapshot — see Tradeoffs.)

2. **The memo bails iff `data` is referentially unchanged** (plus the other compared
   props equal). See `areNodePropsEqual` in [memoNode.ts](../src/utils/memoNode.ts).
   Structural sharing makes this fire for untouched subtrees.

3. **Therefore every prop a node receives must be referentially stable** across renders
   where it hasn't meaningfully changed — otherwise the bail is silently defeated (a
   churning prop re-renders the node every commit). This is why:
   - Consumer callbacks (`onEdit`/`onAdd`/`onDelete`/`onMove`, `onChange`/`onError`/
     `onCollapse`/`onEditEvent`) are wrapped **refs-to-latest** in
     [JsonEditor.tsx](../src/JsonEditor.tsx) (`useStableCallback`, `dataRef`, `srcEditRef`,
     …) so they keep a stable identity yet always invoke the latest implementation.
   - Omitted object/array props default to **module-scoped constants**
     (`EMPTY_TRANSLATIONS`, `DEFAULT_COLLAPSE_CLICK_ZONES`, …), never inline `{}`/`[]`.
   - Derived objects (`otherProps`, `insertAtTopOption`, theme `value`) are `useMemo`'d.

4. **Editing state is subscribed via per-node _primitive_ selectors.** A node calls
   `useEditingSelector(s => <boolean>)` ([EditingProvider.tsx](../src/contexts/EditingProvider.tsx)),
   so it re-renders **only when its own boolean flips**. `useCommon` reads `isEditing` /
   `isEditingKey` this way; `CollectionNode` reads `childrenEditing` (is an edit inside my
   subtree) this way. Boolean selector results are `Object.is`-stable for free, which
   sidesteps the `useSyncExternalStore` getSnapshot-caching pitfall — hence the
   `T extends EditingSelection` (primitive) bound on `useEditingSelector`.

5. **Event handlers read editing/data state _imperatively_, not by subscribing.** Actions
   and one-shot reads come from the non-subscribing `useEditingStore()` (`startEdit`,
   `cancelEdit`, `getSnapshot`, `areChildrenBeingEdited`). Examples that get this right:
   - Drag gating reads `editingStore.getSnapshot().currentlyEditingElement` at dragstart
     ([useDragNDrop.tsx](../src/hooks/useDragNDrop.tsx)) — so NO node subscribes to a global
     "is anything editing" boolean, and there is no whole-tree re-render on edit-start.
   - External triggers read `getSnapshot()` ([useTriggers.ts](../src/hooks/useTriggers.ts)).
   - Collapse-on-edit reads `areChildrenBeingEdited(path)` imperatively in `handleCollapse`.

6. **Anything global/live needed at event time comes from a live source, never a prop or
   closure.** The whole document is read via **`getLatestData()`** (a stable getter over
   `dataRef`, threaded as a prop and on `CustomNodeProps`) — see `onChange`'s `currentData`
   and the `getNextOrPrevious` (Tab) calls in
   [ValueNodeWrapper.tsx](../src/ValueNodeWrapper.tsx) / [CollectionNode.tsx](../src/CollectionNode.tsx).
   Per-node live values that a stable callback needs (`value`/`name`/`path` for `onChange`)
   come from a **ref-to-latest** (`onChangeArgsRef`), because the callback's identity must
   stay stable (it's handed to custom nodes as `setValue`).

---

## The pieces

| Piece | Where | Role / invariant |
| --- | --- | --- |
| **Structural sharing** | [assign.ts](../src/utils/assign.ts) | Commit rebuilds only the spine; untouched subtrees keep `data` refs. The lever for invariant 2. |
| **Memo comparator** | [memoNode.ts](../src/utils/memoNode.ts) | `areNodePropsEqual`: `nodeData` compared field-by-field on render-affecting scalars (`key`/`index`/`level`/`size`/`path`); `nodeData`/`customNodeData` in `IGNORED_KEYS`; **everything else (incl. all callbacks) by `===`**. Ignores `fullData`/`parentData`/`value` *identity* (they churn every commit). |
| **Editing store** | [EditingProvider.tsx](../src/contexts/EditingProvider.tsx) | Plain external store (`useRef` state + listener `Set`) behind `useSyncExternalStore`. `useEditingSelector` (subscribe, primitives only), `useEditingStore` (actions, no subscribe), `useEditing` (whole-bundle compat — NOT for the hot path). |
| **Hot path** | [useCommon.ts](../src/hooks/useCommon.ts) | Per-node `isEditing`/`isEditingKey` boolean selectors. The only editing subscription a leaf has. |
| **Stable callbacks** | [JsonEditor.tsx](../src/JsonEditor.tsx) | `dataRef`/`srcEditRef`/… refs-to-latest + `useStableCallback`. Stable identity, latest impl. `getLatestData = useCallback(() => dataRef.current, [])`. |
| **Lazy JSON buffer** | [CollectionNode.tsx](../src/CollectionNode.tsx) | `stringifiedValue: string \| null` — serialized on demand (`editBufferValue` memo), never eagerly. Lifecycle below. |
| **Leaf edit buffer** | [ValueNodeWrapper.tsx](../src/ValueNodeWrapper.tsx) | `value` state, synced from `data` by effect; `onChangeArgsRef` keeps live args for the stable `updateValue`. |

---

## Sources of truth (each is a staleness surface)

There is no single store; there are several caches, each authoritative for one thing and
each with its own "how to read it freshly" rule. **Adding a new one is the most likely way
to introduce a staleness bug — prefer reading an existing live source.**

| Holds | Source of truth | Read for RENDER via | Read LIVE (event-time) via |
| --- | --- | --- | --- |
| The document | consumer's `data` state | `data` prop per node (stable by structural sharing) | `getLatestData()` |
| Which node is editing | editing store | boolean selectors (`useEditingSelector`) | `useEditingStore().getSnapshot()` |
| Raw-JSON edit text | `stringifiedValue` (CollectionNode) | `editBufferValue` memo | n/a (local) |
| Leaf edit text | `value` state (ValueNodeWrapper) | `value` | `onChangeArgsRef.current` |
| Latest consumer callbacks | props | n/a | the refs-to-latest wrappers |

---

## The bug class to watch for (staleness)

Every correctness bug this subsystem has produced is the **same bug wearing a different
hat**: *a cached copy was read where the live value was needed.* If you hit a "stale X"
report, suspect this first. Illustrative failure modes (all now guarded by tests in
[test/renderScope.test.tsx](../test/renderScope.test.tsx) and
[test/memoNode.test.ts](../test/memoNode.test.ts)):

- **Stale callback** — the comparator ignored callback identity, so a memoized node kept
  calling a swapped-out `onChange`. Fix: compare callbacks by `===` **and** keep them
  stable upstream (refs-to-latest). *Guarded:* "a swapped onChange is invoked (latest)…".
- **Stale `fullData`** — a bailed sibling keeps a stale `nodeData.fullData`; reading it at
  event time (Tab nav, `onChange.currentData`) sees a document missing a sibling's commit.
  Fix: read `getLatestData()` at event time. *Guarded:* "onChange reports the live document…".
- **Stale `currentValue`** — `updateValue` is `useCallback([onChange])`; once `onChange` is
  stable it stops rebuilding and freezes its `value`/`name`/`path` closure. Fix: ref-to-latest.
  *Guarded:* same test (currentValue after re-edit).
- **Stale edit buffer** — `stringifiedValue` survived an exit path, showing old JSON on
  re-entry. Fix: a single `clearEditBuffer` on every exit (confirm / cancel / move-away
  via the store `cancelOp`). *Guarded:* the "re-entering / leaving JSON-edit" tests.

**The unifying lesson:** these were found one at a time *because* the invariant wasn't
written down. Check a change against invariant 6 (live reads) up front and the whole class
disappears in one pass.

---

## Deliberate tradeoffs & known residuals

- **Render-time `fullData` is best-effort.** The comparator ignores `fullData` identity, so
  a custom-node `condition` or filter that keys a *render* decision on **another** subtree's
  data via `fullData` won't re-evaluate while the node's own inputs are unchanged. Documented
  in [memoNode.ts](../src/utils/memoNode.ts). Event-time reads are unaffected (they use
  `getLatestData()`). To force it, change the node's own `data`/`parentData`.
- **The ancestor spine re-renders on commit.** A commit rebuilds refs from root to the edited
  node, so those ancestors re-render. This is O(depth), not O(N) — bounded and expected.
- **Raw-JSON buffer via external triggers.** `CollectionNode` registers `cancelOp` only for the
  entry points it owns (Edit button, custom `setIsEditing`). Entering a collection's JSON editor
  via `externalTriggers.edit` and then leaving by editing elsewhere (no confirm/cancel) can
  strand the buffer. Deferred with the external-triggers work item; not reachable via the UI
  (Tab only edits leaves/keys, never opens a collection's JSON editor).

---

## If you want to simplify (or clarify) this later

Start here. In rough order of value-to-risk:

1. **Take `fullData` (and `parentData`) off `nodeData` for the perf path.** They're the fields
   that churn every commit and force the comparator's special-casing, and they caused the
   staleness bugs. Event-time reads already use `getLatestData()`. The one blocker is
   **render-time** custom-node `condition`/filter functions that read `nodeData.fullData`:
   either give them a `getLatestData()` too (and drop `fullData` from `NodeData`), or keep
   `fullData` but rename/document it as a render-snapshot. This removes an entire staleness
   class *by construction* rather than by discipline. **Highest-leverage structural change.**

2. **Don't add a new source of truth without checking the table above.** If a feature needs
   "the latest X" in a handler, route it through an existing live source.

3. **Stage E (full path-keyed store) is probably unnecessary.** Its purpose was to kill a global
   "is anything editing" subscription — but invariant 5 already avoids that (drag reads the store
   imperatively). Don't build it speculatively; revisit only if a measurement shows a real cost.

4. **The bigger rethink: windowing.** For very large trees, rendering only visible nodes
   sidesteps "re-render the tree" entirely — off-screen nodes don't render, so most of the
   memo/stability discipline becomes moot. It trades *referential-stability-everywhere* for
   *variable-height measurement + scroll + collapse-animation* complexity. Not a small change,
   but if starting fresh it's the architecture to prototype first; it may be *less* total
   complexity than memo-everything.

## Verifying you haven't broken it

- [test/renderScope.test.tsx](../test/renderScope.test.tsx) — render-scope (which nodes re-render
  on edit/commit) + the staleness regression tests.
- [test/memoNode.test.ts](../test/memoNode.test.ts) — the comparator contract.
- Demo: `pnpm dev`, load the very-large dataset, enable React DevTools "Highlight updates" —
  editing one field should flash only that node + its ancestor spine, not the tree.
