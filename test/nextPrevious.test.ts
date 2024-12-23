import { getNextOrPrevious } from '../demo/src/json-edit-react/src/helpers'

const getNext = getNextOrPrevious
const getPrevious = (data: object, path: (string | number)[]) =>
  getNextOrPrevious(data, path, 'prev')

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
  expect(getNext(data, ['dee', 'inner3', 'innerDeep2', 2])).toEqual(['dee', 'inner3', 'innerBool'])
  expect(getPrevious(data, ['dee', 'inner3', 'innerDeep2', 0])).toEqual([
    'dee',
    'inner3',
    'innerDeep',
  ])
})
