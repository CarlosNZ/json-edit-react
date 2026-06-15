---
'json-edit-react': minor
---

Collection counts now reflect the active search filter, displayed as "n of m" (e.g. `"3 of 20 items"`) whenever search is narrowing the visible children. `showCollectionCount` gains a new `'when-collapsed-or-filtered'` literal that surfaces the count on a collection whenever it's collapsed *or* a search filter is active — this is the new default, so the n-of-m form is visible without users having to collapse the node. Pass `'when-collapsed'` for the previous behaviour, or override `customText.ITEMS_FILTERED` (e.g. returning `${size} items`) to suppress the n-of-m form entirely.

Internally, the per-node `filterNode` cascade is replaced with a single post-order walk at the editor level (`computeFilterState`) that produces both whole-tree visibility and per-collection visible-child counts in one pass. The new walk is also surfaced to nodes via a new `FilterStateProvider` context slice — `searchText`/`searchFilter` are no longer threaded as per-node props, which strengthens the §16 node memoization.

Two related bug fixes fall out of the rewrite:

- An intermediate collection whose key matched the search filter but whose body was empty (or whose descendants weren't path-aware-matched) used to drop out and drag its ancestors with it. The new walk tests every node, including intermediate collections, so the matching node and its ancestors stay visible. This was observable with a custom `searchFilter` that only inspected `key`, and with the built-in `'key'` filter on empty `{}` / `[]` bodies.
- `index` on the synthesized `childNodeData` a custom `searchFilter` receives is now the position within visible children (matching `buildNodeData` semantics); previously it was inherited from the parent and frequently stale. `size` is now the child's actual collection size; previously it was the path depth.

The `ITEMS_FILTERED` localisation key (default `'{{visible}} of {{total}} items'`) drives the new display. A `customText.ITEMS_FILTERED` override receives the standard `NodeData` plus a new `visibleSize` field carrying the visible-child count alongside the existing `size` (the total).

The internal `filterNode` and `filterCollection` helpers are removed — they were never re-exported from the package entry point and aren't user-facing. `matchNode` and `matchNodeKey` are unchanged.
