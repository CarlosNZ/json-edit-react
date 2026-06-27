/**
 * Reusable measurement core for the headless render benchmarks (`*.bench.tsx`).
 *
 * This is the part you DON'T touch when adding a new benchmark — it just turns
 * "render this element" / "drive this interaction" into a React-render-cost
 * number and a stats summary. To add a benchmark, write a scenario (see
 * `scenarios.tsx`) and a `*.bench.tsx` that calls `runSamples` + `stats`.
 *
 * Metric: React `Profiler` `actualDuration` — the render-phase time React spent
 * on the wrapped subtree for a commit, the same metric the in-browser
 * `demo/src/RenderProfiler.tsx` overlay reports. We SUM it across every commit
 * inside a measurement window, so "mount" = all commits triggered by the first
 * render, "update"/"interaction" = all commits triggered after the reset point.
 *
 * Caveats (see dev-docs/PERF-BENCH.md): jsdom + dev-mode React means the
 * absolute milliseconds are NOT browser numbers — they're only meaningful
 * relative to each other (scenario-vs-scenario, run-to-run). `actualDuration`
 * is render-phase only (no layout/paint). Warmup + median tame JIT/GC noise.
 */

import React from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/** The `userEvent` instance handed to interaction actions. */
export type BenchUser = ReturnType<typeof userEvent.setup>

// ── Profiler accumulator ─────────────────────────────────────────────────────

interface Accumulator {
  commits: number
  total: number
  last: number
}

const makeAccumulator = (): Accumulator => ({ commits: 0, total: 0, last: 0 })

const reset = (acc: Accumulator) => {
  acc.commits = 0
  acc.total = 0
  acc.last = 0
}

// Wraps the measured subtree. `onRender` mutates the shared accumulator — it
// holds no state, so it never itself drives a commit it would then count.
const Profiled: React.FC<{ acc: Accumulator; children: React.ReactNode }> = ({ acc, children }) => (
  <React.Profiler
    id="bench"
    onRender={(_id, _phase, actualDuration) => {
      acc.commits += 1
      acc.total += actualDuration
      acc.last = actualDuration
    }}
  >
    {children}
  </React.Profiler>
)

// Force a GC between samples when the suite is run with `node --expose-gc`
// (optional — `pnpm bench` works without it, just slightly noisier).
const maybeGc = () => (globalThis as { gc?: () => void }).gc?.()

// ── Measurements (one fresh mount per call; always unmounts) ─────────────────

/** Render-phase ms to get `element` on screen: every commit the first render
 *  triggers, including the immediate effect-driven follow-up commits this
 *  editor fills the tree in with (so it's the real "time to render", not just
 *  the first commit). Noisier than `measureUpdate` for that reason — read
 *  `update` as the cleaner per-node signal. */
export const measureMount = (element: React.ReactElement): number => {
  const acc = makeAccumulator()
  const { unmount } = render(<Profiled acc={acc}>{element}</Profiled>)
  const total = acc.total
  unmount()
  return total
}

/** Total render-phase ms for a whole-tree update: mount `before`, then
 *  re-render with `after`. Pass a structurally-fresh `data` (deep clone) as
 *  `after` to bust the per-node memo for every node (see memoNode.ts — `data`
 *  is compared by reference). The mount cost is excluded (reset between the
 *  two). */
export const measureUpdate = (before: React.ReactElement, after: React.ReactElement): number => {
  const acc = makeAccumulator()
  const { rerender, unmount } = render(<Profiled acc={acc}>{before}</Profiled>)
  reset(acc)
  rerender(<Profiled acc={acc}>{after}</Profiled>)
  const total = acc.total
  unmount()
  return total
}

/** Total render-phase ms for the commits an interaction triggers. `setup`
 *  runs BEFORE the reset (its commits aren't counted — e.g. opening the
 *  editor so the measured action is the commit, not the mount); `action` is
 *  the measured interaction. */
export const measureInteraction = async (
  element: React.ReactElement,
  action: (user: BenchUser) => Promise<void>,
  setup?: (user: BenchUser) => Promise<void>
): Promise<number> => {
  const user = userEvent.setup()
  const acc = makeAccumulator()
  const { unmount } = render(<Profiled acc={acc}>{element}</Profiled>)
  if (setup) await setup(user)
  reset(acc)
  await action(user)
  const total = acc.total
  unmount()
  return total
}

// ── Sampling ─────────────────────────────────────────────────────────────────

export interface SampleOptions {
  warmup: number
  samples: number
}

export const runSamples = (fn: () => number, { warmup, samples }: SampleOptions): number[] => {
  for (let i = 0; i < warmup; i++) fn()
  const out: number[] = []
  for (let i = 0; i < samples; i++) {
    maybeGc()
    out.push(fn())
  }
  return out
}

export const runSamplesAsync = async (
  fn: () => Promise<number>,
  { warmup, samples }: SampleOptions
): Promise<number[]> => {
  for (let i = 0; i < warmup; i++) await fn()
  const out: number[] = []
  for (let i = 0; i < samples; i++) {
    maybeGc()
    out.push(await fn())
  }
  return out
}

/**
 * Interleaved sampling of two variants (e.g. regular vs custom). Alternating
 * A,B,A,B… within one loop shares JIT/GC drift between them, so neither is
 * penalised for running first — which a naive "all of A, then all of B" run
 * does (the first variant eats cold-start). Returns each variant's samples.
 */
export const runSamplesPaired = (
  a: () => number,
  b: () => number,
  { warmup, samples }: SampleOptions
): { a: number[]; b: number[] } => {
  for (let i = 0; i < warmup; i++) {
    a()
    b()
  }
  const as: number[] = []
  const bs: number[] = []
  for (let i = 0; i < samples; i++) {
    // Alternate which variant runs first each sample: whichever runs second
    // benefits from the first's allocation/GC state, so fixing the order would
    // bias against the always-first variant. Forcing a GC before each (when
    // `--expose-gc` is on) further steadies the numbers.
    if (i % 2 === 0) {
      maybeGc()
      as.push(a())
      maybeGc()
      bs.push(b())
    } else {
      maybeGc()
      bs.push(b())
      maybeGc()
      as.push(a())
    }
  }
  return { a: as, b: bs }
}

export const runSamplesPairedAsync = async (
  a: () => Promise<number>,
  b: () => Promise<number>,
  { warmup, samples }: SampleOptions
): Promise<{ a: number[]; b: number[] }> => {
  for (let i = 0; i < warmup; i++) {
    await a()
    await b()
  }
  const as: number[] = []
  const bs: number[] = []
  for (let i = 0; i < samples; i++) {
    if (i % 2 === 0) {
      maybeGc()
      as.push(await a())
      maybeGc()
      bs.push(await b())
    } else {
      maybeGc()
      bs.push(await b())
      maybeGc()
      as.push(await a())
    }
  }
  return { a: as, b: bs }
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface Stats {
  n: number
  median: number
  mean: number
  p95: number
  min: number
  max: number
  stddev: number
}

const quantile = (sorted: number[], q: number): number => {
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export const stats = (nums: number[]): Stats => {
  const sorted = [...nums].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((s, x) => s + x, 0) / n
  const variance = sorted.reduce((s, x) => s + (x - mean) ** 2, 0) / n
  return {
    n,
    median: quantile(sorted, 0.5),
    mean,
    p95: quantile(sorted, 0.95),
    min: sorted[0],
    max: sorted[n - 1],
    stddev: Math.sqrt(variance),
  }
}

/** Round for display without dragging in a formatting lib. */
export const round = (n: number, dp = 3): number => Number(n.toFixed(dp))

/** Print a labelled table of plain row objects (uses `console.table`). */
export const printTable = (title: string, rows: Record<string, unknown>[]): void => {
  console.log(`\n${title}`)
  console.table(rows)
}
