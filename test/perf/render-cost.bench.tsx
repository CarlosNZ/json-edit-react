/**
 * Render-cost benchmark: a tree of REGULAR nodes vs. a tree where every leaf is
 * a CUSTOM node rendering `originalNode` + the `isPending` badge.
 *
 * Run with `pnpm bench` (this file matches the bench jest config, not the
 * normal `*.test` suite). Knobs (env):
 *   BENCH_SIZES=120,500,1500   leaf counts to test
 *   BENCH_SAMPLES=8            samples per mount/update measurement
 *   BENCH_ISAMPLES=5           samples per interaction measurement (slower)
 *   BENCH_WARMUP=2             discarded warmup runs
 *   BENCH_METRICS=mount,update,interactions   subset to run
 *
 * See dev-docs/PERF-BENCH.md for how to read the output and the caveats (the
 * numbers are jsdom/dev-React render-phase ms — use them RELATIVELY).
 */

import { screen } from '@testing-library/react'
import {
  measureMount,
  measureUpdate,
  measureInteraction,
  runSamplesPaired,
  runSamplesPairedAsync,
  stats,
  round,
  printTable,
  type BenchUser,
} from './harness'
import {
  editorElement,
  controlledEditorElement,
  generateTree,
  cloneData,
  TARGET_TEXT,
  type Strategy,
} from './scenarios'

const num = (env: string | undefined, fallback: number) => {
  const n = parseInt(env ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

const SIZES = (process.env.BENCH_SIZES ?? '100,400,1000')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n > 0)
// Mount is a multi-commit measurement (this editor fills the tree in via
// post-mount effects), so it's noisier than update/interactions and needs more
// samples for a stable median sign — hence the higher default.
const SAMPLES = num(process.env.BENCH_SAMPLES, 15)
const ISAMPLES = num(process.env.BENCH_ISAMPLES, 8)
const WARMUP = num(process.env.BENCH_WARMUP, 2)
const METRICS = (process.env.BENCH_METRICS ?? 'mount,update,interactions')
  .split(',')
  .map((s) => s.trim())

// Per (size, strategy) trees, generated once and shared across samples (mount
// re-renders a fresh instance each sample, so sharing the immutable data is
// fine and keeps allocation noise out of the measurement).
const TREES = SIZES.map((size) => ({ size, ...generateTree(size) }))

describe('render-cost: regular vs all-custom-node tree', () => {
  beforeAll(() => {
    const gcActive = typeof (globalThis as { gc?: () => void }).gc === 'function'
    console.log(
      `\nbench config: sizes=[${SIZES.join(', ')}] samples=${SAMPLES} ` +
        `interactionSamples=${ISAMPLES} warmup=${WARMUP} metrics=[${METRICS.join(', ')}]\n` +
        `forced GC between samples: ${gcActive ? 'ON' : 'OFF (run via `pnpm bench` for --expose-gc)'}\n` +
        `metric = React Profiler actualDuration (render-phase ms); mount/update Δ from min, median shown too.\n` +
        `jsdom + dev-mode React: compare RELATIVELY, not as real-world timings.`
    )
  })

  test('mount + update + interactions', async () => {
    // Warm the shared JsonEditor code paths (both strategies) before any
    // measurement, so the first-measured variant isn't penalised for
    // cold-start.
    const warmData = generateTree(SIZES[Math.floor(SIZES.length / 2)] ?? 100).data
    for (let i = 0; i < 3; i++) {
      measureMount(editorElement('regular', warmData))
      measureMount(editorElement('custom', warmData))
    }

    // ── Mount: cost to render every node once ──────────────────────────────
    if (METRICS.includes('mount')) {
      const rows = TREES.map(({ size, data, leaves }) => {
        const samples = runSamplesPaired(
          () => measureMount(editorElement('regular', data)),
          () => measureMount(editorElement('custom', data)),
          { warmup: WARMUP, samples: SAMPLES }
        )
        const reg = stats(samples.a)
        const cus = stats(samples.b)
        // Headline delta from the MIN (fastest, least GC-interfered run):
        // custom strictly does more work per node, so min orders the two
        // reliably, whereas the median is corrupted when a GC pause lands in
        // one variant's samples. Median shown too for transparency.
        const delta = cus.min - reg.min
        return {
          size,
          leaves,
          'reg min': round(reg.min),
          'cus min': round(cus.min),
          'Δ ms': round(delta),
          'Δ %': round((delta / reg.min) * 100, 1),
          'µs/leaf': round((delta / leaves) * 1000, 2),
          'reg med': round(reg.median),
          'cus med': round(cus.median),
        }
      })
      printTable('MOUNT — render the whole tree once (Δ from min)', rows)
    }

    // ── Update: force a whole-tree re-render (fresh data clone busts the memo)
    if (METRICS.includes('update')) {
      const rows = TREES.map(({ size, data, leaves }) => {
        const make = (strategy: Strategy) => {
          const before = editorElement(strategy, data)
          const after = editorElement(strategy, cloneData(data))
          return () => measureUpdate(before, after)
        }
        const samples = runSamplesPaired(make('regular'), make('custom'), {
          warmup: WARMUP,
          samples: SAMPLES,
        })
        const reg = stats(samples.a)
        const cus = stats(samples.b)
        const delta = cus.min - reg.min
        return {
          size,
          leaves,
          'reg min': round(reg.min),
          'cus min': round(cus.min),
          'Δ ms': round(delta),
          'Δ %': round((delta / reg.min) * 100, 1),
          'µs/leaf': round((delta / leaves) * 1000, 2),
          'reg med': round(reg.median),
          'cus med': round(cus.median),
        }
      })
      printTable('UPDATE — whole-tree re-render, data identity changed (Δ from min)', rows)
    }

    // ── Interactions: drive a real edit on the BENCH_TARGET leaf ────────────
    // Expected: ~parity between strategies — per-edit cost is O(edited node +
    // spine) by §16, independent of how the rest of the tree is rendered.
    if (METRICS.includes('interactions')) {
      const target = () => screen.getByText(TARGET_TEXT)
      interface Interaction {
        name: string
        action: (user: BenchUser) => Promise<void>
        setup?: (user: BenchUser) => Promise<void>
      }
      const interactions: Interaction[] = [
        { name: 'enter-edit', action: async (user) => { await user.dblClick(target()) } },
        {
          name: 'commit',
          setup: async (user) => { await user.dblClick(target()) },
          action: async (user) => { await user.keyboard('x{Enter}') },
        },
        {
          name: 'tab-move',
          setup: async (user) => { await user.dblClick(target()) },
          action: async (user) => { await user.keyboard('{Tab}') },
        },
      ]

      const rows: Record<string, unknown>[] = []
      for (const { size, data } of TREES) {
        for (const { name, action, setup } of interactions) {
          const drive = (strategy: Strategy) => () =>
            measureInteraction(controlledEditorElement(strategy, data), action, setup)
          const samples = await runSamplesPairedAsync(drive('regular'), drive('custom'), {
            warmup: WARMUP,
            samples: ISAMPLES,
          })
          const reg = stats(samples.a)
          const cus = stats(samples.b)
          rows.push({
            size,
            interaction: name,
            'regular ms': round(reg.median),
            'custom ms': round(cus.median),
            'Δ ms': round(cus.median - reg.median),
          })
        }
      }
      printTable('INTERACTIONS — per-edit commit cost (expect ~parity)', rows)
    }

    expect(true).toBe(true)
  })
})
