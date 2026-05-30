import { matchNode, matchNodeKey } from '../src/utils/filter'
import { getNextOrPrevious } from '../src/utils/keyboard'
import { isCollection } from '../src/utils/misc'
import {
  editingStatesEqual,
  isDescendantOf,
  pathsEqual,
  toPathString,
} from '../src/utils/pathTools'
import type { NodeData } from '../src/types'

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

describe('matchNode', () => {
  describe('strings', () => {
    test('case-insensitive substring match', () => {
      expect(matchNode({ value: 'Hello' }, 'ell')).toBe(true)
      expect(matchNode({ value: 'Hello' }, 'HELLO')).toBe(true)
      expect(matchNode({ value: 'Hello' }, 'hello')).toBe(true)
    })

    test('non-matching substring', () => {
      expect(matchNode({ value: 'Hello' }, 'xyz')).toBe(false)
    })

    test('empty search matches any string', () => {
      expect(matchNode({ value: 'Hello' }, '')).toBe(true)
      expect(matchNode({ value: '' }, '')).toBe(true)
    })
  })

  describe('numbers', () => {
    test('stringified substring match', () => {
      expect(matchNode({ value: 123 }, '12')).toBe(true)
      expect(matchNode({ value: 123 }, '23')).toBe(true)
      expect(matchNode({ value: 123 }, '123')).toBe(true)
    })

    test('non-matching digits', () => {
      expect(matchNode({ value: 123 }, '4')).toBe(false)
    })

    test('zero matches "0" and empty', () => {
      expect(matchNode({ value: 0 }, '0')).toBe(true)
      expect(matchNode({ value: 0 }, '')).toBe(true)
    })
  })

  describe('booleans', () => {
    test('true matches any prefix of "true" (case-insensitive) and "1"', () => {
      expect(matchNode({ value: true }, '')).toBe(true)
      expect(matchNode({ value: true }, 't')).toBe(true)
      expect(matchNode({ value: true }, 'TR')).toBe(true)
      expect(matchNode({ value: true }, 'true')).toBe(true)
      expect(matchNode({ value: true }, '1')).toBe(true)
    })

    test('true does not match "0" or "false"', () => {
      expect(matchNode({ value: true }, '0')).toBe(false)
      expect(matchNode({ value: true }, 'false')).toBe(false)
      expect(matchNode({ value: true }, 'f')).toBe(false)
    })

    test('false matches any prefix of "false" (case-insensitive) and "0"', () => {
      expect(matchNode({ value: false }, '')).toBe(true)
      expect(matchNode({ value: false }, 'f')).toBe(true)
      expect(matchNode({ value: false }, 'FAL')).toBe(true)
      expect(matchNode({ value: false }, 'false')).toBe(true)
      expect(matchNode({ value: false }, '0')).toBe(true)
    })

    test('false does not match "1" or "true"', () => {
      expect(matchNode({ value: false }, '1')).toBe(false)
      expect(matchNode({ value: false }, 'true')).toBe(false)
      expect(matchNode({ value: false }, 't')).toBe(false)
    })
  })

  describe('null', () => {
    test('matches any prefix of "null" (case-insensitive)', () => {
      expect(matchNode({ value: null }, '')).toBe(true)
      expect(matchNode({ value: null }, 'n')).toBe(true)
      expect(matchNode({ value: null }, 'NU')).toBe(true)
      expect(matchNode({ value: null }, 'null')).toBe(true)
    })

    test('does not match unrelated text', () => {
      expect(matchNode({ value: null }, 'x')).toBe(false)
      expect(matchNode({ value: null }, 'undefined')).toBe(false)
    })
  })

  describe('other types', () => {
    test('objects, arrays, undefined never match', () => {
      expect(matchNode({ value: { a: 1 } }, 'a')).toBe(false)
      expect(matchNode({ value: [1, 2] }, '1')).toBe(false)
      expect(matchNode({ value: undefined }, '')).toBe(false)
      expect(matchNode({ value: undefined }, 'u')).toBe(false)
    })
  })
})

describe('matchNodeKey', () => {
  // matchNodeKey is typed as SearchFilterFunction so it expects a full NodeData.
  // The function only reads `key` and `path` — cast through unknown for brevity.
  const node = (key: string | number, path: (string | number)[]) =>
    ({ key, path }) as unknown as NodeData

  test('matches when the key itself matches', () => {
    expect(matchNodeKey(node('name', ['user', 'name']), 'name')).toBe(true)
    expect(matchNodeKey(node('name', ['user', 'name']), 'NAM')).toBe(true)
  })

  test('matches when any ancestor key matches', () => {
    expect(matchNodeKey(node('first', ['user', 'first']), 'user')).toBe(true)
    expect(matchNodeKey(node('inner', ['a', 'b', 'c', 'inner']), 'b')).toBe(true)
  })

  test('matches numeric path segments', () => {
    expect(matchNodeKey(node('name', ['items', 0, 'name']), '0')).toBe(true)
    expect(matchNodeKey(node(0, ['items', 0]), '0')).toBe(true)
  })

  test('returns false when nothing matches', () => {
    expect(matchNodeKey(node('name', ['user', 'name']), 'xyz')).toBe(false)
    expect(matchNodeKey(node('first', ['user', 'first']), 'last')).toBe(false)
  })

  test('empty search matches anything', () => {
    expect(matchNodeKey(node('name', ['user', 'name']), '')).toBe(true)
    expect(matchNodeKey(node(0, [0]), '')).toBe(true)
  })

  test('case-insensitive (inherited from matchNode)', () => {
    expect(matchNodeKey(node('UserName', ['user', 'UserName']), 'username')).toBe(true)
    expect(matchNodeKey(node('x', ['ROOT', 'x']), 'root')).toBe(true)
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

describe('editingStatesEqual', () => {
  test('both null', () => {
    expect(editingStatesEqual(null, null)).toBe(true)
  })

  test('one null, one non-null', () => {
    expect(editingStatesEqual(null, { path: ['a'], mode: 'value' })).toBe(false)
    expect(editingStatesEqual({ path: ['a'], mode: 'value' }, null)).toBe(false)
  })

  test('same path + same mode', () => {
    expect(
      editingStatesEqual({ path: ['a', 'b'], mode: 'value' }, { path: ['a', 'b'], mode: 'value' })
    ).toBe(true)
    expect(editingStatesEqual({ path: [], mode: 'key' }, { path: [], mode: 'key' })).toBe(true)
  })

  test('same path + different mode', () => {
    expect(
      editingStatesEqual({ path: ['a'], mode: 'value' }, { path: ['a'], mode: 'key' })
    ).toBe(false)
  })

  test('different paths + same mode', () => {
    expect(
      editingStatesEqual({ path: ['a'], mode: 'value' }, { path: ['b'], mode: 'value' })
    ).toBe(false)
    expect(
      editingStatesEqual({ path: ['a', 'b'], mode: 'value' }, { path: ['a'], mode: 'value' })
    ).toBe(false)
  })
})

describe('getNextOrPrevious', () => {
  const getNext = (data: object, path: (string | number)[]) =>
    getNextOrPrevious(data, path, 'next', () => {})
  const getPrevious = (data: object, path: (string | number)[]) =>
    getNextOrPrevious(data, path, 'prev', () => {})

  const data = {
    a: 1,
    b: 'something',
    cee: 99,
    dee: {
      inner: 'value',
      inner2: 45,
      inner3: {
        innerDeep: 2.4,
        innerDeep2: [1, 2, 3],
        innerBool: false,
        innerArray: [
          { one: 1, two: 'two', three: true, four: null, five: true },
          { one: 'one', two: 2, three: 3, four: { one: 1 }, 45: 'Number' },
        ],
      },
    },
    obj2: { 1: true, 2: 'two' },
    arr: [1, 'two', { three: 4 }, false, undefined, null, 7, 8, 9, 10, 11, 12],
  }

  test('Root level', () => {
    const curr = ['a']
    expect(getNext(data, curr)).toEqual(['b'])
    expect(getPrevious(data, curr)).toEqual(null)
  })

  test('Inside object', () => {
    expect(getNext(data, ['dee', 'inner'])).toEqual(['dee', 'inner2'])
    expect(getPrevious(data, ['dee', 'inner2'])).toEqual(['dee', 'inner'])
  })

  test('Next traverses object, one level', () => {
    expect(getNext(data, ['dee', 'inner2'])).toEqual(['dee', 'inner3', 'innerDeep'])
    expect(getPrevious(data, ['dee', 'inner3', 'innerDeep'])).toEqual(['dee', 'inner2'])
  })

  test('Next traverses object, multi-level, incl. Array', () => {
    expect(getNext(data, ['dee', 'inner3', 'innerBool'])).toEqual([
      'dee',
      'inner3',
      'innerArray',
      0,
      'one',
    ])
    expect(getPrevious(data, ['dee', 'inner3', 'innerArray', 0, 'one'])).toEqual([
      'dee',
      'inner3',
      'innerBool',
    ])
  })

  test('Traverse from within array', () => {
    expect(getNext(data, ['dee', 'inner3', 'innerDeep2', 1])).toEqual([
      'dee',
      'inner3',
      'innerDeep2',
      2,
    ])
    expect(getPrevious(data, ['dee', 'inner3', 'innerDeep2', 1])).toEqual([
      'dee',
      'inner3',
      'innerDeep2',
      0,
    ])
    expect(getNext(data, ['dee', 'inner3', 'innerDeep2', 2])).toEqual([
      'dee',
      'inner3',
      'innerBool',
    ])
    expect(getPrevious(data, ['dee', 'inner3', 'innerDeep2', 0])).toEqual([
      'dee',
      'inner3',
      'innerDeep',
    ])
  })

  test('Traverse into empty object/array', () => {
    const d = {
      displayName: 'Default',
      styles: {
        container: {
          backgroundColor: '#f6f6f6',
          fontFamily: 'monospace',
        },
        collection: {},
        collectionInner: [],
        lastOne: 1,
        empty: {},
      },
    }
    expect(getNext(d, ['styles', 'container', 'fontFamily'])).toEqual(['styles', 'lastOne'])
    expect(getNext(d, ['styles', 'lastOne'])).toEqual(null)
  })
})
