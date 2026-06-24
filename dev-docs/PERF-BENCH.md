# Render-benchmark suite (`pnpm bench`)

A headless, repeatable benchmark for JsonEditor render cost. Where [PERF-MEASUREMENT.md](PERF-MEASUREMENT.md) is the manual, in-browser procedure (React DevTools + the `RenderProfiler` overlay), this is the **run-it-whenever** version: one command, prints stats tables, no browser. It's a small reusable harness plus a registry of scenarios you keep adding to.

```sh
pnpm bench
```

It lives in [test/](../test/) (so it reuses the jest + RTL + ts-jest setup) but matches only `*.bench.tsx`, so it never runs as part of `pnpm test`, `prebuild`, or CI.

## What it measures

The metric is React's `Profiler` **`actualDuration`** — the render-phase milliseconds React spent on the editor subtree for a commit — summed across every commit inside a measurement window. This is the same metric the in-browser `RenderProfiler` overlay shows.

The first scenario ([test/perf/render-cost.bench.tsx](../test/perf/render-cost.bench.tsx)) compares two trees at several sizes:

- **regular** — a plain `JsonEditor`.
- **custom** — every leaf matched by a `customNodeDefinition` that renders `originalNode` + the `isPending` badge (`passOriginalNode: true`). This is the realistic "every editable field persists to a server, so every field shows a pending state" setup.

across three kinds of work:

| Metric | What it does | Why |
| --- | --- | --- |
| **mount** | render the whole (fully-expanded) tree once | the headline size-scaling cost; exposes the per-leaf wrapper overhead |
| **update** | force a whole-tree re-render (a fresh `data` clone changes every node's `data` identity, busting the reference-based memo in [memoNode.ts](../src/utils/memoNode.ts)) | the update-path equivalent of mount |
| **interactions** | drive a real `enter-edit` / `commit` / `tab-move` on a sentinel leaf and time the resulting commit | confirms the per-edit cost (and the strategy delta) stays small — §16 keeps it ~O(edited node + spine) |

## How to read the output

```
MOUNT — render the whole tree once (Δ from min)
 size | leaves | reg min | cus min | Δ ms | Δ % | µs/leaf | reg med | cus med
```

- **reg min / cus min** — the **fastest** sample for each variant. The headline delta is computed from these, not the median. Why min: the custom tree strictly does *more* work per node (an extra wrapper component), and a GC pause only ever *adds* time, so the least-interfered (min) run reflects the true cost and orders the two reliably. The median gets corrupted when a GC pause happens to land in one variant's samples — you'll sometimes see the **median** columns invert (custom "faster"), which is the noise the min sidesteps.
- **Δ ms / Δ %** — how much the all-custom tree costs over the regular one (from min).
- **µs/leaf** — the delta amortised per leaf: the marginal cost of wrapping one node in a custom component. Expect a few tens of µs (a wrapper component instance + a props spread) — i.e. mount in the low single-digit percent, a whole-tree update around 10%, never a multiple.
- **reg med / cus med** — medians, shown for transparency (and to see the GC noise band). Don't read the delta off these.
- **interactions** — expect the regular/custom gap to stay small (sub-ms to ~1ms) and *not* grow with tree size; the absolute number rises with size because of editor-level per-commit work shared by both strategies, not the rendering choice. `commit` is the noisiest (input teardown + value apply + custom re-mount), so its small delta wobbles in sign — that's noise, not a regression.

## Knobs (env vars)

| Var | Default | Meaning |
| --- | --- | --- |
| `BENCH_SIZES` | `100,400,1000` | leaf counts to test (comma-separated) |
| `BENCH_SAMPLES` | `15` | samples per mount/update measurement (mount is multi-commit and noisy — fewer samples can flip a small delta's sign) |
| `BENCH_ISAMPLES` | `8` | samples per interaction measurement (slower, so tune separately) |
| `BENCH_WARMUP` | `2` | discarded warmup runs per measurement |
| `BENCH_METRICS` | `mount,update,interactions` | subset of metrics to run |

A default run takes a couple of minutes (the interaction samples mount a fresh tree each time — that's the slow part). If a mount/update delta comes out with a surprising sign, it's noise: raise `BENCH_SAMPLES`. The **update** metric is the cleanest per-node signal (a single re-render pass, fewer confounding effect commits); **mount** is the real "time to first render" but noisier; **interactions** are expected to be ~parity between the two strategies — `commit` is the noisiest of the three (it tears down the input, applies the value, and re-mounts the custom node).

```sh
# quick smoke run
BENCH_SIZES=100 BENCH_METRICS=mount pnpm bench
# bigger trees (slower — jsdom is the bottleneck, not React)
BENCH_SIZES=500,2000,5000 pnpm bench
```

The `bench` script runs jest `--runInBand` under `node --expose-gc`, so the harness forces a GC between samples (`global.gc()`) — this is what keeps the A/B deltas from being swamped by GC landing on one variant. It also alternates which variant runs first each sample, for the same reason. If you run the bench file through a bare `jest` instead, you lose the forced GC and the deltas at large sizes get noticeably noisier.

## Caveats — read before quoting a number

- **Relative, not absolute.** This runs in **jsdom** with a **dev-mode** React build. The millisecond values are *not* real-browser timings — dev React is slower and jsdom has no layout/paint. Use the numbers to compare scenarios against each other and to track run-to-run trends, never as "the editor takes X ms in production."
- **Render-phase only.** `actualDuration` excludes effects, layout, and paint — same limitation as the in-browser overlay. The big real-world costs on huge trees are browser paint of the live DOM, which this can't see.
- **Noisy.** Single process, shared with jest. One run's exact figure will wobble, so the headline delta is taken from the **min** of each variant (least GC-interfered), and the harness uses **paired/interleaved sampling with alternating order** + a **global warm-up** + **forced GC between samples** so neither scenario is penalised for running first. Keep all of that if you add scenarios. Mount is the noisiest metric (this editor fills the tree in over several post-mount commits); update is the cleanest per-node signal.

## Adding a benchmark

The harness ([test/perf/harness.tsx](../test/perf/harness.tsx)) is scenario-agnostic; you shouldn't need to touch it. To add a measurement:

1. Add a scenario to [test/perf/scenarios.tsx](../test/perf/scenarios.tsx) — a data shape and/or an editor element factory.
2. In a `*.bench.tsx` (extend the existing file or add a sibling), build the variant elements and run them through the harness:
   - `measureMount(el)` / `measureUpdate(before, after)` / `measureInteraction(el, action, setup?)` — one measurement, returns ms.
   - `runSamplesPaired(a, b, opts)` / `runSamplesPairedAsync(...)` — interleaved samples of two variants (use this for fair A/B).
   - `stats(samples)` → `{ median, mean, p95, min, max, stddev, n }`.
   - `printTable(title, rows)` — `console.table` of plain row objects.

Keep the A/B paired (don't measure all of A then all of B — the first variant eats JIT cold-start), and warm up before measuring.
