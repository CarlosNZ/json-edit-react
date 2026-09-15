/**
 * Equality check for the `React.memo` boundary on `CollectionNode` and
 * `ValueNodeWrapper`. Returns `true` (skip the re-render) when nothing that
 * affects *this* node's own output has changed. `data` is compared by
 * reference and `assign.ts` shares structure, so an untouched sibling subtree
 * keeps its `data` reference across a commit and bails out.
 *
 * Two props aren't a plain `Object.is` compare:
 *
 * - `nodeData` — compared field-by-field on the render-affecting scalars.
 *   `value` and `parentData` are already compared as top-level props, and
 *   `fullData` is deliberately ignored: it churns every commit, so comparing
 *   it would re-render every node. A node's render is therefore a function of
 *   its own `data`/`path`/`searchText` — a custom-node `condition` or filter
 *   function that keys off *another* subtree via `fullData` won't re-run here.
 *   (Event-time reads of the live document use `getLatestData()` instead.)
 * - `customNodeData` — derived from `customNodeDefinitions` + `nodeData`, both
 *   of which are compared.
 *
 * Everything else, consumer callbacks included, is compared by `Object.is`;
 * comparing the callbacks is what stops a node calling a swapped-out one.
 * `JsonEditor` gives each a stable refs-to-latest identity, so an inline
 * callback doesn't churn the memo. The remaining props must likewise be
 * referentially stable for a clean bail-out — an inline one costs re-renders,
 * not correctness.
 */

import { type NodeData } from '../types'
import { pathsEqual } from './pathTools'

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
