# Filtered collection count + filter rewrite — V2 plan

Tracking discussion + implementation plan for [#113](https://github.com/CarlosNZ/json-edit-react/issues/113) and the related filter inefficiency surfaced in [search_analysis.md](search_analysis.md). The two issues share the same data and should land as one architectural change.

## The user-visible feature

When `searchText` / `searchFilter` is active and `showCollectionCount` is on, collection counts still reflect the full underlying data, not what's visible. Display `n of m` (e.g. `3 of 47 items`) when search is active and the visible count differs from the total. Preserves the "data hasn't actually been removed" semantics while answering the question users actually have under search ("how many matched?"). This is what GitHub, Finder, most data grids do.

A demo-page payoff for V2: most other V2 work is under-the-hood; this one is immediately visible on the home page if we drop a search box on the headline example.

## The related rewrite ([search_analysis.md](search_analysis.md))

`filterCollection` (src/utils/filter.ts) is currently called per-visible-CollectionNode, each call doing a full subtree walk. Cost ≈ Σ (subtree sizes) ≈ O(n × depth). The fix is a single post-order DFS at the `JsonEditor` level that computes visibility once per `(data, debouncedSearchText, resolvedSearchFilter)`, producing a `Set<pathString>` of visible nodes. Nodes look their answer up instead of recomputing.

The n-of-m count falls out of that same walk **for free**. Same data is needed: "given a collection, which of its direct children are visible?". One pass can produce both outputs:

- `visiblePaths: Set<string>` — drives the visibility lookup at every call site
- `visibleChildCounts: Map<string, number>` — drives the count display

## Bench numbers (today's baseline)

`pnpm bench filter` ([test/perf/filter.bench.ts](test/perf/filter.bench.ts)) measures both a single root-level filterNode call and a cascade walk that calls filterNode at every collection node in the tree (what the editor actually does on a search-active render). The cascade/single ratio is the redundancy multiplier — the work a single-pass rewrite would eliminate.

Smoke run, 2000 leaves, no-match value search:

| shape | single ms | cascade ms | ratio |
|---|---|---|---|
| balanced (branching=6) | 1.78 | 7.72 | **4.3×** |
| deep (branching=2) | 2.33 | 25.19 | **10.8×** |

Ratio grows with depth, as expected. At ~50k nodes on deep trees the no-match cascade is into the hundreds of ms — that's the regime where users would actually feel it. Today's "feels instant" intuition is largely because the demo's massive set renders mostly collapsed; search-on-fully-expanded large data is where the inefficiency would bite.

## The known correctness bug (narrower than first thought)

`filterCollection` recurses into a child collection without first testing the child's own matcher. So an intermediate collection whose key would match drops out if it has no matching-leaf descendants — and drags its ancestors with it.

Three `test.failing` regression cases at [test/filter-bug.test.tsx](test/filter-bug.test.tsx). Strip `.failing` once the fix lands.

The bug is narrower than the original analysis implied. `matchNodeKey` checks the **full path**, so deep leaves under a key-matching collection inherit the match via their path — that papers over the bug in most realistic scenarios. The bug only surfaces when:

1. The matching key has no descendants whose path the matcher would accept (mainly empty `{}` / `[]` bodies), or
2. A custom `searchFilter` is used that doesn't consult `path` (e.g. matches only on `key` or `value`).

The built-in `'value'` filter can't hit this case — `matchNode` always returns false for collection values, so the "key matches but no descendant matches" situation can't arise. Frame it as a custom-filter + empty-collection bug, not a widespread regression.

## Implementation sketch

### 1. Single walk at `JsonEditor` level

```ts
const visiblePaths = useMemo(() => {
  if (!searchFilter && !debouncedSearchText) return null // null = no filtering
  const visible = new Set<string>()
  const childCounts = new Map<string, number>()
  const walk = (nodeData: NodeData): boolean => {
    let matched = matcher(nodeData, debouncedSearchText)
    let visibleChildren = 0
    if (isCollection(nodeData.value)) {
      for (const childNodeData of childrenOf(nodeData)) {
        if (walk(childNodeData)) { matched = true; visibleChildren++ }
      }
      childCounts.set(toPathString(nodeData.path), visibleChildren)
    }
    if (matched) visible.add(toPathString(nodeData.path))
    return matched
  }
  walk(rootNodeData)
  return { visible, childCounts }
}, [data, debouncedSearchText, searchFilter])
```

No short-circuit: siblings still need visiting to populate counts. That's the right cost — a single linear pass that does what today's redundant cascade was doing log/linearly-many times.

### 2. Replace `filterNode` call sites

Two of them today: `CollectionNode.tsx:215` and `ValueNodeWrapper.tsx:187`. Both become `visiblePaths === null || visiblePaths.has(toPathString(path))`. The current `filterNode` / `filterCollection` exports stay (they're public-ish via the test surface and could be used externally), but the editor stops calling them on the hot path.

### 3. Wire counts

Pass the `childCounts` map via context (probably the same context that exposes `visiblePaths`). `CollectionNode` reads its count from `map.get(toPathString(path))` and renders `n of m` when n ≠ m. Add an `ITEMS_FILTERED` translation with `{visible}` + `{total}` placeholders.

### 4. API

Either extend `showCollectionCount` with a `'filtered'` literal, or add a separate `collectionCountFilter: 'total' | 'filtered' | 'both'` defaulting to `'both'` when search is active. Lean toward the second — keeps the existing prop focused on *whether* to show vs. *what* to show.

### 5. Stable references

`visiblePaths` and `childCounts` are recomputed only when `(data, debouncedSearchText, searchFilter)` change — between those changes the references are stable, so the §16 memo invariants ([dev-docs/PERF-ARCHITECTURE.md](dev-docs/PERF-ARCHITECTURE.md)) hold. Worth verifying that no node's memo comparator depends on searchText *prop* identity rather than the context value — if so, threading per-node `isVisible: boolean` via context selector is the cleaner downstream optimisation (visibility-flip-only re-renders).

## Cheap intermediate fix

Independent of the big rewrite, **export `filterNode` from [src/utils/filter.ts](src/utils/filter.ts)** so users can produce a filtered count today via a `customText.ITEMS_MULTIPLE` callback. ~0 B bundle cost (it's already in the bundle, just not re-exported). Issue #113 becomes "use this workaround" for users who need it before V2 ships.

Userland shape with `filterNode` exported:

```tsx
const customText = useMemo(() => ({
  ITEMS_MULTIPLE: (nodeData) => {
    if (!searchText) return null
    const visible = Object.entries(nodeData.value).filter(([k, v]) => {
      const childNodeData = {
        ...nodeData, key: k, value: v,
        path: [...nodeData.path, k],
        level: nodeData.level + 1,
        parentData: nodeData.value,
      }
      return filterNode(isCollection(v) ? 'collection' : 'value', childNodeData, mySearchFilter, searchText)
    }).length
    return `${visible} of ${nodeData.size} items`
  },
}), [searchText, mySearchFilter])
```

## Order of work

1. Export `filterNode` — tiny standalone change, viable answer for #113 immediately.
2. Bug-repro regression tests are in already — see [test/filter-bug.test.tsx](test/filter-bug.test.tsx). Run `pnpm test filter-bug` to verify they currently fail-as-expected.
3. Single-pass walk + bug-fix verification + n-of-m display + new prop — one PR, since they share the architecture.
4. Optional follow-up: visibility-flip-only re-render (thread per-node `isVisible` via context selector).

## Bundle impact

V2 is currently ~629 B over V1 ([project_v2_bundle_smaller_than_v1](.claude/projects/-Users-carl-GitHub-json-edit-react/memory/project_v2_bundle_smaller_than_v1.md)). The rewrite replaces the existing recursive filter with a single walk — likely net-neutral or a slight win (replaces two recursive functions with one). The count feature adds ~100–150 B (helper output + display branch + i18n key + prop). Total likely a small net add; worth measuring with `pnpm preview-publish` once the work is done.
