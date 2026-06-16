import type { FilterPredicate } from './types'

// Soft cap on a single builder's argument cache. Literal arguments keep these
// tiny and bounded; the cap only bites if a consumer feeds pathologically
// dynamic arguments in a loop, and clearing then just rebuilds on next use —
// never a correctness issue, only a lost cache hit.
const MAX_CACHE_ENTRIES = 10_000

// Make one argument injectively serialisable. JSON.stringify already does the
// hard part — it quotes and escapes strings (so `['a','b']` can't collide with
// `['a,b']`) and keeps the number 1 distinct from the string "1". We only need
// to special-case RegExp, which JSON would flatten to `{}` (it has no own
// enumerable props); tag it by source + flags so `/x/i` and `/x/g` differ.
const normalise = (arg: unknown): unknown =>
  arg instanceof RegExp ? { __re: arg.source, flags: arg.flags } : arg

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
