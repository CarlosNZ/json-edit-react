# Filter-function toolkit

Composable predicate builders for `json-edit-react`'s `allow*` props (`allowEdit`, `allowDelete`, `allowAdd`, `allowTypeSelection`, `allowDrag`, …) and `searchFilter`. Exported from the `@json-edit-react/utils/filters` subpath — kept off the package root so the generic builder names (`and`, `or`, `not`, `root`, `collections`, …) don't crowd it. Zero runtime dependencies.

Those props all take a function of a node — `allowEdit={(node) => …}`, `searchFilter={(node, text) => …}` — and hand-writing them is repetitive: you destructure `key` / `path` / `level` / `value`, compare, and combine. This kit replaces the boilerplate with small, named, composable pieces — `byKey('id')`, `byLevel({ min: 2 })`, `and`, `or`, `not` — that read like a sentence and snap together. Every builder returns the same `FilterPredicate` shape, so the same piece works on any of those props.

## Quick start

```tsx
import { JsonEditor } from 'json-edit-react'
import { and, byKey, byLevel, byType, matchRecord, not, primitives, root } from '@json-edit-react/utils/filters'

// Only leaf values are editable; only arrays accept new children.
<JsonEditor allowEdit={primitives} allowAdd={byType('array')} data={data} setData={setData} />

// Everything below the top two levels is editable, except `id` fields.
<JsonEditor allowEdit={and(not(byKey('id')), byLevel({ min: 2 }))} data={data} setData={setData} />

// Searching a list of records keeps a whole record visible when its name OR
// username matches — not just the single field that matched.
<JsonEditor searchFilter={matchRecord({ fields: ['name', 'username'] })} data={data} setData={setData} />

// The root object is locked; everything else can be added to and deleted.
<JsonEditor allowAdd={not(root)} allowDelete={not(root)} data={data} setData={setData} />
```

You can write these **inline**, as above, without a `useMemo` or hoisting them out of render — see [Referential stability](#referential-stability) for why that's safe.

## The predicate type

Everything here is a `FilterPredicate`:

```ts
type FilterPredicate<T = JsonData> = (node: NodeData<T>, searchText?: string) => boolean
```

The optional second argument is the load-bearing detail: a function of this shape is assignable to **both** `FilterFunction` (the `allow*` props, called with one argument) **and** `SearchFilterFunction` (`searchFilter`, called with two). So one set of builders serves every filter prop — there are no search-specific variants. The combinators thread `searchText` through, so a search bridge composes with a structural builder (`and(matchesSearch(), byLevel({ min: 1 }))`).

## Property builders

| Builder | Matches when… |
| --- | --- |
| `byKey(...keys)` | the node's own key is one of `keys`. A string/number matches the stringified key exactly (so `byKey(0)` matches array index `0`); a `RegExp` is tested against the stringified key. |
| `byPath(pattern)` | the node's path matches `pattern` — a glob string, a `RegExp`, or an explicit segment array. See [Path patterns](#path-patterns). |
| `byLevel(range)` | the node's depth is within `range` (the root is level `0`). |
| `bySize(range)` | a collection's child count is within `range`. Leaves have no size and never match. |
| `byType(...types)` | the node's value type is one of `types`: `'string'`, `'number'`, `'boolean'`, `'null'`, `'object'`, `'array'`. |
| `byValue(...values)` | a leaf's value equals one of `values`. Literals (`string` / `number` / `boolean` / `null`) match by strict equality; a `RegExp` is tested against the stringified value. Collections never match. |

`range` (for `byLevel` / `bySize`) is `number | { min?: number; max?: number }`: a bare number means *exactly* that, the object form bounds one or both ends, and an omitted end is unbounded. Bounds are inclusive — `byLevel(1)` is level 1 only, `byLevel({ min: 2 })` is level 2 and deeper, `bySize({ max: 0 })` is empty collections.

## Path patterns

`byPath` (and `matchRecord`'s `path` option) accept three forms.

**Glob string** — segments split on `.`, matched against the node's path:

| Token | Means | Example | Matches |
| --- | --- | --- | --- |
| *(a bare name)* | that exact segment | `'users'` | `users` only — not `users.0` |
| `*` | any one whole segment | `'users.*'` | `users.0`, `users.name` — *not* `users.0.name` |
| `*` *(within a segment)* | zero or more characters, not crossing a `.` | `'*Id'` | `userId`, `Id` |
| `?` | exactly one character | `'a?c'` | `abc` — not `ac` |
| `**` | zero or more whole segments (a subtree, *including its own root*) | `'users.**'` | `users`, `users.0`, `users.0.name` |
| `{a,b}` | alternation (nestable) | `'{name,email}'` | `name` or `email` |
| `[0]` / `.0` | an array index (equivalent forms) | `'users[0].name'` | `users.0.name` |

Patterns are anchored at both ends — `'a.b'` matches the path `a.b` exactly, not a path that merely contains it. `'**'` alone matches every node (including the root); `''` matches only the root.

**RegExp** — tested against the *stringified* path (dotted, with `[n]` for indices) and **not** anchored, so it matches anywhere in the path: `byPath(/^users\b/)`, `byPath(/\.geo$/)`.

**Segment array** — the escape hatch for keys that contain a literal `.` (a glob string would split on it): `byPath(['a.b', 'c'])` matches the two-segment path whose first key is literally `a.b`. `*` / `**` / `?` / `{…}` still apply *within* each element, so `['users', '*', 'email']` globs the middle segment.

## Position constants

These are plain predicates (no call needed) — use them directly or inside a combinator.

| Constant | Matches |
| --- | --- |
| `root` | the root node (level `0`). |
| `collections` | objects and arrays. |
| `primitives` | leaf values — everything that isn't a collection. |
| `inArray` | nodes whose parent is an array. |
| `inObject` | nodes whose parent is an object (not an array; the root, having no parent, doesn't match). |

## Combinators

`and(...preds)`, `or(...preds)`, and `not(pred)` build a predicate from others. They propagate `searchText`, so search bridges compose freely. The empty calls are the identity elements: `and()` is always true, `or()` is always false.

```ts
allowEdit={and(not(root), not(byKey('fragments', 'styles')))}   // editable, except the root and two reserved keys
allowDelete={or(byLevel({ min: 2 }), byType('array'))}          // deep nodes, or any array
```

A combinator's argument is any `FilterPredicate`, so a one-off inline function drops straight in alongside the kit's builders: `or(byKey('id'), (node) => node.value === 0)`.

## Search bridges

These turn the editor's live search into a predicate.

`matchesSearch(mode?)` matches the current `searchText` using core's own matchers — `'value'` (the default, node values), `'key'` (keys and path segments), or `'all'` (either). On its own, `searchFilter={matchesSearch()}` is just the editor's default search; its value is **composition** — combine it with structure to bend the default: `or(matchesSearch(), byKey('id'))` keeps `id` fields visible during a search, and `and(matchesSearch('value'), not(byLevel(0)))` searches values but never reveals the root.

`matchRecord({ fields, path? })` reveals a whole **record** when one of its `fields` matches the search — so a search over a list of objects keeps each matching object intact rather than collapsing it to the single field that matched. `path` (a `byPath` pattern, default `'*'` = the top-level items) locates the record layer: a node belongs to the *shortest* prefix of its path that matches `path`. Pin the layer with the pattern — avoid `**` for the record path, or every ancestor prefix qualifies.

```ts
searchFilter={matchRecord({ fields: ['name', 'username'] })}              // top-level records
searchFilter={matchRecord({ fields: ['title'], path: 'sections.*.items.*' })}  // a nested record layer
```

## Referential stability

The `allow*` and `searchFilter` props are compared by identity at the node `React.memo` boundary (and memoized upstream on prop identity), so a *fresh* function on every render would defeat json-edit-react's fine-grained re-rendering tree-wide. That's normally why you'd hoist a filter or wrap it in `useMemo`.

These builders remove that chore: each one **interns** its result, so equal arguments return the *same* instance. `byKey('name')` called this render is the exact function it returned last render, so writing it inline on a prop is memo-safe. A genuinely different argument still produces a different instance, so real changes propagate. Combinators intern on their children's identities, so a composite over the kit's own builders — `and(not(root), byLevel({ min: 1 }))` — is inline-stable too.

The one thing that breaks the chain is a *raw* inline function: `and(byKey('id'), (node) => node.value === 0)` mints a new arrow each render, so the `and` can't be cached. If you need that, hoist the inline part (or the whole `and`) to module scope or a `useMemo`, as you would any function prop.

## Using a predicate inside your own callback

The builders are plain `node → boolean` functions, so they're useful anywhere you need a boolean about a node — including inside a hand-written callback that returns something *other* than a boolean, like `allowTypeSelection` (which returns type/enum options):

```tsx
allowTypeSelection={(node) => {
  if (byKey('eye_color', 'hair_color')(node)) return ['blue', 'brown', 'green']
  if (byType('number')(node)) return ['number', 'string']
  return false
}}
```

Note the predicate must be **called** with the node — `byKey('eye_color')(node)`, not `byKey('eye_color')`. A bare `if (byKey('eye_color'))` is always truthy (a function is truthy), which would fire every branch.
