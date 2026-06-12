/**
 * filterNode / filterCollection performance bench.
 *
 * Two measurements per tree × search variant:
 *
 *   single   — one filterNode('collection', root, ...) call. This is the
 *              cost of computing whole-tree visibility once, i.e. what a
 *              hypothetical top-level precompute would pay.
 *   cascade  — call filterNode('collection', ...) at EVERY collection node
 *              in the tree, depth-first. This mirrors the work the editor
 *              actually does today during a search-active render: every
 *              visible CollectionNode independently runs its own
 *              filterCollection over its full subtree. The cascade/single
 *              ratio is the redundancy factor — it's what a single-pass
 *              rewrite would eliminate.
 *
 * Tree shapes (both via generateTree):
 *   balanced — branching=6 (~log_6 N depth, like real config/document data)
 *   deep     — branching=2 (~log_2 N depth, exposes per-level overhead)
 *
 * Search variants:
 *   empty           — searchText '', no searchFilter → early return inside
 *                     filterNode (sanity baseline)
 *   no-match value  — matchNode + a string nothing matches → worst case
 *                     (walks every descendant, no .some() short-circuit)
 *   match value     — matchNode + a substring most leaves contain → best
 *                     case (short-circuits at almost every collection)
 *   no-match key    — matchNodeKey + non-matching string → walks every
 *                     descendant; tests path[]-aware matcher cost
 *
 * Knobs (env):
 *   FILTER_BENCH_SIZES=1000,10000,50000   leaf counts to test
 *   FILTER_BENCH_SAMPLES=8                samples per measurement
 *   FILTER_BENCH_WARMUP=2                 discarded warmup runs
 *   FILTER_BENCH_INNER=50                 inner-loop iterations per single-call
 *                                         sample (filterNode is fast — averaging
 *                                         many calls per sample beats the
 *                                         performance.now() resolution floor)
 *
 * Run with `pnpm bench` (matches the bench jest config, not the normal test
 * suite). See dev-docs/PERF-BENCH.md for general bench caveats — these are
 * pure-function calls so they're less noisy than the render-cost bench, but
 * the same "use numbers RELATIVELY" rule applies.
 */

import { performance } from 'node:perf_hooks'
import { filterNode, matchNode, matchNodeKey } from '../../src/utils/filter'
import { isCollection } from '../../src/utils/misc'
import { generateTree } from './scenarios'
import { runSamples, stats, round, printTable } from './harness'
import type { JsonData, NodeData, SearchFilterFunction } from '../../src/types'

const num = (env: string | undefined, fallback: number) => {
  const n = parseInt(env ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

const SIZES = (process.env.FILTER_BENCH_SIZES ?? '1000,10000,50000')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n > 0)
const SAMPLES = num(process.env.FILTER_BENCH_SAMPLES, 8)
const WARMUP = num(process.env.FILTER_BENCH_WARMUP, 2)
const INNER = num(process.env.FILTER_BENCH_INNER, 50)

const rootNodeData = (data: JsonData): NodeData => ({
  key: '',
  path: [],
  level: 0,
  index: 0,
  value: data,
  size: isCollection(data) ? Object.keys(data as object).length : null,
  parentData: null,
  fullData: data,
})

const countNodes = (data: JsonData): number => {
  let n = 0
  const walk = (v: JsonData) => {
    n += 1
    if (isCollection(v)) for (const child of Object.values(v as object)) walk(child)
  }
  walk(data)
  return n
}

// Walk every collection in the tree, calling filterNode at each. Mirrors the
// per-CollectionNode work the editor does today: each visible collection
// independently re-runs its own filterCollection over its full subtree.
const cascadeFilter = (
  data: JsonData,
  searchFilter: SearchFilterFunction | undefined,
  searchText: string
): void => {
  const walk = (nd: NodeData) => {
    if (!isCollection(nd.value)) return
    filterNode('collection', nd, searchFilter, searchText)
    for (const [key, value] of Object.entries(nd.value as object)) {
      walk({
        key,
        path: [...nd.path, key],
        level: nd.level + 1,
        index: 0,
        value,
        size: isCollection(value) ? Object.keys(value as object).length : null,
        parentData: nd.value as object,
        fullData: nd.fullData,
      })
    }
  }
  walk(rootNodeData(data))
}

interface Variant {
  shape: 'balanced' | 'deep'
  branching: number
}
const VARIANTS: Variant[] = [
  { shape: 'balanced', branching: 6 },
  { shape: 'deep', branching: 2 },
]

interface Search {
  name: string
  filter: SearchFilterFunction | undefined
  text: string
}

// The synthesised leaf strings cycle through `value ${idx}` for ~1/3 of leaves
// (see scenarios.ts), so 'value' hits ~every third leaf — a realistic "common
// substring" case that short-circuits quickly.
const SEARCHES: Search[] = [
  { name: 'empty', filter: undefined, text: '' },
  { name: 'no-match val', filter: matchNode, text: 'zzz_no_match_xyz' },
  { name: 'match val', filter: matchNode, text: 'value' },
  { name: 'no-match key', filter: matchNodeKey, text: 'zzz_no_match_key' },
]

describe('filter.ts perf', () => {
  beforeAll(() => {
    const gcActive = typeof (globalThis as { gc?: () => void }).gc === 'function'
    console.log(
      `\nfilter bench config: sizes=[${SIZES.join(', ')}] samples=${SAMPLES} ` +
        `warmup=${WARMUP} inner=${INNER}\n` +
        `forced GC between samples: ${gcActive ? 'ON' : 'OFF (run via `pnpm bench` for --expose-gc)'}\n` +
        `node + JIT — RELATIVE numbers only; the cascade/single ratio is the redundancy factor.\n`
    )
  })

  test('single + cascade across balanced and deep trees', () => {
    for (const { shape, branching } of VARIANTS) {
      const rows: Record<string, unknown>[] = []
      for (const leafTarget of SIZES) {
        const { data, leaves } = generateTree(leafTarget, branching)
        const nodes = countNodes(data)
        const root = rootNodeData(data)

        for (const s of SEARCHES) {
          // Single: tight inner loop so the per-sample wall time clears the
          // performance.now() resolution floor; reported value is mean ms/call.
          const singleSamples = runSamples(
            () => {
              const t0 = performance.now()
              for (let i = 0; i < INNER; i++) {
                filterNode('collection', root, s.filter, s.text)
              }
              return (performance.now() - t0) / INNER
            },
            { warmup: WARMUP, samples: SAMPLES }
          )
          const cascadeSamples = runSamples(
            () => {
              const t0 = performance.now()
              cascadeFilter(data, s.filter, s.text)
              return performance.now() - t0
            },
            { warmup: WARMUP, samples: SAMPLES }
          )
          const sStats = stats(singleSamples)
          const cStats = stats(cascadeSamples)
          rows.push({
            leaves,
            nodes,
            search: s.name,
            'single min (ms)': round(sStats.min, 4),
            'cascade min (ms)': round(cStats.min, 3),
            'cascade/single ×': round(cStats.min / Math.max(sStats.min, 1e-6), 1),
            'single med': round(sStats.median, 4),
            'cascade med': round(cStats.median, 3),
          })
        }
      }
      printTable(`FILTER — ${shape} tree (branching=${branching})`, rows)
    }
    expect(true).toBe(true)
  })
})
