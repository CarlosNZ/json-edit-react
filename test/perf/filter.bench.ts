/**
 * `computeFilterState` performance bench.
 *
 * One measurement per (tree shape × size × search variant): the wall time
 * of a single `computeFilterState(root, searchFilter, searchText)` call
 * — the work the editor pays once per (data, searchText, searchFilter)
 * change to decide whole-tree visibility and per-collection visible-child
 * counts. Replaces the per-node `filterNode` cascade the editor used to
 * pay on every search-active render.
 *
 * Tree shapes (both via generateTree):
 *   balanced — branching=6 (~log_6 N depth, like real config/document data)
 *   deep     — branching=2 (~log_2 N depth, exposes per-level overhead)
 *
 * Search variants:
 *   empty           — `searchText '', no searchFilter → null-return short
 *                     circuit (sanity baseline)
 *   no-match value  — matchNode + a string nothing matches → worst case
 *                     (visits every node)
 *   match value     — matchNode + a substring most leaves contain → ~best
 *                     case under filtering active (still visits every node
 *                     to count, but each visit is a quick true)
 *   no-match key    — matchNodeKey + non-matching string → worst case
 *                     using the path-aware matcher
 *
 * Knobs (env):
 *   FILTER_BENCH_SIZES=1000,10000,50000   leaf counts to test
 *   FILTER_BENCH_SAMPLES=8                samples per measurement
 *   FILTER_BENCH_WARMUP=2                 discarded warmup runs
 *   FILTER_BENCH_INNER=20                 inner-loop iterations per sample
 *                                         (averages the wall-time over many
 *                                         calls so it clears the
 *                                         performance.now() resolution
 *                                         floor on the smaller trees)
 *
 * Run with `pnpm bench filter` (matches the bench jest config, not the
 * normal test suite). See dev-docs/PERF-BENCH.md for general caveats —
 * pure-function calls so less noisy than the render bench, but the same
 * "use numbers RELATIVELY" rule applies.
 */

import { performance } from 'node:perf_hooks'
import { computeFilterState, matchNode, matchNodeKey } from '../../src/utils/filter'
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
const INNER = num(process.env.FILTER_BENCH_INNER, 20)

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
// substring" case.
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
        `node + JIT — RELATIVE numbers only.\n`
    )
  })

  test('computeFilterState across balanced and deep trees', () => {
    for (const { shape, branching } of VARIANTS) {
      const rows: Record<string, unknown>[] = []
      for (const leafTarget of SIZES) {
        const { data, leaves } = generateTree(leafTarget, branching)
        const nodes = countNodes(data)
        const root = rootNodeData(data)

        for (const s of SEARCHES) {
          // Tight inner loop so the per-sample wall time clears the
          // performance.now() resolution floor on smaller trees; reported
          // value is mean ms/call.
          const samples = runSamples(
            () => {
              const t0 = performance.now()
              for (let i = 0; i < INNER; i++) {
                computeFilterState(root, s.filter, s.text)
              }
              return (performance.now() - t0) / INNER
            },
            { warmup: WARMUP, samples: SAMPLES }
          )
          const st = stats(samples)
          rows.push({
            leaves,
            nodes,
            search: s.name,
            'min (ms)': round(st.min, 4),
            'med (ms)': round(st.median, 4),
            'p95 (ms)': round(st.p95, 4),
            'ns/node': round((st.min * 1_000_000) / nodes, 0),
          })
        }
      }
      printTable(`FILTER — ${shape} tree (branching=${branching})`, rows)
    }
    expect(true).toBe(true)
  })
})
