// Structural deep-equality with early-exit on the first difference. The default
// comparator for `useStableValue`. Hand-rolled to keep the package free of
// runtime dependencies (core has none and neither does this package).
//
// It handles the JSON-shaped values these helpers compare: primitives (via
// `Object.is`, so `NaN` equals `NaN` and `+0`/`-0` differ), arrays (length then
// element-wise), and plain objects (same own-key set, then value-wise). It is
// deliberately not structural-clone-grade — Map/Set/Date/RegExp/typed arrays
// aren't special-cased because they don't appear in the values it compares.
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false

  const aIsArray = Array.isArray(a)
  if (aIsArray !== Array.isArray(b)) return false

  if (aIsArray) {
    const arrA = a as unknown[]
    const arrB = b as unknown[]
    if (arrA.length !== arrB.length) return false
    for (let i = 0; i < arrA.length; i++) if (!deepEqual(arrA[i], arrB[i])) return false
    return true
  }

  const objA = a as Record<string, unknown>
  const objB = b as Record<string, unknown>
  const keysA = Object.keys(objA)
  if (keysA.length !== Object.keys(objB).length) return false
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false
    if (!deepEqual(objA[key], objB[key])) return false
  }
  return true
}
