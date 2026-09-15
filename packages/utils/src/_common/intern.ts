// Soft cap on a single builder's argument cache. Literal arguments keep these
// tiny and bounded, so the cap only bites on pathologically dynamic arguments
// fed in a loop; clearing then rebuilds on next use, costing a cache hit rather
// than correctness.
const MAX_CACHE_ENTRIES = 10_000

// Make an argument injectively serialisable. `JSON.stringify` does the hard
// part: it quotes and escapes strings, so `['a','b']` can't collide with
// `['a,b']`, and keeps the number 1 distinct from the string "1". Only RegExp
// needs special-casing, since JSON flattens it to `{}` (it has no own
// enumerable props); tagging it by source + flags keeps `/x/i` and `/x/g`
// distinct. The recursion covers RegExps nested inside array/object args.
const normalise = (arg: unknown): unknown => {
  if (arg instanceof RegExp) return { __re: arg.source, flags: arg.flags }
  if (Array.isArray(arg)) return arg.map(normalise)
  if (arg !== null && typeof arg === 'object')
    return Object.fromEntries(Object.entries(arg).map(([k, v]) => [k, normalise(v)]))
  return arg
}

const keyOf = (args: readonly unknown[]): string => JSON.stringify(args.map(normalise))

/**
 * Wrap a value-argument builder so equal arguments return the SAME instance
 * ("interning" / hash-consing).
 *
 * This is what lets a builder be written inline on a prop
 * (`allowEdit={byKey('name')}`, `icons={{ add: iconFromSvg(code) }}`) without
 * minting a fresh value every render. json-edit-react compares such props by
 * identity — the node `React.memo` boundary, and the theme and
 * `useMemo(…, [prop])` paths above it — so a new identity each render would
 * defeat fine-grained re-rendering tree-wide. A genuinely different argument
 * still produces a different instance, so real changes propagate.
 *
 * Each wrapped builder owns its own `Map`, keyed by an injective JSON
 * serialisation of the arguments (see `keyOf`). The cache lives as long as the
 * builder and grows with the number of DISTINCT argument sets, which literal
 * args keep bounded; `MAX_CACHE_ENTRIES` backstops the rest.
 *
 * Builders whose arguments are FUNCTIONS can't be string-keyed, since distinct
 * closures with identical source must stay distinct. Intern those on reference
 * identity via a `WeakMap` instead.
 */
export const intern = <A extends unknown[], R>(build: (...args: A) => R): ((...args: A) => R) => {
  const cache = new Map<string, R>()
  return (...args: A): R => {
    const key = keyOf(args)
    if (cache.has(key)) return cache.get(key) as R
    const result = build(...args)
    if (cache.size >= MAX_CACHE_ENTRIES) cache.clear()
    cache.set(key, result)
    return result
  }
}
