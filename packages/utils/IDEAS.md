# @json-edit-react/utils — ideas backlog

A scratchpad of candidate helpers for this package. Nothing here is committed —
it's a place to capture and rank ideas before they earn an issue.

**Fit criteria.** A good `/utils` helper is consumer-side glue that is:

- **pure logic** (hooks, generators, plain functions) — not UI;
- **composed on the public API** — `data`/`setData`, the async `onUpdate` result
  protocol, the `allow*` filter functions, `searchFilter`, `editorRef`,
  `onCollapse`/`onEditEvent`, `NodeData`;
- **zero runtime dependency** by default — any risky parser/validator is lazy and
  isolated behind a sub-path export (the posture already set for the JSON Schema
  generator below). See [CLAUDE.md](CLAUDE.md).

## Planned / in-flight

- **Confirm-before-update hooks** — `useJsonEditorConfirm` + `useConfirmOnUpdate`.
  _Shipped_ (`src/confirm-update/`). ([#307](https://github.com/CarlosNZ/json-edit-react/issues/307))
- **JSON Schema → filter functions** — generate `allow*` functions from a schema
  so the UI can't produce invalid data (preventive). ([#285](https://github.com/CarlosNZ/json-edit-react/issues/285))
- **Search helpers** — ready-made `searchFilter` functions for common patterns.
  ([#319](https://github.com/CarlosNZ/json-edit-react/issues/319))
  Should also include **`expandToMatches(data, searchText, searchFilter?)`** — reveal search matches hidden inside collapsed subtrees. Has to be a *data-level* traversal: lazy mounting means core never evaluates `filterNode` below the collapse frontier, so it can't know about deep matches — walk `data` with the search predicate, collect matching paths, emit a `CollapseState[]` expanding every ancestor, feed it to `editorRef.collapse`. Composes with the `searchFilter` helpers (same predicate finds the paths). Drift hazard: with no custom `searchFilter` it must mirror core's default match semantics (`searchProperty`, collection-matches-via-descendants) — build it on core's exported `matchNode` / `matchNodeKey`, don't re-implement.
- **Filter-function toolkit** — composable predicate builders (`byKey`, `byPath`, `byLevel`, `byType`, …) + `and`/`or`/`not` combinators for the `allow*` props and `searchFilter`. Full design with examples in [#343](https://github.com/CarlosNZ/json-edit-react/issues/343).

---

## State & data lifecycle

These reinforce the recommended pattern (consumer owns `data`/`setData`; `onUpdate`
is for side effects, not state ownership), rather than working around it.

### Undo / redo — `useUndo` _(basic version shipped)_
_Shipped_ (`src/undo/`) and in use in the demo: a controlled, zero-dep wrapper over consumer-owned `data`/`setData`, with the queue transitions kept pure for unit testing. (Keystroke coalescing turned out moot — `data` only changes per commit under the editing model, so a commit is already the natural undo step.)

Possible extension — **settlement-awareness**. Core's optimistic commit and its late revert both arrive through the same `setData` channel, so a *failing* async `onUpdate` leaves phantom history: undo can resurrect the server-rejected value (sync failures collapse to a single no-op undo step, and only by a stale-closure accident). Fix shape: an optional composable `onUpdate` wrapper that tags the just-pushed `past[0]` per commit and, on a failure result, drops the tagged entry plus the revert-push (identified by reference-equality with the commit's `newData`) in a microtask. Degrades gracefully on interleaved commits (reference check fails → today's behaviour) and on superseded same-node settlements (core never reverts → nothing to drop). The same wrapper is the settlement-aware recorder `useChangeLog` needs — build once, share. Residual edge to document rather than solve: undo while a settlement is pending (a late revert applies onto the undone doc). Other small extensions: optional Ctrl+Z / Ctrl+Y binding.

### Persistence — `usePersistentJson`
Debounced sync of `data` (and optionally collapse state, via `onCollapse`) to
`localStorage`/`sessionStorage`, with hydrate-on-mount and a version/migrate hook.
Zero-dep, very common.

Design note: make the write target pluggable (an async `save` instead of just web storage). The debounce/queue machinery then doubles as a `serializeSaves(save)` combinator — coalesce to the latest doc, one in-flight request at a time — which covers the one genuine remote-save gap core doesn't: interleaved whole-document PUTs can land out of order at the server even though core's per-commit token keeps the *UI* converged.

### Dirty-state / unsaved-changes guard — `useDirtyState`
`useDirtyState(data, options?)` → `{ isDirty, markClean, baseline }`. The hook owns the baseline: it snapshots the first non-`undefined` `data` (hydration-aware), and `isDirty` deep-compares against it — recomputed per commit only, since `data` never changes per keystroke. The consumer signals saves: `markClean(savedData)` re-snapshots the baseline. Exposing `baseline` gives a Revert button for free (`setData(baseline)`) without the hook touching consumer state. `options.guardUnload` wires the `beforeunload` listener while dirty (Chrome's `preventDefault` + `returnValue` incantation); SPA route-blocking stays the consumer's job via `isDirty`. Zero-dep.

The naive version is recipe-grade (`useState` + stringify compare); what earns the hook: **`markClean` takes the value that was actually saved** — by the time an async save resolves the user may have kept editing, and snapshotting *current* data would silently mark those edits clean; a structural deep-equal so undo-back-to-original reads as clean (reference/counter checks get this wrong; stringify has no early exit on big docs); and the hydration + unload wiring. Scope: only meaningful in the **batch-save architecture** (edit locally, Save button posts) — in a per-commit `onUpdate` save flow `isDirty` would never meaningfully be true. Pairs with `usePersistentJson` and a Save button.

## Validation (reactive — complements #285's preventive angle)

### Validation-state display — `useValidationState` + `validationStyles`
Origin: [#197](https://github.com/CarlosNZ/json-edit-react/issues/197#issuecomment-4599915865) — flag errors rather than rejecting edits. Uniquely among the three validation angles, this also covers data that was *already invalid when loaded* (#285 prevents invalid entry; `createUpdateValidator` gates at commit; neither sees pre-existing errors).

The core deliverable is **an error-state index over the whole data tree**: run the validator once per `data` change, normalize the issues, and make the result queryable in O(1) by any consumer — style functions are the headline consumer; commit-gate messages, disabled Save buttons, and error-summary panels are the others.

```ts
interface ValidationIssue {
  path: CollectionKey[]   // normalized location; [] = the document root
  message: string         // human-readable, produced by the adapter
  keyword?: string        // lib-specific code ('type', 'required', 'pattern', …)
  raw?: unknown           // the library's original error object — escape hatch
}

interface ValidationState {
  isValid: boolean
  errors: ValidationIssue[]                               // all issues, document order
  hasErrorAt: (path: CollectionKey[]) => boolean          // exact node — the style-function hot path
  errorsAt: (path: CollectionKey[]) => ValidationIssue[]  // tooltips / summary panels / gate messages
  hasErrorWithin: (path: CollectionKey[]) => boolean      // node OR any descendant — ancestor marking
}
```

Internals: one pass over the normalized issues builds a `Map<pathString, ValidationIssue[]>` (backs `hasErrorAt`/`errorsAt`) and a `Set` of every ancestor prefix (backs `hasErrorWithin`, so a collapsed parent can show "something's invalid in here" — same mount-frontier blindness as `expandToMatches`). Functions, not raw maps: the path-string keying must use `toPathString`-style escaping (keys can contain `.`) and shouldn't leak.

**The §16 invariant — identity keyed on the error set.** Document validity is a whole-document property: an edit at node A can change the validity of node B on another branch (discriminated unions, `dependentRequired`), but B never re-renders under fine-grained re-rendering, so in-style-function validation — naive *or* lookup-based — shows stale state with a stable theme. For styles, the consumer-land channel that reaches B is theme identity — a theme context update pierces `React.memo` tree-wide (see the memo comment in `ThemeProvider.tsx`). So the hook deep-compares each run's normalized error set against the previous (it's small — paths + messages) and **returns a referentially stable object when nothing changed**: valid→valid commits (the overwhelming majority) keep the full §16 memo boundary; when validity does change, the identity changes, the tree re-renders once — correctly restyling cross-branch nodes — and each render is an O(1) lookup, not a validation. This also kills the naive version's O(N²) mount (N nodes × whole-doc validation) and per-search-keystroke validations.

`validationStyles(validation, css?)` is thin sugar over the hook: a partial theme whose slot functions consult `hasErrorAt` (and optionally `hasErrorWithin` for collection slots), composed as `theme={[myTheme, validationStyles(validation)]}`. Preset wrinkle: theme styles are inline, so no pseudo-elements — a ⚠️ indicator preset means a background-image data-URI SVG, not a glyph; red text/border presets are trivial. Richer error-display *components* would live in `/components`, consuming the same hook.

**Not just styles — the same staleness hits `allow*` and custom-node `condition`.** Any render-time function of `NodeData` that reads `fullData` is eventually-consistent by design (the memo comparator in `memoNode.ts` deliberately ignores `fullData` identity — its doc comment names this exact hazard). But those props have their own piercing channels: the `allow*` filters and `customNodeDefinitions` are `Object.is`-compared node props (and `JsonEditor` threads consumer identity straight through, e.g. `allowEditFilter` is memoized on `allowEdit`), so a function memoized on the validation state — `useMemo(() => (nd) => !validation.hasErrorWithin(nd.path), [validation])` — re-renders the tree exactly when the answer changes, same discipline as the theme channel. Worth a convenience on the hook (e.g. `validation.filter(fn)` doing the memo internally). For `condition`, memoize the *definitions array* on the state — same component references inside, so conditions re-evaluate without remounting (the supported switching path).

**Shared atom — `useStableValue(compute, deps, isEqual?)`.** The identity stabilizer underneath all of this: recompute per data change, but return the *previous* reference while the result is deep-equal. It's how `useValidationState` keeps its identity stable across valid→valid commits, exposed standalone so any cross-branch condition (validation or not) can apply the same discipline to whichever channel fits — theme, `allow*` filter, definitions array.

Shares the issue-normalization kernel and validator adapters with `createUpdateValidator` below — `errorsAt(path)[0]?.message` is literally the commit-gate message, so the gate can be implemented on top of this hook. Adapter fiddliness the kernel owns: AJV reports missing properties at the *parent* path (`params.missingProperty`) while Zod puts the missing key *in* the path — both normalize to the parent collection path (the missing child has no node to style).

### Validate-on-commit adapter — `createUpdateValidator`
Wraps a validator into `onUpdate`, turning failures into `{ error }`. #285 stops invalid data being *enterable*; this catches it *on commit* — different axes, both useful. Validators are sync, so this rides the fail-fast path of the editing model: plain sync `{ error }` return, no optimistic flash, no settlement timing.

The wrapping itself is a three-line recipe — the helper earns its keep in **error normalization and scoping the message to the edited node**. Each library reports issues differently (AJV: `instancePath` JSON Pointers, with `anyOf`/`oneOf` spraying errors across irrelevant branches; Zod: `issues[].path` arrays; Yup: thrown `ValidationError` with dot-paths), and picking the most relevant issue for the node just edited — pointer escaping, errors on ancestors, multiple issues — is genuinely fiddly. Build that issue-normalization layer once and share it with the validation-styling helper above, which needs the exact same machinery (run validator → normalize issues → match against a node's path). That shared kernel is the real strategic argument for both.

Dependency posture: unlike #285, this never *interprets* a schema — the consumer hands over their own constructed validator (a Zod schema instance, a compiled AJV function) and the adapters only call it, so Zod / AJV / Yup are **type-only** (peer/dev deps, erased at build). Zero runtime deps throughout; sub-path exports per adapter are still right, but for tree-shaking, not dep quarantine.

API note: design the composable inner form first — `checkUpdate(props) => { error } | undefined` that consumers can call inside their own `onUpdate` (the common "validate, then save" shape: `onUpdate={async (props) => checkUpdate(props) ?? await save(props.newData)}`). Using it directly as the prop falls out for free.

## Observability & view control

### Change-log / diff — `useChangeLog` + `diffJson`
Records each `onUpdate` (path, old → new, event, timestamp) into an audit trail,
plus a `diffJson(a, b)` helper for "what changed" UIs. Zero-dep.
---

## Rough priority

1. Undo / redo — basic `useUndo` shipped; settlement-awareness extension pending
2. Persistence
3. Filter-function toolkit

…then validate-on-commit and dirty-state.

## Deliberately out of scope

- Anything duplicating core (clipboard, keyboard handling).
- i18n locale bundles — that's content, and belongs nearer core's `localisation`.
- Remote sync (`useSyncedData`) — cut. The pitched payload (optimistic commit, rollback on failure, error → `{ error }` mapping) is all core behaviour under the v2 editing model, and the `load`/state-owning half collides with whatever data layer the app already has (React Query, SWR, …). Hand-rolled it's ~12 lines — a README/demo recipe at most. The one residual real problem (server-side write ordering) lives on as the `serializeSaves` design note under `usePersistentJson`.
