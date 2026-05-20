/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { extract } from '../src/utils'

const testObj1 = {
  a: 1,
  b: {
    inner: 'this',
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
  cee: null,
  dee: { 1: true, 2: 'two' },
  ee: [1, 'two', { three: 4 }, false, undefined, null, 7, 8, 9, 10, 11, 12],
  fun: (n: number) => n * 2,
}

const arrayObj = [
  1,
  2,
  {
    one: [
      { x: 'Ex', y: 'Why' },
      { x: 'XXX', y: 'YYY' },
    ],
  },
]

const nestedArrays = {
  myArray: [
    'Just a string',
    [{ one: 1, two: 2 }, 99, null],
    ['A', 'B'],
    ['C', 'D', null],
    [999, 1000, 1001],
  ],
}

const nestedArraysRoot = [
  'Just a string',
  [{ one: 1, two: 2 }, 99, null],
  ['A', 'B'],
  ['C', 'D', null],
  [999, 1000, 1001, 0, 0, 0, 0, 0, 0, 0, 0, 666],
]

// Base level properties
test('Base props 1', () => {
  expect(extract(testObj1, 'a')).toBe(1)
})

test('Base props 2', () => {
  expect(extract(testObj1, 'cee')).toBe(null)
})

// Deep objects, various types
test('Deep props 1', () => {
  expect(extract(testObj1, 'b.inner')).toBe('this')
})

test('Deep props 2', () => {
  expect(extract(testObj1, 'b.inner3.innerDeep')).toBe(2.4)
})

// Get inner objects
test('Get inner object, shallow', () => {
  expect(extract(testObj1, 'a')).toStrictEqual(testObj1.a)
})

test('Get inner object, deeper', () => {
  expect(extract(testObj1, 'b.inner3')).toStrictEqual(testObj1.b.inner3)
})

// Get arrays, various depths
test('Array at top level', () => {
  expect(extract(testObj1, 'ee')).toStrictEqual([
    1,
    'two',
    { three: 4 },
    false,
    undefined,
    null,
    7,
    8,
    9,
    10,
    11,
    12,
  ])
})

test('Array inner', () => {
  expect(extract(testObj1, 'b.inner3.innerArray')).toStrictEqual([
    { one: 1, two: 'two', three: true, four: null, five: true },
    { one: 'one', two: 2, three: 3, four: { one: 1 }, 45: 'Number' },
  ])
})

test('Array with high index', () => {
  expect(extract(testObj1, 'ee[11]')).toStrictEqual(12)
})

test('Sequential array indexes', () => {
  expect(extract(nestedArrays, 'myArray[1][0]')).toStrictEqual({ one: 1, two: 2 })
})

test('Sequential array indexes at root', () => {
  expect(extract(nestedArraysRoot, '[4][11]')).toStrictEqual(666)
})

test('Numeric property, not array', () => {
  expect(extract(testObj1, 'b.inner3.innerArray[1].45')).toStrictEqual('Number')
})

test('Pull properties from objects inside array', () => {
  expect(extract(testObj1, 'b.inner3.innerArray.two')).toStrictEqual(['two', 2])
})

test('Access array by index', () => {
  expect(extract(testObj1, 'ee[1]')).toBe('two')
})

test('Access array by index - deeper', () => {
  expect(extract(testObj1, 'b.inner3.innerDeep2[2]')).toBe(3)
})

test('Access property inside object in indexed array', () => {
  expect(extract(testObj1, 'b.inner3.innerArray[1].four')).toStrictEqual({ one: 1 })
})

test('Array at root (object is array)', () => {
  expect(extract(arrayObj, '[0]')).toStrictEqual(1)
})

test('Array at root (object is array), with nested elements', () => {
  expect(extract(arrayObj, '[2].one.y')).toStrictEqual(['Why', 'YYY'])
})

test('Ignore irrelevant trailing characters in property string', () => {
  expect(extract(testObj1, 'ee[0].')).toBe(1)
})

test('Ignore irrelevant trailing characters in property string, array root', () => {
  expect(extract(arrayObj, '[0].')).toBe(1)
})

// Empty property strings
test('Empty property string', () => {
  expect(extract(testObj1, '')).toStrictEqual(testObj1)
})

test('Empty property string after .', () => {
  expect(extract(testObj1, 'b.inner3.')).toStrictEqual(testObj1.b.inner3)
})

// Run a function in an object
test('Access and run a function from an object', () => {
  expect((extract(testObj1, 'fun') as Function)(4)).toBe(8)
})

// Property missing - shallow and deep, various
test('Missing property - top level', () => {
  expect(() => extract(testObj1, 'bee')).toThrow(
    /Unable to extract object property\nLooking for property: bee/gm
  )
})

test('Missing property - deeper', () => {
  expect(() => extract(testObj1, 'cee.jay')).toThrow(`Unable to extract object property
Looking for property: jay
In object: null`)
})

// Should probably have its own error
test('Array index out of bounds', () => {
  expect(() => extract(testObj1, 'ee[12]')).toThrow(
    /Unable to extract object property\nLooking for property: 12\nIn object: \[+/gm
  )
})

// TRY AND PASS A STRING INSTEAD OF ARRAY INDEX

test('Missing property - deep inside array', () => {
  expect(() => extract(testObj1, 'b.inner3.innerArray[1].nope')).toThrow(
    /Unable to extract object property\nLooking for property: nope\nIn object: {+/gm
  )
})

// Property missing with fallback, various
test('Missing property - top level, with fallback', () => {
  expect(extract(testObj1, 'baby', 'Fallback')).toBe('Fallback')
})

// Should probably have its own error
test('Array index out of bounds, with fallback', () => {
  expect(extract(testObj1, 'ee[19]', 666)).toBe(666)
})

test('Missing property - deep inside array, with fallback', () => {
  expect(extract(testObj1, 'b.inner3.innerArray[1].nope', false)).toBe(false)
})

// Missing property in only one object in an array of objects
test('Missing property on some objects in array', () => {
  expect(() => extract(testObj1, 'b.inner3.innerArray.five')).toThrow(
    /Unable to extract object property\nLooking for property: five\nIn object: {/
  )
})

test('Missing property on some objects in array, with Fallback', () => {
  expect(extract(testObj1, 'b.inner3.innerArray.five', null)).toStrictEqual([true, null])
})

// Handle empty object
test('Empty input object, no fallback', () => {
  expect(() => extract({}, 'something.inside')).toThrow(
    /Unable to extract object property\nLooking for property: something\nIn object: {}/
  )
})

test('Empty input object, with fallback', () => {
  expect(extract({}, 'topLevel', 'alternative')).toBe('alternative')
})

// Handle undefined
test('Property has value of undefined, with fallback', () => {
  expect(extract(testObj1, 'ee[4]', 'Fallback')).toStrictEqual(undefined)
})

test('Property has value of undefined, no fallback', () => {
  expect(extract(testObj1, 'ee[4]')).toStrictEqual(undefined)
})

test('Fallback is undefined', () => {
  expect(() => extract(testObj1, 'cee.jay.smith', undefined)).toThrow(
    'Unable to extract object property\nLooking for property: jay\nIn object: null'
  )
})

// Handle null
test('Property has value of null', () => {
  expect(extract(testObj1, 'ee[5]', 'Fallback')).toBeNull()
})

// Misc
test('Property name is a number', () => {
  expect(extract(testObj1, 'dee.1', 'Fallback')).toBe(true)
})

test('Invalid input object', () => {
  expect(() => extract('A string', 'dee.1')).toThrow(
    'Unable to extract object property\nLooking for property: dee\nIn object: "A string"'
  )
})

test('Non-integer array index', () => {
  expect(() => extract(testObj1, 'b.inner3.innerDeep2[1.5]')).toThrow(
    /Unable to extract object property\nLooking for property: innerDeep2\[1\nIn object: {"innerDeep"/
  )
})

// Should error when accessing properties of empty array.
test('Access property of empty array', () => {
  expect(() => extract([], 'property')).toThrow(
    /Unable to extract object property\nLooking for property: property\nIn object: \[\]/
  )
  expect(() => extract({ one: [] }, 'one.inside')).toThrow(
    /Unable to extract object property\nLooking for property: inside\nIn object: \[\]/
  )
})
