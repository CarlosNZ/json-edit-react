import {
  isDescendantOf,
  pathsEqual,
  splitPropertyString,
  toPathString,
} from '../src/utils/pathTools'

describe('splitPropertyString', () => {
  test('Empty string returns empty array', () => {
    expect(splitPropertyString('')).toStrictEqual([])
  })

  test('Single property', () => {
    expect(splitPropertyString('foo')).toStrictEqual(['foo'])
  })

  test('Nested properties joined by dots', () => {
    expect(splitPropertyString('a.b.c')).toStrictEqual(['a', 'b', 'c'])
  })

  test('Bracketed index returned as number', () => {
    expect(splitPropertyString('items[0]')).toStrictEqual(['items', 0])
  })

  test('Mixed properties and indices', () => {
    expect(splitPropertyString('data.organisations.nodes[0].name')).toStrictEqual([
      'data',
      'organisations',
      'nodes',
      0,
      'name',
    ])
  })

  test('Adjacent indices', () => {
    expect(splitPropertyString('grid[3][7]')).toStrictEqual(['grid', 3, 7])
  })

  test('Leading index', () => {
    expect(splitPropertyString('[2].name')).toStrictEqual([2, 'name'])
  })

  test('Trailing dot is dropped', () => {
    expect(splitPropertyString('a.b.')).toStrictEqual(['a', 'b'])
  })

  test('Double dots are dropped', () => {
    expect(splitPropertyString('a..b')).toStrictEqual(['a', 'b'])
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

  describe('empty-string keys', () => {
    test('mid-path: surrounded by separators', () => {
      expect(toPathString(['a', '', 'b'])).toBe('a//b')
      expect(toPathString(['a', '', 'b'])).not.toBe(toPathString(['a', 'b']))
    })

    test('at the end: trailing separator distinguishes', () => {
      expect(toPathString(['a', ''])).toBe('a/')
      expect(toPathString(['a', ''])).not.toBe(toPathString(['a']))
    })

    test('at the start: leading separator distinguishes', () => {
      expect(toPathString(['', 'one'])).toBe('/one')
      expect(toPathString(['', 'one'])).not.toBe(toPathString(['one']))
    })

    test('multiple empties — separator count preserves length', () => {
      expect(toPathString(['', ''])).toBe('/')
      expect(toPathString(['', '', ''])).toBe('//')
      expect(toPathString(['', ''])).not.toBe(toPathString(['']))
      expect(toPathString(['', ''])).not.toBe(toPathString(['', '', '']))
    })

    test('single empty key uses a sentinel to distinguish from root path', () => {
      // The one case the join-based encoding cannot disambiguate from `[]`
      // without help. `encodeURIComponent` never emits a literal '\0' (it
      // produces '%00' for the null char), so '\0' is safe as a sentinel.
      expect(toPathString([''])).toBe('\0')
      expect(toPathString([''])).not.toBe(toPathString([]))
    })

    test('every distinct path produces a distinct string (injectivity)', () => {
      const paths: (string | number)[][] = [
        [],
        [''],
        ['a'],
        ['', 'one'],
        ['a', ''],
        ['', ''],
        ['', '', ''],
        ['a', '', 'b'],
        ['\0'],
      ]
      expect(new Set(paths.map(toPathString)).size).toBe(paths.length)
    })
  })

  test('numeric and unicode keys round-trip cleanly', () => {
    expect(toPathString([0, 1, 2])).toBe('0/1/2')
    expect(toPathString(['héllo', 'wörld'])).toBe('h%C3%A9llo/w%C3%B6rld')
  })
})

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
