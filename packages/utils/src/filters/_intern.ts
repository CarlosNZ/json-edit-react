import type { FilterPredicate } from './types'

// --- Reference-keyed interning, for the combinators -------------------------
//
// `and`/`or`/`not` take FUNCTION arguments (other predicates), which can't be
// string-serialised — and shouldn't be (two predicates with identical source
// can differ; only identity tells them apart). They intern on reference
// identity via WeakMaps instead. Two upshots: it's correct (distinct closures
// stay distinct), and it's leak-free (an entry is GC'd once its key predicate
// is unreferenced). Because the kit's own builders already intern, a combinator
// over them — `and(byKey('a'), byPath('b'))` — is itself inline-stable.
//
// (The value-keyed `intern`, used by the value-argument builders, lives in the
// shared `_common/intern.ts`.)

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
