import type { FilterPredicate } from './types'

// Soft cap on a single builder's argument cache. Literal arguments keep these
// tiny and bounded; the cap only bites if a consumer feeds pathologically
// dynamic arguments in a loop, and clearing then just rebuilds on next use —
// never a correctness issue, only a lost cache hit.
const MAX_CACHE_ENTRIES = 10_000

// Make an argument injectively serialisable. JSON.stringify already does the
// hard part — it quotes and escapes strings (so `['a','b']` can't collide with
// `['a,b']`) and keeps the number 1 distinct from the string "1". We only need
// to special-case RegExp, which JSON would flatten to `{}` (it has no own
// enumerable props); tag it by source + flags so `/x/i` and `/x/g` differ. The
// recursion covers RegExps nested inside array/object args (e.g. a pattern in
// `matchRecord`'s options).
const normalise = (arg: unknown): unknown => {
  if (arg instanceof RegExp) return { __re: arg.source, flags: arg.flags }
  if (Array.isArray(arg)) return arg.map(normalise)
  if (arg !== null && typeof arg === 'object')
    return Object.fromEntries(Object.entries(arg).map(([k, v]) => [k, normalise(v)]))
  return arg
}

const keyOf = (args: readonly unknown[]): string => JSON.stringify(args.map(normalise))

/**
 * Wrap a value-argument builder so equal arguments return the SAME predicate
 * instance ("interning" / hash-consing).
 *
 * Why it matters: it lets a builder be written inline on a filter prop
 * (`allowEdit={byKey('name')}`) without minting a fresh function every render.
 * json-edit-react compares filter props by identity (the node `React.memo`
 * boundary, and `useMemo(…, [allowEdit])` upstream), so a new identity each
 * render would defeat fine-grained re-rendering tree-wide. A stable identity
 * keeps the memo intact; a genuinely different argument still produces a
 * different instance, so real changes still propagate.
 *
 * Each wrapped builder owns its own `Map`, keyed by an injective JSON
 * serialisation of the arguments (see `keyOf`). The cache lives as long as the
 * builder (module scope) and grows with the number of DISTINCT argument-sets —
 * bounded for the usual literal args; `MAX_CACHE_ENTRIES` backstops the rest.
 *
 * Builders whose arguments are FUNCTIONS (the `and`/`or`/`not` combinators)
 * can't be string-keyed and intern on reference identity via a `WeakMap`
 * instead — see those builders.
 */
export const intern = <A extends unknown[]>(
  build: (...args: A) => FilterPredicate
): ((...args: A) => FilterPredicate) => {
  const cache = new Map<string, FilterPredicate>()
  return (...args: A): FilterPredicate => {
    const key = keyOf(args)
    const cached = cache.get(key)
    if (cached) return cached
    const predicate = build(...args)
    if (cache.size >= MAX_CACHE_ENTRIES) cache.clear()
    cache.set(key, predicate)
    return predicate
  }
}

// --- Reference-keyed interning, for the combinators -------------------------
//
// `and`/`or`/`not` take FUNCTION arguments (other predicates), which can't be
// string-serialised — and shouldn't be (two predicates with identical source
// can differ; only identity tells them apart). They intern on reference
// identity via WeakMaps instead. Two upshots: it's correct (distinct closures
// stay distinct), and it's leak-free (an entry is GC'd once its key predicate
// is unreferenced). Because the kit's own builders already intern, a combinator
// over them — `and(byKey('a'), byPath('b'))` — is itself inline-stable.

/** Memoise a unary combinator (`not`) on its single predicate's identity. */
export const internRef = (
  combine: (pred: FilterPredicate) => FilterPredicate
): ((pred: FilterPredicate) => FilterPredicate) => {
  const cache = new WeakMap<FilterPredicate, FilterPredicate>()
  return (pred) => {
    const cached = cache.get(pred)
    if (cached) return cached
    const result = combine(pred)
    cache.set(pred, result)
    return result
  }
}

// A node in the WeakMap trie: a branch per child predicate, plus the memoised
// combinator for the sequence that ends here.
interface RefNode {
  next: WeakMap<FilterPredicate, RefNode>
  result?: FilterPredicate
}

/**
 * Memoise a variadic combinator (`and`/`or`) on the identities of its children,
 * in order, via a trie of WeakMaps — so `and(a, b)` returns one instance as
 * long as `a` and `b` are themselves stable. `empty` is the identity element
 * returned for the no-argument call.
 */
export const internRefs = (
  combine: (preds: FilterPredicate[]) => FilterPredicate,
  empty: FilterPredicate
): ((...preds: FilterPredicate[]) => FilterPredicate) => {
  const root: RefNode = { next: new WeakMap() }
  return (...preds: FilterPredicate[]): FilterPredicate => {
    if (preds.length === 0) return empty
    let node = root
    for (const pred of preds) {
      let child = node.next.get(pred)
      if (!child) {
        child = { next: new WeakMap() }
        node.next.set(pred, child)
      }
      node = child
    }
    return (node.result ??= combine(preds))
  }
}
