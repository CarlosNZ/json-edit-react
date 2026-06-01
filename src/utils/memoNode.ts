/**
 * Equality check for the `React.memo` boundary on `CollectionNode` and
 * `ValueNodeWrapper` (V2 §16 fine-grained re-rendering).
 *
 * Returns `true` (skip the re-render) when nothing that affects *this* node's
 * own output has changed. The key lever: `data` is compared by reference, and
 * `assign.ts` does structural sharing, so an untouched sibling subtree keeps
 * its `data` reference across a commit and bails out — the parent re-rendering
 * no longer cascades into it.
 *
 * Props handled specially (NOT a plain `===` compare):
 *
 * - `nodeData` — compared field-by-field on the render-affecting scalars
 *   (`key`, `index`, `level`, `size`, `path`). Its `parentData` / `fullData` /
 *   `value` sub-references churn on every commit but don't affect this node's
 *   own render, so their identity is intentionally ignored. (`value` equals the
 *   top-level `data` prop, which IS compared; `parentData` equals the top-level
 *   `parentData` prop, also compared.)
 *
 *   Assumption worth knowing: `fullData` (the whole document) is on the public
 *   `NodeData`, so a `customNodeDefinitions` `condition` or a filter function
 *   may read it. Ignoring its identity means a node's render is treated as a
 *   function of its OWN `data`/`path`/`searchText` only — if a consumer keys a
 *   render decision on *another* subtree's data via `fullData`, this node won't
 *   pick that up while its own inputs are unchanged (it bails). Comparing
 *   `fullData` is not an option: it churns on every commit, so it would
 *   re-render every node and defeat the memo. Change this node's
 *   `data`/`parentData` too if you genuinely need a cross-subtree dependency.
 *   (Event-time reads needing the live document — `onChange`'s `currentData`,
 *   Tab's `getNextOrPrevious` — use `getLatestData()`, not this prop.)
 * - `customNodeData` — derived purely from `customNodeDefinitions` + `nodeData`
 *   (both compared here), so its per-render identity churn is safe to ignore.
 * Everything else is compared by `Object.is`, including ALL consumer callbacks
 * (`onChange`/`onError`/`onCollapse`/`onEditEvent` as well as the
 * `onEdit`/`onAdd`/`onDelete`/`onMove` family). `JsonEditor` wraps every one of
 * these in a stable, refs-to-latest identity, so they don't churn the memo when
 * a consumer passes them inline AND a genuinely-changed implementation still
 * propagates — comparing them is what stops a node from invoking a stale
 * callback after the consumer swaps it. The other render-affecting props
 * (`data`, `parentData`, the `restrict*` filters, display options,
 * `searchText`, `translate`, `customNodeDefinitions`) must likewise be
 * referentially stable for a clean bail-out — standard React guidance; an
 * inline `enableClipboard` etc. reduces the memo's effectiveness without
 * breaking correctness.
 */

import { type NodeData } from '../types'
import { pathsEqual } from './pathTools'

// Only the genuinely-derived props are special-cased: `nodeData` is compared
// field-by-field (below), and `customNodeData` is derived from
// `customNodeDefinitions` + `nodeData` (both compared). Everything else,
// callbacks included, is compared by `Object.is` — JsonEditor keeps the callbacks
// referentially stable so this stays cheap.
const IGNORED_KEYS = new Set<string>(['nodeData', 'customNodeData'])

const nodeDataEqual = (a: NodeData, b: NodeData): boolean =>
  a.key === b.key &&
  a.index === b.index &&
  a.level === b.level &&
  a.size === b.size &&
  pathsEqual(a.path, b.path)

export const areNodePropsEqual = <P extends { nodeData: NodeData }>(prev: P, next: P): boolean => {
  if (!nodeDataEqual(prev.nodeData, next.nodeData)) return false

  const nextKeys = Object.keys(next) as (keyof P)[]
  if (nextKeys.length !== Object.keys(prev).length) return false

  for (const key of nextKeys) {
    if (IGNORED_KEYS.has(key as string)) continue
    if (!Object.is(prev[key], next[key])) return false
  }
  return true
}
