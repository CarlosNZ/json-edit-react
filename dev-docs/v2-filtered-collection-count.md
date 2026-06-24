# Filtered collection count ("n of m") — V2 feature note

Tracking discussion + implementation sketch for [#113](https://github.com/CarlosNZ/json-edit-react/issues/113). Candidate for V2 because it's a visible, demo-able change (most other V2 work is under-the-hood).

## The problem

When `searchText` / `searchFilter` is active and `showCollectionCount` is on, the count on each collection still reflects the full underlying data, not what's visible. OP's example: `action_result` shows "5 items" while only 1 child renders. Reads as a bug to users even though it's technically correct.

## The debate

**Keep the full count (current behaviour):**

- Truthful to the data model — search is a *view* concern; the underlying data still has 5 items.
- Avoids "where did my items go?" — count doesn't lurch when the user clears the search.
- Operationally safer for change tracking: a delete vs. a filter narrowing both look the same if the count drops.
- Cheap — no recompute on each keystroke.
- Matches how file managers / tree views typically behave under a filter.

**Show the filtered count (OP's view):**

- Matches what's on screen. "5 items" next to a node showing 1 child is jarring; the number stops describing what the user can see.
- Standard search-UI convention (Gmail, GitHub search, most data grids).
- The count's informational job changes under search — users want "how many matched?", not "how many exist?".
- Reinforces that the filter is working, especially with non-obvious `searchFilter` configs.

**Resolution: "n of m".** Render `3 of 47 items` when search is active. Preserves data-integrity *and* answers the "what's visible?" question. This is what GitHub, Finder, most data grids do. The hybrid removes the need to pick a side.

## Why it's not as messy as it looks

The intuition that "parent counts shouldn't have to know about descendant filtering" is reasonable but turns out to be wrong here. The filter logic in [src/utils/filter.ts](src/utils/filter.ts) is already pure — `filterNode` and `filterCollection` take `(nodeData, searchFilter, searchText)` and return a boolean. No React state, no contexts. Every `CollectionNode` already calls `filterNode('collection', ...)` on itself during render to decide its own visibility, and `filterCollection` recursively answers "does any descendant match?".

The count is just a sibling operation: *of my direct children, how many would be visible?* — applying the same `filterNode` per child and summing. All data needed is already on `nodeData`. No new state model, no upward propagation, no sibling coupling.

## Implementation sketch

### 1. Helper in [src/utils/filter.ts](src/utils/filter.ts)

```ts
export const countVisibleChildren = (
  nodeData: NodeData,
  searchFilter: SearchFilterFunction | undefined,
  searchText: string | undefined
): number => {
  if (!searchFilter && !searchText) return Object.keys(nodeData.value as object).length
  const entries = Object.entries(nodeData.value as object)
  return entries.reduce((n, [key, value]) => {
    const childPath = [...nodeData.path, key]
    const childNodeData = {
      ...nodeData,
      key,
      path: childPath,
      level: nodeData.level + 1,
      value,
      size: childPath.length,
      parentData: nodeData.value,
    }
    const visible = isCollection(value)
      ? filterNode('collection', childNodeData, searchFilter, searchText)
      : filterNode('value', childNodeData, searchFilter, searchText)
    return n + (visible ? 1 : 0)
  }, 0)
}
```

Mirrors the child-nodeData construction in `filterCollection`.

### 2. Wire into [src/CollectionNode.tsx](src/CollectionNode.tsx)

Around the existing count render ([CollectionNode.tsx:580-597](src/CollectionNode.tsx:580)), compute a memoized `visibleSize` and branch the display.

```ts
const visibleSize = useMemo(
  () => countVisibleChildren(nodeData, searchFilter, searchText),
  [data, searchText, searchFilter]
)
```

When `visibleSize === size` (no filter active, or all children match), use the existing `ITEM_SINGLE` / `ITEMS_MULTIPLE` translations. When they differ, use a new `ITEMS_FILTERED` translation.

### 3. i18n in [src/localisation.ts](src/localisation.ts)

Add `ITEMS_FILTERED` with `{visible}` + `{total}` placeholders, e.g. `"{visible} of {total} items"`. Decide on pluralisation conventions for edge cases like `1 of 1` — likely just defer to the existing single/multiple branches when `visible === total`.

### 4. Prop / API shape

Two reasonable options:

- **Extend `showCollectionCount`:** add a `'filtered'` or `'filtered-when-closed'` literal. Compact but the union starts getting busy.
- **Add `collectionCountFilter: 'total' | 'filtered' | 'both'`:** default `'both'` (so `n of m` kicks in automatically when search is active and counts differ). Falls back to `'total'` behaviour when no search. Cleaner separation.

Lean toward the second — keeps `showCollectionCount` focused on *whether* to show the count, separate from *what* to show.

## Considerations

- **Performance.** When the collection is *open*, the parent's count work duplicates the per-child `filterNode` calls each visible child runs during its own render. With `useMemo` on `(data, searchText, searchFilter)` repeat renders are cheap. When the collection is *closed* (the default `'when-closed'` mode), this is the only time we walk those children, and `filterCollection` short-circuits via `.some()` already. Worst case (search matches everything) is O(n) total tree-walk — about what filtering costs today. Worth measuring on the [massive-data demo](demo/) before merging.

- **Bundle.** v2 budget is tight (~629 B over v1 currently). Helper + display branch is ~100-150 B gzip. Small but non-zero.

- **Demo.** Drop a search box on the home-page demo with the count showing `n of m` in real time. This is the visible payoff that motivates putting the change in V2.

## Estimate

~30 lines of source + tests + one i18n key + one prop. Maybe an afternoon, plus perf validation on massive-data.

Worth noting: the filter math itself is ~8 lines (essentially the helper above, condensable to a one-liner). The rest is memoization (~4), display branch (~6), i18n key wiring (~4), and prop plumbing (~6). The core change isn't algorithmically heavier than the userland workaround below — it's just polished-product surface area.

## Userland workaround via `customText`

While V2 cooks, advanced users can already produce a filtered count without core changes — *if* we make one small unlock. Today only `matchNode`, `matchNodeKey`, and `isCollection` are exported as filter primitives. The actual visibility logic (`filterNode`, `filterCollection`) is internal.

Without those exports, a user trying to compute filtered counts in a `CustomTextFunction` would have to:

- Reimplement the recursive descendant walk (`filterCollection`-equivalent), getting the "ancestor stays visible if any descendant matches" semantics right.
- Branch on `searchFilter` mode (`'key'` / `'value'` / `'all'` / custom function) themselves, since `matchNode` only covers the `'value'` case.
- Override both `ITEM_SINGLE` and `ITEMS_MULTIPLE` to handle pluralisation.
- Accept O(n) work per collection per render (no memoization layer).

That's ~30 lines of fragile code in userland — not really a "use the existing API" answer.

### The cheap unlock

**Export `filterNode` from [src/utils/filter.ts](src/utils/filter.ts).** It's already pure, takes `(type, nodeData, searchFilter, searchText)`, and returns a boolean — exactly the primitive userland needs. Zero new behaviour, ~0 B bundle cost (it's already in the bundle, just not re-exported).

With that single export, the customText workaround collapses to:

```tsx
const customText = useMemo(() => ({
  ITEMS_MULTIPLE: (nodeData) => {
    if (!searchText) return null  // fall through to default
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

Caveats the user accepts:

- They have to resolve their own `SearchFilterFunction` (either pass a custom function or replicate the `'key'`/`'value'`/`'all'` mapping from [JsonEditor.tsx:854-867](src/JsonEditor.tsx:854)).
- No memoization beyond what their own `useMemo` provides — runs per render per collection.
- They still need to override `ITEM_SINGLE` separately if they want consistent formatting at size 1.

### Recommendation

Land the `filterNode` export regardless of whether the first-class feature ships. It costs nothing, makes the issue answerable today, and the first-class version still adds value (polish, memoization, no userland reimplementation, demo-page visibility).
