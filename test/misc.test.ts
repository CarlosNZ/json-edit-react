import { isCollection } from '../src/utils/misc'

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

