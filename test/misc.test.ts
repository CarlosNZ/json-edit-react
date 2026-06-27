import { isCollection, restoreUndefined, UNDEFINED } from '../src/utils/misc'

describe('isCollection', () => {
  test('plain objects', () => {
    expect(isCollection({})).toBe(true)
    expect(isCollection({ a: 1 })).toBe(true)
  })

  test('arrays', () => {
    expect(isCollection([])).toBe(true)
    expect(isCollection([1, 2, 3])).toBe(true)
  })

  test('null is not a collection (the trap)', () => {
    expect(isCollection(null)).toBe(false)
  })

  test('primitives', () => {
    expect(isCollection('foo')).toBe(false)
    expect(isCollection(0)).toBe(false)
    expect(isCollection(42)).toBe(false)
    expect(isCollection(true)).toBe(false)
    expect(isCollection(false)).toBe(false)
    expect(isCollection(undefined)).toBe(false)
  })

  test('functions', () => {
    expect(isCollection(() => {})).toBe(false)
    expect(isCollection(function named() {})).toBe(false)
  })

  // Pinning current behaviour — `typeof x === 'object'` is true for these.
  // If someone later tightens the check, this catches it.
  test('built-in object types are collections under the current definition', () => {
    expect(isCollection(new Date())).toBe(true)
    expect(isCollection(new Map())).toBe(true)
    expect(isCollection(new Set())).toBe(true)
  })
})

describe('restoreUndefined', () => {
  test('replaces the sentinel with actual undefined, keeping the key', () => {
    const result = restoreUndefined({ a: 1, b: UNDEFINED }) as Record<string, unknown>
    expect(result).toHaveProperty('b')
    expect(result.b).toBeUndefined()
    expect(result.a).toBe(1)
  })

  test('a bare sentinel becomes undefined', () => {
    expect(restoreUndefined(UNDEFINED)).toBeUndefined()
  })

  test('restores through nested objects and arrays', () => {
    const result = restoreUndefined({
      nested: { x: UNDEFINED, y: 2 },
      list: [1, UNDEFINED, 3],
    }) as { nested: Record<string, unknown>; list: unknown[] }
    expect(result.nested).toHaveProperty('x')
    expect(result.nested.x).toBeUndefined()
    expect(result.nested.y).toBe(2)
    expect(result.list).toHaveLength(3)
    expect(result.list[1]).toBeUndefined()
    expect(result.list).toEqual([1, undefined, 3])
  })

  test('leaves primitives and ordinary strings untouched', () => {
    expect(restoreUndefined(42)).toBe(42)
    expect(restoreUndefined(null)).toBeNull()
    // The visible "__undefined__" without the zero-width char must NOT match
    expect(restoreUndefined('__undefined__')).toBe('__undefined__')
  })

  // The change guard: an undefined-free tree must do zero writes, so a frozen
  // input passes straight through without throwing.
  test('does not mutate (or throw on) a frozen, sentinel-free object', () => {
    const frozen = Object.freeze({ a: 1, nested: Object.freeze({ b: 2 }) })
    expect(() => restoreUndefined(frozen)).not.toThrow()
    expect(restoreUndefined(frozen)).toBe(frozen)
  })
})
