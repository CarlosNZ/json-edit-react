---
'@json-edit-react/utils': minor
---

Add a filter-function toolkit — composable predicate builders for the `allow*` props (`allowEdit`, `allowDelete`, `allowAdd`, `allowTypeSelection`, …) and `searchFilter`.

Every builder returns the same `FilterPredicate` shape — `(node, searchText?) => boolean` — whose optional second argument makes it assignable to both `FilterFunction` (the `allow*` props) and `SearchFilterFunction` (`searchFilter`), so one set of builders serves every filter prop. Property builders: `byKey`, `byPath` (glob / RegExp / segment-array paths), `byLevel`, `bySize`, `byType`, `byValue`. Position constants: `root`, `collections`, `primitives`, `inArray`, `inObject`. Combinators: `and` / `or` / `not` (they thread `searchText`, so search bridges compose with structural builders). Search bridges: `matchesSearch(mode?)` (wraps core's own matchers) and `matchRecord({ fields, path? })` (reveals a whole record when one of its fields matches, instead of collapsing it to the single matching field).

Each builder interns its result, so equal arguments return the same instance — you can write a builder inline on a prop (`allowEdit={byKey('id')}`) without a `useMemo` or hoisting, and it won't churn json-edit-react's fine-grained re-rendering. No third-party runtime dependencies; the search bridges reuse core's exported `matchNode` / `matchNodeKey` / `extract`. See `src/filters/README.md` for the full reference, including the glob path syntax.
