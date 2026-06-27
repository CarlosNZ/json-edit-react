import { computeFilterState, matchNode, matchNodeKey } from '../src/utils/filter'
import { toPathString } from '../src/utils/pathTools'
import type { JsonData, NodeData, SearchFilterFunction } from '../src/types'

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
  // matchNodeKey is typed as SearchFilterFunction so it expects a full
  // NodeData. The function only reads `key` and `path` — cast through unknown
  // for brevity.
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

describe('computeFilterState', () => {
  const root = (data: JsonData): NodeData => ({
    key: '',
    path: [],
    level: 0,
    index: 0,
    value: data,
    size: typeof data === 'object' && data !== null ? Object.keys(data as object).length : null,
    parentData: null,
    fullData: data,
  })

  test('returns null when no filter is active', () => {
    expect(computeFilterState(root({ a: 1 }), undefined, '')).toBeNull()
    expect(computeFilterState(root({ a: 1 }), undefined, undefined)).toBeNull()
  })

  test('value match: ancestors of a matching leaf stay visible', () => {
    const data = { user: { profile: { name: 'Alice', age: 30 } } }
    const fs = computeFilterState(root(data), undefined, 'Alic')!
    expect(fs).not.toBeNull()
    expect(fs.visiblePaths.has(toPathString(['user', 'profile', 'name']))).toBe(true)
    expect(fs.visiblePaths.has(toPathString(['user', 'profile']))).toBe(true)
    expect(fs.visiblePaths.has(toPathString(['user']))).toBe(true)
    expect(fs.visiblePaths.has(toPathString([]))).toBe(true)
    // The sibling 'age' doesn't match → not visible.
    expect(fs.visiblePaths.has(toPathString(['user', 'profile', 'age']))).toBe(false)
  })

  test('counts only direct visible children (not all descendants)', () => {
    const data = {
      fruits: { apple: 'red', banana: 'yellow', cherry: 'red' },
      tools: { hammer: 'metal', drill: 'electric' },
    }
    // 'red' matches apple + cherry under fruits; nothing under tools matches.
    const fs = computeFilterState(root(data), undefined, 'red')!
    expect(fs.visibleChildCounts.get(toPathString(['fruits']))).toBe(2)
    expect(fs.visibleChildCounts.get(toPathString(['tools']))).toBe(0)
    // Root has one visible direct child (fruits); tools is hidden.
    expect(fs.visibleChildCounts.get(toPathString([]))).toBe(1)
  })

  test('matchNodeKey: a matching key on an empty collection keeps ancestors visible', () => {
    // This is the bug repro from filter-bug.test.tsx, now expressed against
    // computeFilterState. The old filterCollection short-circuited to false
    // on an empty body and silently hid the matching ancestor.
    const data = { rootContainer: { interestingThing: {} } }
    const fs = computeFilterState(root(data), matchNodeKey, 'interestingThing')!
    expect(fs.visiblePaths.has(toPathString(['rootContainer', 'interestingThing']))).toBe(true)
    expect(fs.visiblePaths.has(toPathString(['rootContainer']))).toBe(true)
  })

  test('custom searchFilter that ignores path: intermediate match keeps ancestors visible', () => {
    // The previous filterCollection only ever tested LEAVES via the matcher
    // — intermediate collections were recursed into, never matched on
    // directly. A key-only custom filter never had a chance.
    const data = {
      rootContainer: { interestingThing: { unrelatedChild: 'plain-value' } },
    }
    const keyOnly: SearchFilterFunction = (nd, st) => String(nd.key) === st
    const fs = computeFilterState(root(data), keyOnly, 'interestingThing')!
    expect(fs.visiblePaths.has(toPathString(['rootContainer', 'interestingThing']))).toBe(true)
    expect(fs.visiblePaths.has(toPathString(['rootContainer']))).toBe(true)
  })

  test('arrays: keys are numeric in path and child node data', () => {
    const data = { items: ['apple', 'banana', 'cherry'] }
    const fs = computeFilterState(root(data), undefined, 'banana')!
    // Path uses the numeric index for arrays.
    expect(fs.visiblePaths.has(toPathString(['items', 1]))).toBe(true)
    expect(fs.visibleChildCounts.get(toPathString(['items']))).toBe(1)
  })

  test('no-match search: every collection records 0 visible children, no path is visible', () => {
    const data = { a: { b: 'hello' }, c: 'world' }
    const fs = computeFilterState(root(data), undefined, 'zzz_no_match')!
    expect(fs.visiblePaths.size).toBe(0)
    expect(fs.visibleChildCounts.get(toPathString(['a']))).toBe(0)
    expect(fs.visibleChildCounts.get(toPathString([]))).toBe(0)
  })

  test('records visibleChildCounts for every collection node, even nested ones', () => {
    const data = { a: { b: { c: 'match-me' }, d: 'nope' } }
    const fs = computeFilterState(root(data), undefined, 'match-me')!
    expect(fs.visibleChildCounts.get(toPathString(['a', 'b']))).toBe(1)
    expect(fs.visibleChildCounts.get(toPathString(['a']))).toBe(1)
    expect(fs.visibleChildCounts.get(toPathString([]))).toBe(1)
  })

  test('visibleChildCounts has no entry for leaf paths', () => {
    // The `useVisibleChildCount` hook relies on this to distinguish "tracked
    // collection with 0 matches" (entry present, value 0) from "leaf or
    // untracked path" (no entry — hook returns null, not 0). Without this
    // distinction, every leaf during filter-active would get a spurious
    // `visibleSize: 0` on its NodeData.
    const data = { fruits: ['apple', 'banana'], note: 'plain' }
    const fs = computeFilterState(root(data), undefined, 'apple')!
    // The leaf `note` matched nothing — but it's a leaf, so no entry.
    expect(fs.visibleChildCounts.has(toPathString(['note']))).toBe(false)
    // The leaf `fruits[0]` (which DID match) — still no entry, it's a leaf.
    expect(fs.visibleChildCounts.has(toPathString(['fruits', 0]))).toBe(false)
    // The collection `fruits` (one match out of two) — entry present.
    expect(fs.visibleChildCounts.get(toPathString(['fruits']))).toBe(1)
  })
})
