/**
 * Render-scope test harness (V2 §16 perf work).
 *
 * Lets a test assert *which* tree nodes re-rendered, without adding any
 * instrumentation to the shipped library. It works by registering one
 * "sentinel" custom-node definition per target path via the public
 * `customNodeDefinitions` API: each sentinel renders the original node
 * unchanged (`passOriginalNode`) but bumps a counter keyed by a label every
 * time it renders.
 *
 * Because a custom-node element is created fresh on every render of its
 * host `ValueNodeWrapper` / `CollectionNode`, the sentinel's render count is
 * a faithful proxy for "did this node re-render?". When a later stage adds a
 * `React.memo` boundary that bails out, the host stops rendering and the
 * sentinel count stops climbing — exactly what we want to assert.
 *
 * Usage:
 *   const spy = makeRenderSpy({ target: ['a'], sibling: ['b'] })
 *   render(<JsonEditor data={...} setData={...}
 *            customNodeDefinitions={spy.definitions} />)
 *   spy.reset()                       // ignore initial-mount renders
 *   // ...drive an interaction...
 *   expect(spy.counts.sibling).toBe(0)   // sibling did NOT re-render
 */

import { pathsEqual } from '../../src/utils/pathTools'
import {
  type CollectionKey,
  type CustomNodeDefinition,
  type CustomNodeProps,
  type NodeData,
} from '../../src/types'

export interface RenderSpy {
  /** Render counts keyed by the labels passed to `makeRenderSpy`. */
  counts: Record<string, number>
  /** Zero all counters (call after initial mount to ignore mount renders). */
  reset: () => void
  /** Pass to `<JsonEditor customNodeDefinitions={...} />`. */
  definitions: CustomNodeDefinition[]
}

/**
 * Build sentinel definitions for a set of labelled target paths. The sentinel
 * renders `originalNode` (value nodes) or `children` (collection nodes), so
 * the editor behaves identically — only a counter is added.
 */
export const makeRenderSpy = (targets: Record<string, CollectionKey[]>): RenderSpy => {
  const counts: Record<string, number> = {}
  Object.keys(targets).forEach((label) => {
    counts[label] = 0
  })

  const definitions: CustomNodeDefinition[] = Object.entries(targets).map(([label, path]) => ({
    condition: (nodeData: NodeData) => pathsEqual(nodeData.path, path),
    element: ({ originalNode, children }: CustomNodeProps) => {
      counts[label]++
      return <>{originalNode ?? children}</>
    },
    passOriginalNode: true,
    // Count in both view and edit so entering edit mode doesn't unmount the
    // sentinel and so the host renders normally throughout an edit session.
    showOnView: true,
    showOnEdit: true,
    // Keep the collection wrapper (expand chevron, brackets) for collection
    // targets — otherwise the node can't be collapsed/expanded.
    showCollectionWrapper: true,
  }))

  return {
    counts,
    reset: () => Object.keys(counts).forEach((label) => (counts[label] = 0)),
    definitions,
  }
}
