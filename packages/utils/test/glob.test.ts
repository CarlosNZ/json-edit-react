import type { PathPattern } from '../src/filters'
import { compilePathMatcher } from '../src/filters/_glob'

// Direct unit tests for the path-glob engine that backs `byPath` (and locates
// the record layer in `matchRecord`). `byPath`'s own tests exercise realistic
// patterns against the shared fixture tree; these probe the matcher in
// isolation, with synthetic paths, to cover the edge cases the tree can't reach
// — zero-segment `**`, multiple/adjacent globstars, `?`, nested braces, escaped
// metacharacters, the empty pattern, and root matching.

const matches = (pattern: PathPattern, path: Array<string | number>): boolean =>
  compilePathMatcher(pattern)(path)

describe('within-segment wildcards (`*`, `?`) stay inside one segment', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    ['user*', ['username'], true], // prefix
    ['*Id', ['userId'], true], // suffix
    ['a*c', ['abc'], true], // infix
    ['a*c', ['ac'], true], // `*` matches zero chars
    ['a*c', ['abXYZc'], true],
    ['a*c', ['abcd'], false], // anchored — no trailing slop
    ['*', ['anything'], true],
    ['*', [''], true], // a single empty-string segment
    ['*', [], false], // …but `*` still needs ONE segment
    ['*', ['a', 'b'], false], // and only one
    ['a?c', ['abc'], true],
    ['a?c', ['ac'], false], // `?` needs exactly one char
    ['a?c', ['abbc'], false],
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('`*` does not cross segment boundaries', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    ['users.*', ['users', 0], true],
    ['users.*', ['users', 'name'], true],
    ['users.*', ['users', 0, 'name'], false], // `*` is one segment, not `**`
    ['a.*.c', ['a', 'b', 'c'], true],
    ['a.*.c', ['a', 'c'], false], // the middle segment must exist
    ['a.*.c', ['a', 'b', 'x', 'c'], false],
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('`**` matches zero or more whole segments', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    ['a.**', ['a'], true], // zero (subtree includes its root)
    ['a.**', ['a', 'b'], true],
    ['a.**', ['a', 'b', 'c'], true],
    ['a.**', ['x'], false],
    ['**', [], true], // `**` alone matches even the root
    ['**', ['a', 'b', 'c'], true],
    ['**.c', ['c'], true], // leading `**` matches zero
    ['**.c', ['a', 'b', 'c'], true],
    ['**.c', ['a', 'b'], false],
    ['a.**.c', ['a', 'c'], true], // interior `**` matches zero
    ['a.**.c', ['a', 'b', 'c'], true],
    ['a.**.c', ['a', 'b', 'x', 'c'], true],
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('multiple and adjacent globstars (backtracking)', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    ['**.b.**.d', ['a', 'b', 'c', 'd'], true],
    ['**.b.**.d', ['b', 'd'], true],
    ['**.b.**.d', ['a', 'd'], false], // no `b`
    ['a.**.**.b', ['a', 'b'], true],
    ['a.**.**.b', ['a', 'x', 'y', 'b'], true],
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('exact vs subtree (a bare name is exact)', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    ['a', ['a'], true],
    ['a', ['a', 'b'], false],
    ['a', [], false],
    ['a.b', ['a', 'b'], true],
    ['a.b', ['a'], false],
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('{a,b} alternation', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    ['{x,y}', ['x'], true],
    ['{x,y}', ['y'], true],
    ['{x,y}', ['z'], false],
    ['v{1,2}', ['v1'], true], // alternation with a prefix
    ['v{1,2}', ['v3'], false],
    ['{only}', ['only'], true], // single option
    ['{a,{b,c}}', ['a'], true], // nested
    ['{a,{b,c}}', ['c'], true],
    ['{a,{b,c}}', ['d'], false],
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('index notation (bracket and dotted are equivalent)', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    ['users[0]', ['users', 0], true],
    ['users.0', ['users', 0], true],
    ['users[0].name', ['users', 0, 'name'], true],
    ['users.*', ['users', 0], true], // `*` matches a numeric index
    ['0', [0], true],
    ['[0]', [0], true], // leading bracket index
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('literal metacharacters via the segment-array form', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    [['a.b'], ['a.b'], true], // a dot in a key — one literal segment
    [['a.b'], ['a', 'b'], false],
    [['a+b'], ['a+b'], true], // `+` is literal, not "one-or-more"
    [['a+b'], ['ab'], false],
    [['(x)'], ['(x)'], true],
    [['users', '*', 'email'], ['users', 0, 'email'], true], // `*` still globs
    [['**', 'name'], ['a', 'b', 'name'], true], // `**` still globstars
    [['users', 0, 'name'], ['users', 0, 'name'], true], // numeric element
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('RegExp form — tested against the stringified path, not anchored', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    [/^users/, ['users', 0, 'name'], true],
    [/\.geo$/, ['a', 'geo'], true],
    [/\.geo$/, ['a', 'geo', 'lat'], false],
    [/\[0\]/, ['users', 0], true], // matches the bracket rendering
    [/name/, ['a', 'name', 'b'], true], // unanchored: matches mid-path
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('empty pattern is the root', () => {
  it.each<[PathPattern, Array<string | number>, boolean]>([
    ['', [], true],
    ['', ['a'], false],
  ])('%p over %p → %p', (pattern, path, expected) => {
    expect(matches(pattern, path)).toBe(expected)
  })
})

describe('robustness', () => {
  it('tolerates an unclosed brace instead of throwing', () => {
    expect(() => compilePathMatcher('a{b,c')).not.toThrow()
    expect(matches('a{b,c', ['ab'])).toBe(true)
    expect(matches('a{b,c', ['ac'])).toBe(true)
  })
})
