/**
 * Benchmark scenarios: the data + the editor configurations under comparison.
 *
 * Add a new scenario here (a data shape, an editor config) and a block in a
 * `*.bench.tsx` that drives it through the harness. The first comparison is the
 * one that motivated the suite: a tree of REGULAR nodes vs. a tree where every
 * leaf is a CUSTOM node rendering `originalNode` + the `isPending` badge — i.e.
 * the realistic "every editable field persists to a server" setup.
 */

import React, { useState } from 'react'
import { JsonEditor } from '../../src/JsonEditor'
import {
  type CustomComponentProps,
  type CustomNodeDefinition,
  type JsonData,
} from '../../src/types'

export type Strategy = 'regular' | 'custom'

// A leaf value the interaction benchmarks can locate via its rendered text
// (`"BENCH_TARGET"`). Placed one level deep so an edit has a non-trivial spine.
export const TARGET_VALUE = 'BENCH_TARGET'
export const TARGET_TEXT = `"${TARGET_VALUE}"`

const noop = () => {}

/**
 * Build a *balanced* plain-JSON tree with `leafCount` leaf (value) nodes and a
 * fixed branching factor — so depth grows ~log(N) and any single node sits on
 * a short spine, like real config/document data. (A flat wide-root shape
 * instead makes a per-edit commit re-map the root's many direct children,
 * inflating interaction cost ~O(N) — a measurement artifact, not an editor
 * trait.) Returns the data + exact leaf count. The `BENCH_TARGET` sentinel is
 * the first leaf created, so it sits at a deep path for a representative edit
 * spine. Leaf values cycle through the three primitive types to exercise each
 * value editor.
 */
export const generateTree = (
  leafCount: number,
  branching = 6
): { data: JsonData; leaves: number } => {
  let made = 0
  let sentinelPlaced = false
  const makeLeaf = (): JsonData => {
    if (!sentinelPlaced) {
      sentinelPlaced = true
      made += 1
      return TARGET_VALUE
    }
    const idx = made
    made += 1
    return idx % 3 === 0 ? idx : idx % 3 === 1 ? `value ${idx}` : idx % 2 === 0
  }
  const build = (leaves: number): JsonData => {
    if (leaves <= 1) return makeLeaf()
    const node: Record<string, JsonData> = {}
    const childCount = Math.min(branching, leaves)
    for (let i = 0; i < childCount; i++) {
      // Distribute leaves across children as evenly as possible.
      const share = Math.floor(leaves / childCount) + (i < leaves % childCount ? 1 : 0)
      node[`key_${i}`] = share <= 1 ? makeLeaf() : build(share)
    }
    return node
  }
  const data = build(leafCount)
  return { data, leaves: made }
}

// Module-stable definition (referential stability — see the README warning), so
// it never churns the node memo across renders/samples.
const SavingIndicator: React.FC<CustomComponentProps> = ({ isPending, originalNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
    {originalNode}
    {isPending && <span data-testid="bench-pending">saving…</span>}
  </span>
)

const customDefinitions: CustomNodeDefinition[] = [
  {
    condition: ({ value }) => value === null || typeof value !== 'object',
    component: SavingIndicator,
    passOriginalNode: true,
  },
]

const defsFor = (strategy: Strategy) => (strategy === 'custom' ? customDefinitions : undefined)

/** Uncontrolled editor element (for mount/update — `setData` is a no-op; the
 *  update benchmark re-renders with a fresh `data` clone itself). */
export const editorElement = (strategy: Strategy, data: JsonData): React.ReactElement => (
  <JsonEditor
    data={data}
    setData={noop}
    collapse={false}
    customNodeDefinitions={defsFor(strategy)}
  />
)

/** Controlled editor (for interactions) — owns `data` state so a committed edit
 *  actually applies and re-renders the spine, like a real consumer. */
const ControlledEditor: React.FC<{ strategy: Strategy; initialData: JsonData }> = ({
  strategy,
  initialData,
}) => {
  const [data, setData] = useState(initialData)
  return (
    <JsonEditor
      data={data}
      setData={setData}
      collapse={false}
      customNodeDefinitions={defsFor(strategy)}
    />
  )
}

export const controlledEditorElement = (strategy: Strategy, data: JsonData): React.ReactElement => (
  <ControlledEditor strategy={strategy} initialData={data} />
)

/** Deep clone via JSON round-trip (data is plain JSON) — used as the `after`
 *  tree for the update benchmark: every node gets a new `data` reference, so
 *  the reference-based node memo re-renders the whole tree. */
export const cloneData = (data: JsonData): JsonData => JSON.parse(JSON.stringify(data))
