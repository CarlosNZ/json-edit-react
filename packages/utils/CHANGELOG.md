# @json-edit-react/utils

## 0.9.0-beta.0

### Minor Changes

- a186a61: Add `iconFromSvg`: build a `Theme.icons` `IconDefinition` from raw SVG markup (a full `<svg>` string or bare inner markup), a React `<svg>` element (unwrapped via its props/children), or an existing `IconDefinition` (returned unchanged). String inputs are interned, so an inline `iconFromSvg('<svg…>')` keeps a stable reference across renders.
- 8bd38cb: Add confirm-before-update hooks — the first helpers in `@json-edit-react/utils`.

  - **`useJsonEditorConfirm`** (primitive) — bridges an imperative `confirm()` to a render-driven modal via a deferred promise. Returns `confirm` (resolves `Promise<boolean>`) and a `dialog` state object to drive your own modal.
  - **`useConfirmOnUpdate`** (declarative wrapper) — for the common "ask before these events" case. Declare `confirmOn` (event-name array or predicate), optional `title`/`message` (static or per-input), and an optional inner `onUpdate`; get back a ready-made `onUpdate` plus the same `dialog`. Also exposes `pending` (`{ path, event } | null`) — the node whose update is in flight.
  - **Pending-node overlay** (opt-in) — pass your own `pendingComponent` and `useConfirmOnUpdate` returns a ready `pendingNodeDefinition` to merge into `customNodeDefinitions` (or build it directly with `createPendingCommitDefinition`). Mainly useful when confirming _edits_; a _delete_-confirm doesn't need it.

  The package ships **no UI** — you bring your own modal (driven by `dialog`) and, if you want it, your own pending-node component. Both hooks build on core's async `onUpdate` contract (it `await`s the result and treats `null` as a silent cancel). No third-party runtime dependencies.

- 5e4a765: Add a filter-function toolkit — composable predicate builders for the `allow*` props (`allowEdit`, `allowDelete`, `allowAdd`, `allowTypeSelection`, …) and `searchFilter`. It ships under its own subpath, `@json-edit-react/utils/filters`, so its generic builder names (`and`, `or`, `not`, `root`, `collections`, …) stay off the package root.

  Every builder returns the same `FilterPredicate` shape — `(node, searchText?) => boolean` — whose optional second argument makes it assignable to both `FilterFunction` (the `allow*` props) and `SearchFilterFunction` (`searchFilter`), so one set of builders serves every filter prop. Property builders: `byKey`, `byPath` (glob / RegExp / segment-array paths), `byLevel`, `bySize`, `byType`, `byValue`. Position constants: `root`, `collections`, `primitives`, `inArray`, `inObject`. Combinators: `and` / `or` / `not` (they thread `searchText`, so search bridges compose with structural builders). Search bridges: `matchesSearch(mode?)` (wraps core's own matchers) and `matchRecord({ fields, path? })` (reveals a whole record when one of its fields matches, instead of collapsing it to the single matching field).

  Each builder interns its result, so equal arguments return the same instance — you can write a builder inline on a prop (`allowEdit={byKey('id')}`) without a `useMemo` or hoisting, and it won't churn json-edit-react's fine-grained re-rendering. No third-party runtime dependencies; the search bridges reuse core's exported `matchNode` / `matchNodeKey` / `extract`. See `src/filters/README.md` for the full reference, including the glob path syntax.

- 99e875a: Add `useUndo` — an undo/redo hook for `@json-edit-react/utils`.

  `useUndo(data, setData)` wraps a consumer-owned `data`/`setData` pair with undo/redo. It's **controlled**: the hook never holds its own copy of the data — you keep owning it (your own `useState`), and the hook holds only the snapshot stacks, committing each change through your `setData`. Pass the returned `set` as the editor's `setData`.

  Returns `data` (passthrough), `set` (record a snapshot then commit; accepts a value or a React-style updater), `undo` / `redo` (step through history; no-ops at the ends), `replace` (commit without a snapshot), `reset` (commit a new baseline and clear history), and `canUndo` / `canRedo` for your buttons.

  To load a new dataset, call `reset(newData)` rather than `setData` — the hook only sees changes that go through its own API. It deliberately doesn't auto-detect external `data` changes (a reference compare would wipe history on a fresh-but-equal `data`; a deep compare is too costly for a zero-dep helper). No third-party runtime dependencies.

- 7114e8a: Add reactive validation helpers — `useValidationState`, `validationStyles`, `ajvAdapter`, and the `useStableValue` primitive they build on.

  `useValidationState(data, validate)` runs a validator over the whole document and returns a queryable, identity-stable error index: `isValid`, `errors`, and the O(1) lookups `hasErrorAt(path)` / `errorsAt(path)` / `hasErrorWithin(path)`. It targets json-edit-react's fine-grained re-rendering: validating inline in a style function / `allow*` filter / custom-node `condition` goes stale when an edit on one node changes the validity of a node on _another_ branch (which doesn't re-render). The hook ties the result's identity to the error set, so memoizing a `theme` / `customNodeDefinitions` / `allow*` value on it re-renders the tree exactly when validity changes — and never on a valid→valid commit. The validator runs once per `data` change (not per node, not per keystroke), so the whole-document cost is O(N), not the O(N²) of validating inside every node's render.

  `validationStyles(validation, options?)` is theme sugar: a partial theme whose leaf slots flag `hasErrorAt` nodes (and, with `within`, collection ancestors via `hasErrorWithin`) — compose it as `theme={[myTheme, validationStyles(validation)]}`. `ajvAdapter(ajv.compile(schema))` adapts a compiled AJV validate function to the `Validate` contract, normalizing `instancePath` JSON-Pointers into node paths and keeping `required` errors at the parent path. You bring your own validator (or pass any `(data) => ValidationIssue[]`), so the package takes no third-party runtime dependency — not even on AJV.

  `useStableValue(compute, deps, isEqual?)` is exported standalone: like `useMemo`, but it returns the previous reference while the computed value is equal, so any cross-branch derived value (validation, duplicate detection, a doc-wide total) can drive a memo-piercing channel without re-rendering the tree on every commit.

### Patch Changes

- Updated dependencies [6b76705]
- Updated dependencies [de1cd5d]
- Updated dependencies [c846bc0]
- Updated dependencies [556b1cf]
- Updated dependencies [99ed120]
- Updated dependencies [b844e0f]
- Updated dependencies [94e5598]
- Updated dependencies [ae66784]
- Updated dependencies [13f5950]
- Updated dependencies [b82f8db]
- Updated dependencies [ffb32b3]
- Updated dependencies [7cb6ba7]
- Updated dependencies [a0872b5]
- Updated dependencies [1ac80d0]
- Updated dependencies [556b1cf]
- Updated dependencies [ee583bc]
- Updated dependencies [fc23b40]
- Updated dependencies [1cb7dc7]
- Updated dependencies [5ae18cb]
- Updated dependencies [03f6060]
- Updated dependencies [7cb6ba7]
- Updated dependencies [2c937a0]
- Updated dependencies [fca0b35]
- Updated dependencies [fca0b35]
- Updated dependencies [2cfdeae]
- Updated dependencies [ceb8dd9]
- Updated dependencies [b26c2cd]
- Updated dependencies [941a1cd]
- Updated dependencies [a20da5f]
- Updated dependencies [a186a61]
- Updated dependencies [2cfdeae]
- Updated dependencies [355b7f8]
- Updated dependencies [4b3576c]
- Updated dependencies [ece6d70]
- Updated dependencies [14c4eda]
- Updated dependencies [a0872b5]
- Updated dependencies [de1cd5d]
- Updated dependencies [f9458fc]
- Updated dependencies [a186a61]
- Updated dependencies [7cb6ba7]
- Updated dependencies [ece6d70]
  - json-edit-react@2.0.0
