import { matchNode, matchNodeKey } from '../src/utils/filter'
import type { NodeData } from '../src/types'

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

