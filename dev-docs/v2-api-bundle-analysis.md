# §17 API standardisation — bundle forensics

Forensic analysis of the bundle growth across the §17 batch (#296 clipboard-split,
#297 Phase 2, #298 Phase 3, #299 Phase 4 — umbrella [#294](https://github.com/CarlosNZ/json-edit-react/issues/294)).
Comparison: `v2.0-dev` → `feat/v2.0-api-phase-4` (HEAD), built identically.

_Date: 2026-06-03._

## The number

| | gzip ESM | raw ESM | pre-minify ("app") |
|---|---|---|---|
| v2.0-dev | 18,547 B | 53,465 B | 121.88 kB |
| HEAD | 19,673 B | 56,941 B | 131.11 kB |
| **Δ** | **+1,126 B (+6.1%)** | +3,476 B | **+9.23 kB** |

So ~9.2 kB of *authored* JS that terser+gzip squeezes to +1.1 kB. The "~1.4 kB"
estimate is the same ballpark (CJS is +1.17 kB; bundlephobia's minifier differs slightly).

**The headline that matters most:** this erased the sub-V1 margin. The v2 goal was to
beat V1 (19.27 KB — see [V2-roadmap.md](../V2-roadmap.md) "Bundle size — investigation notes").
v2.0-dev sat at **18.11 KiB** — comfortably under. HEAD is **19.21 KiB** — basically *on*
the V1 line. The §17 batch spent the entire lead.

## Where the 1,126 B went (measured, not guessed)

Chunks isolated by stripping them and rebuilding:

| Bucket | Net Δ gzip | Share | Necessary? |
|---|---|---|---|
| **`editorRef` Cat-4 command surface** (handle grew 88 B → 435 B) | **+347 B** | 31% | **Questionable** |
| **`onEditEvent` lifecycle stream** (emit sites; undercounted) | **+177 B** | 16% | Feature — judgement call |
| **Everything else**: canonical `UpdateResult` branching at ~6 commit sites + the session-commit registry + flat-`NodeData` payloads + the `buildNodeData` bridge + `onCopy` split + `onRename` | **+602 B** | 53% | Mostly contract |

## Main explanation: not *one* refactor, but three feature-systems layered on top of it

The expectation was "type consistency + naming." That part is **nearly free** —
`restrict*`→`allow*`, `enableClipboard`→`allowClipboard`, flat types: all net-neutral or
erased. The weight came from three *behavioural* systems §17 introduced:

1. **The `editorRef` Category-4 command surface** ([JsonEditor.tsx:498-583](../src/JsonEditor.tsx#L498-L583)) —
   `startEdit`/`startRename`/`startAdd` + `confirm`/`cancel`, each with
   `PATH_NOT_FOUND`/`RESTRICTED` error production, the `SENTINEL`/`liveNode`/`fail`/`open`
   helpers. The handle went from 4 trivial methods to a small subsystem — **5× bigger,
   +347 B net, the single largest chunk.** And it pulls in...

2. **The session-commit registry** — `registerSessionCommit`/`confirmSession`/`SessionCommit`
   in [EditingProvider.tsx](../src/contexts/EditingProvider.tsx) plus a `commitRef` +
   `useLayoutEffect` in **four** components ([ValueNodeWrapper](../src/ValueNodeWrapper.tsx#L229-L232),
   [KeyDisplay](../src/KeyDisplay.tsx#L67-L74), [CollectionNode](../src/CollectionNode.tsx#L234-L237),
   [ButtonPanels](../src/ButtonPanels.tsx#L130-L134)). This exists **solely** so
   `editorRef.confirm()` can await a result across all three session types. The old handle's
   `confirmEdit()` just did `editConfirmRef.current?.click()` — nearly free.

3. **The `onEditEvent` lifecycle stream** — every commit site now branches three ways
   (`false`=cancel / error / confirm) and fires `emitEditEvent(...)` with flat `NodeData`.
   This is §12 (`onRenameProperty`) folded into a full start/confirm/cancel observer stream.

## Redundancy / double-handling found

- **`apiTypes.ts` is 142 lines of dead, duplicated code.** It's imported by **nothing**,
  re-exported by nothing, and re-declares ~9 types (`UpdateResult`, `UpdateFunction`,
  `JsonEditorError`, `FilterFunction`…) that the implementation **re-declared again** in
  [types.ts](../src/types.ts) rather than importing. Phase 0 landed it as "staging"; the staging
  was never consumed. Zero bundle cost, but it's the clearest "double-handling" in the batch —
  and it still carries the *parked* `EventInterceptFunction`/`InterceptableEvent`.
  **Recommend: delete it** (or have `types.ts` re-export from it).

- **"Moving state around" — confirmed.** The `buildNodeDataFromPathRef` bridge
  ([JsonEditor.tsx:488-496](../src/JsonEditor.tsx#L488-L496)) is threaded
  `JsonEditor → TreeStateProvider → EditingProvider + CollapseProvider` purely so those
  *ancestor* providers can reconstruct a node's `NodeData` from a bare path at event time —
  because they fire some observer events but don't own the data. A genuine "reach back up for
  state we don't have here" smell.

- **`onCollapse` fires from two different places.** A plain user click fires it *from the node*
  with live `nodeData` (no bridge) ([CollectionNode.tsx:286](../src/CollectionNode.tsx#L286)); a
  modifier-click or `editorRef.collapse` fires it *from the provider* via the bridge. Same
  event, two construction paths. Not a double-fire bug, but two ways to do one thing.

- **`buildNodeData` now runs on every commit** to build the *full* flat payload (`level`,
  `index`, `size`, `parentData`, `fullData`) even though most callbacks read one field. The
  old payloads were lean. This is the "flat NodeData everywhere" decision doing more work than
  any single callback needs.

## Is it *truly* all necessary?

**No.** Split it:

- **The ~602 B "contract" bucket is the product** — the canonical `UpdateResult` (§6) and flat
  `NodeData` (§17) are exactly the consistency the work set out to buy. Trimming it means
  walking back the API. Keep it.
- **The ~347 B Category-4 handle is the weakest-justified spend** — and the direct-mutator cut
  already flagged this instinct. The shipped `startRename`/`startAdd`/`confirm()` carry full
  error-code production, but the roadmap itself calls #286's session-openers "largely mooted"
  and #117 now routes through `onEventIntercept` (which **isn't even implemented yet**). This
  is the heaviest new chunk, for commands whose consumer demand is unproven, in a release whose
  stated aim is "clean house, not ship features."

## Alternatives (with estimates)

1. **Delete `apiTypes.ts`** — 0 bundle, removes 142 dead/duplicated lines. Pure win, do
   regardless.
2. **Drop awaitable `confirm()`, keep `.click()`** — recovers the session-commit registry (4×
   `commitRef`+`useLayoutEffect` + store plumbing). Estimated **~150–250 B**, and deletes a lot
   of the "machinery" feel. Loses the `CommandResult` from `confirm()` — but a consumer who owns
   `setData` rarely needs it.
3. **Defer `startRename`/`startAdd` to 2.x** — ship only `startEdit`/`cancel`/`collapse` in 2.0
   (what §10 actually landed). Recovers a chunk of the +347 B and lets real demand justify the
   rest. Pairs naturally with #2.
4. **Drop the provider-fired events / the bridge** — fire *all* lifecycle + collapse events from
   the node layer (which always has `NodeData`). Recovers ~50–100 B and removes the "moving state
   around" threading, at the cost of handling cancel-on-unmount node-side.
5. **Do nothing** — accept ~19.2 KiB. Defensible *if* the full Cat-4 surface is valued, but it
   forfeits the V1-beating goal.

**Recommendation: #1 + #2 + #3.** Likely claws back ~400–600 B (back under 19 KiB, margin
restored) while keeping the valuable part — the unified `onUpdate`/`UpdateResult`/flat-`NodeData`
contract — fully intact. It also aligns the *shipped* scope with the decision already made on the
direct mutators.

## Caveats / methodology

- Numbers are `gzip -c build/index.esm.js | wc -c` on `SKIP_TESTS=1 pnpm build` output (terser
  on, es2020 target), per branch.
- Bucket attribution was measured by stripping each system to a no-op and rebuilding:
  the `editorRef` handle reduced to collapse-only on *both* branches (88 B on dev, 435 B on HEAD
  → +347 B net); lifecycle-stream emit sites no-op'd on HEAD (+177 B).
- The **177 B lifecycle figure is a floor** — the `useCommon` rename emits and `ButtonPanels`
  add-session emits were left in.
- The **session-commit registry isn't separately measured** — it lives inside the 602 B
  "everything else". Either can be pinned down precisely if it would change a decision.
