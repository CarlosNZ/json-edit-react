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
// recursion covers RegExps nested inside array/object args.
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
 * Why it matters: it lets a builder be written inline on a prop
 * (`allowEdit={byKey('name')}`, `icons={{ add: iconFromSvg(code) }}`) without
 * minting a fresh value every render. json-edit-react compares such props by
 * identity (the node `React.memo` boundary, and the theme / `useMemo(…, [prop])`
 * paths upstream), so a new identity each render would defeat fine-grained
 * re-rendering tree-wide. A stable identity keeps the memo intact; a genuinely
 * different argument still produces a different instance, so real changes still
 * propagate.
 *
 * Each wrapped builder owns its own `Map`, keyed by an injective JSON
 * serialisation of the arguments (see `keyOf`). The cache lives as long as the
 * builder (module scope) and grows with the number of DISTINCT argument-sets —
 * bounded for the usual literal args; `MAX_CACHE_ENTRIES` backstops the rest.
 *
 * Builders whose arguments are FUNCTIONS can't be string-keyed (distinct
 * closures with identical source must stay distinct); intern those on reference
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
