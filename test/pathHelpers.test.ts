import { isDescendantOf, pathsEqual, toPathString } from '../src/helpers'

describe('pathsEqual', () => {
  test('equal arrays', () => {
    expect(pathsEqual([], [])).toBe(true)
    expect(pathsEqual(['a'], ['a'])).toBe(true)
    expect(pathsEqual(['a', 'b', 0], ['a', 'b', 0])).toBe(true)
  })

  test('differing length', () => {
    expect(pathsEqual(['a'], ['a', 'b'])).toBe(false)
    expect(pathsEqual(['a', 'b'], ['a'])).toBe(false)
    expect(pathsEqual([], ['a'])).toBe(false)
  })

  test('differing content', () => {
    expect(pathsEqual(['a'], ['b'])).toBe(false)
    expect(pathsEqual(['a', 'b'], ['a', 'c'])).toBe(false)
    expect(pathsEqual(['a', 'b', 'c'], ['a', 'b', 'd'])).toBe(false)
  })

  test('mixed string/number keys — strict equality', () => {
    // Numeric array index 0 is not equal to the string "0"
    expect(pathsEqual(['a', 0], ['a', '0'])).toBe(false)
    expect(pathsEqual(['a', 0], ['a', 0])).toBe(true)
  })
})

describe('isDescendantOf', () => {
  test('reflexive: a path is a descendant of itself', () => {
    expect(isDescendantOf([], [])).toBe(true)
    expect(isDescendantOf(['a'], ['a'])).toBe(true)
    expect(isDescendantOf(['a', 'b', 0], ['a', 'b', 0])).toBe(true)
  })

  test('strict descendants', () => {
    expect(isDescendantOf(['a', 'b'], ['a'])).toBe(true)
    expect(isDescendantOf(['a', 'b', 'c'], ['a'])).toBe(true)
    expect(isDescendantOf(['a', 0, 'name'], ['a', 0])).toBe(true)
    // The empty path is the root: everything descends from it
    expect(isDescendantOf(['a'], [])).toBe(true)
    expect(isDescendantOf(['a', 'b'], [])).toBe(true)
  })

  test('ancestors are not descendants', () => {
    expect(isDescendantOf(['a'], ['a', 'b'])).toBe(false)
    expect(isDescendantOf([], ['a'])).toBe(false)
  })

  test('siblings and unrelated paths', () => {
    expect(isDescendantOf(['a'], ['b'])).toBe(false)
    expect(isDescendantOf(['a', 'b'], ['a', 'c'])).toBe(false)
    expect(isDescendantOf(['x', 'y'], ['a', 'b'])).toBe(false)
  })

  test('substring lookalikes do NOT match', () => {
    // A string-substring check on a path stringification would match these
    // pairs incorrectly (e.g. `"foobar".includes("foo")` is true). Array
    // identity rejects them.
    expect(isDescendantOf(['foobar'], ['foo'])).toBe(false)
    expect(isDescendantOf(['foobar', 'name'], ['foo'])).toBe(false)
    expect(isDescendantOf(['foo'], ['foobar'])).toBe(false)
  })
})

describe('toPathString', () => {
  test('basic encoding', () => {
    expect(toPathString([])).toBe('')
    expect(toPathString(['a'])).toBe('a')
    expect(toPathString(['data', 0, 'name'])).toBe('data/0/name')
  })

  test('dotted keys do not collide with deeper paths', () => {
    expect(toPathString(['foo.bar', 'baz'])).not.toBe(toPathString(['foo', 'bar', 'baz']))
    expect(toPathString(['foo.bar', 'baz'])).toBe('foo.bar/baz')
    expect(toPathString(['foo', 'bar', 'baz'])).toBe('foo/bar/baz')
  })

  test('literal slashes in keys are encoded so they cannot be confused with separators', () => {
    expect(toPathString(['a/b', 'c'])).toBe('a%2Fb/c')
    expect(toPathString(['a/b', 'c'])).not.toBe(toPathString(['a', 'b', 'c']))
  })

  test('literal percent signs are escaped (so %2F-in-key differs from encoded /)', () => {
    expect(toPathString(['%2F', 'x'])).toBe('%252F/x')
    expect(toPathString(['%2F', 'x'])).not.toBe(toPathString(['/', 'x']))
  })

  test('empty-string keys produce visible separators', () => {
    expect(toPathString([''])).toBe('')
    expect(toPathString(['a', '', 'b'])).toBe('a//b')
    // Empty key adjacent to populated keys is unambiguous
    expect(toPathString(['a', '', 'b'])).not.toBe(toPathString(['a', 'b']))
  })

  test('numeric and unicode keys round-trip cleanly', () => {
    expect(toPathString([0, 1, 2])).toBe('0/1/2')
    expect(toPathString(['héllo', 'wörld'])).toBe('h%C3%A9llo/w%C3%B6rld')
  })
})
