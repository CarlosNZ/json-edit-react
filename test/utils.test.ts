import { splitPropertyString } from '../src/utils/pathTools'

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
