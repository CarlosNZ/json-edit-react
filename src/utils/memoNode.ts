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
 * - `customNodeData` — derived purely from `customNodeDefinitions` + `nodeData`
 *   (both compared here), so its per-render identity churn is safe to ignore.
 * - `onError` / `onChange` / `onCollapse` / `onEditEvent` — side-effect
 *   callbacks invoked only from handlers; they never affect rendered output, so
 *   a stale closure is harmless and shouldn't force a re-render. This lets
 *   consumers pass them inline without defeating the memo.
 *
 * Everything else (including `data`, `parentData`, the `restrict*` filters,
 * display options, `searchText`, `translate`, `customNodeDefinitions`, and the
 * stabilised `onEdit`/`onAdd`/`onDelete`/`onMove`) is compared by `===`. For a
 * clean bail-out the consumer's render-affecting props must be referentially
 * stable — standard React guidance; inline render-affecting callbacks (e.g. an
 * inline `enableClipboard`) reduce the memo's effectiveness without breaking
 * correctness.
 */

import { type NodeData } from '../types'
import { pathsEqual } from './pathTools'

const IGNORED_KEYS = new Set<string>([
  'nodeData',
  'customNodeData',
  'onError',
  'onChange',
  'onCollapse',
  'onEditEvent',
])

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
    if (prev[key] !== next[key]) return false
  }
  return true
}
