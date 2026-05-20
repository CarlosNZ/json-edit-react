/* eslint-disable @typescript-eslint/no-explicit-any */
import { assign } from '../src/utils/assign'
const cloneDeep = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((v) => cloneDeep(v)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as object))
      out[k] = cloneDeep((value as Record<string, unknown>)[k])
    return out as unknown as T
  }
  return value
}

const testObj1: any = {
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
        { one: 'one', two: 2, three: 3, four: { one: 1 } },
      ],
    },
  },
  cee: null,
  dee: { 1: true, 2: 'two' },
  ee: [1, 'two', { three: 4 }, false, undefined, null],
  fun: (n: number) => n * 2,
}
const testObj1_original = cloneDeep(testObj1)

const testObj2 = { ...testObj1 }
delete testObj2.fun

const testObj2_original = cloneDeep(testObj2)

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

const arrayObj_original = cloneDeep(arrayObj)

const arrayNestedEarly = {
  list: [
    { one: 1, value: { text: 'Number 1' }, three: [1, 2, 3] },
    { one: 2, value: { text: 'Number 2' }, three: [4, 5, 6] },
    { one: 3, value: { text: 'Number 3' }, three: [7, 8, 9] },
  ],
}

const arrayNestedEarly_original = cloneDeep(arrayNestedEarly)

const arrayDoubleNested = {
  list: [
    {
      one: 1,
      value: { text: 'Number 1' },
      three: [
        { name: 'Carl', height: 1.83 },
        { name: 'Bodhi', height: 1.2 },
        { name: 'ANM', height: 1.6 },
      ],
    },
    {
      one: 2,
      value: { text: 'Number 2' },
      three: [
        { name: 'Tom', height: 1.61 },
        { name: 'Jerry', height: 1.61 },
      ],
    },
    { one: 3, value: { text: 'Number 3' }, three: [{ name: 'Hugo', height: 1.5 }] },
  ],
}

const arrayDoubleNested_original = cloneDeep(arrayDoubleNested)

// Base level properties
test('Base props 1', () => {
  expect(assign(testObj1, 'a', 'ten')).toStrictEqual({
    ...testObj1_original,
    a: 'ten',
  })
  // Check stringified to ensure key order has been preserved
  expect(assign(testObj1, 'a', 'ten')).toEqual({
    ...testObj1_original,
    a: 'ten',
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Base props 2', () => {
  expect(assign(testObj1, 'cee', 'something')).toStrictEqual({
    ...testObj1_original,
    cee: 'something',
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

// Deep objects, various types
test('Deep props 1', () => {
  expect(assign(testObj1, 'b.inner', 'that')).toStrictEqual({
    ...testObj1_original,
    b: { ...testObj1_original.b, inner: 'that' },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Deep props 2', () => {
  expect(assign(testObj1, 'b.inner3.innerDeep', null)).toStrictEqual({
    ...testObj1_original,
    b: { ...testObj1_original.b, inner3: { ...testObj1_original.b.inner3, innerDeep: null } },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Get inner object, deeper', () => {
  expect(assign(testObj1, 'b.inner3', { new: 'Hi', val: 'There' })).toStrictEqual({
    ...testObj1_original,
    b: { ...testObj1_original.b, inner3: { new: 'Hi', val: 'There' } },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

// Get arrays, various depths
test('Array at top level', () => {
  expect(assign(testObj1, 'ee', ['new', 'array'])).toStrictEqual({
    ...testObj1_original,
    ee: ['new', 'array'],
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Array inner', () => {
  expect(JSON.stringify(assign(testObj1, 'b.inner3.innerArray', 'plain string'))).toStrictEqual(
    JSON.stringify({
      ...testObj1_original,
      b: {
        ...testObj1_original.b,
        inner3: { ...testObj1_original.b.inner3, innerArray: 'plain string' },
      },
    })
  )
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Assign array by index', () => {
  expect(assign(testObj1, 'ee[1]', 'No longer two')).toStrictEqual({
    ...testObj1_original,
    ee: [1, 'No longer two', { three: 4 }, false, undefined, null],
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Assign array by index - deeper', () => {
  expect(assign(testObj1, 'b.inner3.innerDeep2[2]', undefined)).toStrictEqual({
    ...testObj1_original,
    b: {
      ...testObj1_original.b,
      inner3: { ...testObj1_original.b.inner3, innerDeep2: [1, 2, undefined] },
    },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Assign property inside object in indexed array', () => {
  expect(assign(testObj1, 'b.inner3.innerArray[1].four', '{ one: 1 }')).toStrictEqual({
    ...testObj1_original,
    b: {
      ...testObj1_original.b,
      inner3: {
        ...testObj1_original.b.inner3,
        innerArray: [
          { one: 1, two: 'two', three: true, four: null, five: true },
          { one: 'one', two: 2, three: 3, four: '{ one: 1 }' },
        ],
      },
    },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Array at top level (object is array)', () => {
  expect(assign(arrayObj, '[0]', 99)).toStrictEqual([
    99,
    2,
    {
      one: [
        { x: 'Ex', y: 'Why' },
        { x: 'XXX', y: 'YYY' },
      ],
    },
  ])
  // Ensure original hasn't been modified
  expect(arrayObj).toStrictEqual(arrayObj_original)
})

test('Array at top level (object is array), with nested elements', () => {
  expect(assign(arrayObj, '[2].one.y', { more: 'yes' })).toStrictEqual([
    1,
    2,
    {
      one: [
        { x: 'Ex', y: { more: 'yes' } },
        { x: 'XXX', y: { more: 'yes' } },
      ],
    },
  ])
  // Ensure original hasn't been modified
  expect(arrayObj).toStrictEqual(arrayObj_original)
})

test('Target multiple array elements with array early in path', () => {
  expect(assign(arrayNestedEarly, 'list.one', 99)).toStrictEqual({
    list: [
      { one: 99, value: { text: 'Number 1' }, three: [1, 2, 3] },
      { one: 99, value: { text: 'Number 2' }, three: [4, 5, 6] },
      { one: 99, value: { text: 'Number 3' }, three: [7, 8, 9] },
    ],
  })
  // Ensure original hasn't been modified
  expect(arrayNestedEarly).toStrictEqual(arrayNestedEarly_original)
})

test('Target multiple array elements with array early in path, deeper', () => {
  expect(assign(arrayNestedEarly, 'list.value.text', 'NEW WORLD')).toStrictEqual({
    list: [
      { one: 1, value: { text: 'NEW WORLD' }, three: [1, 2, 3] },
      { one: 2, value: { text: 'NEW WORLD' }, three: [4, 5, 6] },
      { one: 3, value: { text: 'NEW WORLD' }, three: [7, 8, 9] },
    ],
  })
  // Ensure original hasn't been modified
  expect(arrayNestedEarly).toStrictEqual(arrayNestedEarly_original)
})

test('Target multiple array elements with array early in path, another array deeper', () => {
  expect(assign(arrayNestedEarly, 'list.three[1]', 99)).toStrictEqual({
    list: [
      { one: 1, value: { text: 'Number 1' }, three: [1, 99, 3] },
      { one: 2, value: { text: 'Number 2' }, three: [4, 99, 6] },
      { one: 3, value: { text: 'Number 3' }, three: [7, 99, 9] },
    ],
  })
  // Ensure original hasn't been modified
  expect(arrayNestedEarly).toStrictEqual(arrayNestedEarly_original)
})

test('Doubly nested array, without indexes (i.e. update every element in arrays', () => {
  expect(assign(arrayDoubleNested, 'list.three.name', null)).toStrictEqual({
    list: [
      {
        one: 1,
        value: { text: 'Number 1' },
        three: [
          { name: null, height: 1.83 },
          { name: null, height: 1.2 },
          { name: null, height: 1.6 },
        ],
      },
      {
        one: 2,
        value: { text: 'Number 2' },
        three: [
          { name: null, height: 1.61 },
          { name: null, height: 1.61 },
        ],
      },
      { one: 3, value: { text: 'Number 3' }, three: [{ name: null, height: 1.5 }] },
    ],
  })
  // Ensure original hasn't been modified
  expect(arrayDoubleNested).toStrictEqual(arrayDoubleNested_original)
})

test('Ignore irrelevant trailing characters in property string', () => {
  expect(assign(testObj1, 'ee[0].', 'NEW')).toStrictEqual({
    ...testObj1_original,
    ee: ['NEW', 'two', { three: 4 }, false, undefined, null],
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Ignore irrelevant trailing characters in property string, array top-level', () => {
  expect(assign(arrayObj, '[0].', 'Bob')).toStrictEqual([
    'Bob',
    2,
    {
      one: [
        { x: 'Ex', y: 'Why' },
        { x: 'XXX', y: 'YYY' },
      ],
    },
  ])
  // Ensure original hasn't been modified
  expect(arrayObj).toStrictEqual(arrayObj_original)
})

test('Throw error with missing final property', () => {
  expect(() => assign(testObj1, 'b.inner3.missing', 'NEW', { createNew: false })).toThrow(
    `Invalid property path: b.inner3.missing\nCouldn't access "missing" in ${JSON.stringify(
      testObj1_original
    )}`
  )
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Throw error with missing early property', () => {
  expect(() => assign(testObj1, 'b.nope', 'NEW', { createNew: false })).toThrow(
    `Invalid property path: b.nope\nCouldn't access "nope" in ${JSON.stringify(testObj1_original)}`
  )
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Create new property with missing final property', () => {
  expect(assign(testObj1, 'b.inner3.missing', 'Bob', { createNew: true })).toStrictEqual({
    ...testObj1_original,
    b: { ...testObj1_original.b, inner3: { ...testObj1_original.b.inner3, missing: 'Bob' } },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

// Create or replace properties
test('Create new property with missing early property', () => {
  expect(assign(testObj1, 'x', 'More XXX', { createNew: true })).toStrictEqual({
    ...testObj1_original,
    x: 'More XXX',
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Create new property with missing early property with additional path parts', () => {
  expect(assign(testObj1, 'x.one.two', 'This is deep')).toStrictEqual({
    ...testObj1_original,
    x: { one: { two: 'This is deep' } },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Create new property in array objects (one exists)', () => {
  expect(assign(testObj1, 'b.inner3.innerArray.five', 666)).toStrictEqual({
    ...testObj1_original,
    b: {
      ...testObj1_original.b,
      inner3: {
        ...testObj1_original.b.inner3,
        innerArray: [
          { one: 1, two: 'two', three: true, four: null, five: 666 },
          { one: 'one', two: 2, three: 3, four: { one: 1 }, five: 666 },
        ],
      },
    },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Replace simple property with a deeper object', () => {
  expect(assign(testObj1, 'a.one.two', 'This is deep')).toStrictEqual({
    ...testObj1_original,
    a: { one: { two: 'This is deep' } },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

// DON'T create new properties (but don't throw error)
test("Don't create new early property", () => {
  expect(assign(testObj1, 'x', 'More XXX', { createNew: false, noError: true })).toStrictEqual(
    testObj1_original
  )
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test("Don't create new missing early property with additional path parts", () => {
  expect(
    assign(testObj1, 'x.one.two', 'This is deep', { createNew: false, noError: true })
  ).toStrictEqual(testObj1_original)
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test("Don't replace simple property with a deeper object", () => {
  expect(
    assign(testObj1, 'a.one.two', 'This is deep', { createNew: false, noError: true })
  ).toStrictEqual(testObj1_original)
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

// Remove properties using "remove" parameter
test('Remove early property', () => {
  const t = cloneDeep(testObj2)
  delete t.a
  expect(assign(testObj2, 'a', null, { remove: true })).toStrictEqual(t)
  // Ensure original hasn't been modified
  expect(testObj2).toStrictEqual(testObj2_original)
})

test('Remove deeper property', () => {
  const t = cloneDeep(testObj2)
  delete t.b.inner3.innerDeep2
  expect(assign(testObj2, 'b.inner3.innerDeep2', null, { remove: true })).toStrictEqual(t)
  // Ensure original hasn't been modified
  expect(testObj2).toStrictEqual(testObj2_original)
})

test('Remove an array item by index', () => {
  const t = cloneDeep(testObj2)
  t.b.inner3.innerDeep2 = [1, 3]
  expect(assign(testObj2, 'b.inner3.innerDeep2[1]', null, { remove: true })).toStrictEqual(t)
  // Ensure original hasn't been modified
  expect(testObj2).toStrictEqual(testObj2_original)
})

test('Remove a top-level array item by index', () => {
  const t = cloneDeep(testObj2)
  t.ee = [1, 'two', { three: 4 }, false, undefined]
  expect(assign(testObj2, 'ee[5]', null, { remove: true })).toStrictEqual(t)
  // Ensure original hasn't been modified
  expect(testObj2).toStrictEqual(testObj2_original)
})

test('Remove an array item when root object is an array', () => {
  const t = cloneDeep(testObj2)
  t.b.inner3.innerDeep2 = [1, 3]
  expect(
    assign(cloneDeep(testObj2), 'b.inner3.innerDeep2[1]', null, { remove: true })
  ).toStrictEqual(t)
})

test('Remove top-level array item when root object is an array', () => {
  const t = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const t_orig = cloneDeep(t)
  expect(assign(t, '[1]', null, { remove: true })).toStrictEqual([1, 3, 4, 5, 6, 7, 8, 9])
  // Ensure original hasn't been modified
  expect(t).toStrictEqual(t_orig)
})

// Empty property strings
test('Empty property string (does nothing)', () => {
  expect(assign(testObj1, '', 'ALT?')).toStrictEqual(testObj1)
})

test('Empty property string after .', () => {
  expect(assign(testObj1, 'b.inner3.', 'REPLACED')).toStrictEqual({
    ...testObj1_original,
    b: { ...testObj1_original.b, inner3: 'REPLACED' },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

// Functions
test('Add a function', () => {
  const obj = assign(testObj1, 'b.newFun', (a: string) => a + 'output')
  expect((obj as any)?.b?.newFun('NEW ')).toBe('NEW output')
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Replace a function', () => {
  const obj = assign(testObj1, 'fun', (a: string) => a + 'output')
  expect((obj as any).fun('NEW ')).toBe('NEW output')
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

// Add to arrays
test('Add simple element to deep array', () => {
  expect(assign(testObj1, 'b.inner3.innerArray[2]', 'ADD THIS', { createNew: true })).toStrictEqual(
    {
      ...testObj1_original,
      b: {
        ...testObj1_original.b,
        inner3: {
          ...testObj1_original.b.inner3,
          innerArray: [
            { one: 1, two: 'two', three: true, four: null, five: true },
            { one: 'one', two: 2, three: 3, four: { one: 1 } },
            'ADD THIS',
          ],
        },
      },
    }
  )
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Add simple element to deep array with excessively high index', () => {
  expect(
    assign(testObj1, 'b.inner3.innerArray[999]', 'ADD THIS', { createNew: true })
  ).toStrictEqual({
    ...testObj1_original,
    b: {
      ...testObj1_original.b,
      inner3: {
        ...testObj1_original.b.inner3,
        innerArray: [
          { one: 1, two: 'two', three: true, four: null, five: true },
          { one: 'one', two: 2, three: 3, four: { one: 1 } },
          'ADD THIS',
        ],
      },
    },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Add element to array with extra properties', () => {
  expect(
    JSON.stringify(
      assign(testObj1, 'b.inner3.innerArray[2].newProperty', 'ADD THIS', { createNew: true })
    )
  ).toStrictEqual(
    JSON.stringify({
      ...testObj1_original,
      b: {
        ...testObj1_original.b,
        inner3: {
          ...testObj1_original.b.inner3,
          innerArray: [
            { one: 1, two: 'two', three: true, four: null, five: true },
            { one: 'one', two: 2, three: 3, four: { one: 1 } },
            { newProperty: 'ADD THIS' },
          ],
        },
      },
    })
  )
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Add element to array with extra array properties', () => {
  expect(JSON.stringify(assign(testObj1, 'b.inner3.innerArray[2][2]', 'ADD THIS'))).toStrictEqual(
    JSON.stringify({
      ...testObj1_original,
      b: {
        ...testObj1_original.b,
        inner3: {
          ...testObj1_original.b.inner3,
          innerArray: [
            { one: 1, two: 'two', three: true, four: null, five: true },
            { one: 'one', two: 2, three: 3, four: { one: 1 } },
            ['ADD THIS'],
          ],
        },
      },
    })
  )
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Add array element to object with additional path', () => {
  expect(assign(arrayObj, '[2].one[6].extra[2].inside', 'ADD THIS')).toStrictEqual([
    1,
    2,
    {
      one: [{ x: 'Ex', y: 'Why' }, { x: 'XXX', y: 'YYY' }, { extra: [{ inside: 'ADD THIS' }] }],
    },
  ])
  // Ensure original hasn't been modified
  expect(arrayObj).toStrictEqual(arrayObj_original)
})

test('Assign with path already split into array', () => {
  expect(assign(testObj1, ['ee', 2, 'newProp'], 'NEW VALUE')).toStrictEqual({
    ...testObj1_original,
    ee: [1, 'two', { three: 4, newProp: 'NEW VALUE' }, false, undefined, null],
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

// Positional insertions
test('Insert as middle position in array', () => {
  expect(assign(testObj1, 'b.inner3.innerArray[1]', 'NEW VALUE', { insert: true })).toStrictEqual({
    ...testObj1_original,
    b: {
      inner: 'this',
      inner2: 45,
      inner3: {
        innerDeep: 2.4,
        innerDeep2: [1, 2, 3],
        innerBool: false,
        innerArray: [
          { one: 1, two: 'two', three: true, four: null, five: true },
          'NEW VALUE',
          { one: 'one', two: 2, three: 3, four: { one: 1 } },
        ],
      },
    },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Insert at start of array', () => {
  expect(assign([1, 2, 3, 4, 5], '[0]', 'Jump the queue', { insert: true })).toStrictEqual([
    'Jump the queue',
    1,
    2,
    3,
    4,
    5,
  ])
  expect(assign([1, 2, 3, 4, 5], [0], 'Jump the queue', { insert: true })).toStrictEqual([
    'Jump the queue',
    1,
    2,
    3,
    4,
    5,
  ])
})

test('Insert before key in object', () => {
  const newObj: any = assign(testObj1, 'b.inner3.innerArray[0].extra', 'WOW', {
    insertBefore: 'two',
  })
  expect(JSON.stringify(newObj.b.inner3.innerArray[0])).toEqual(
    '{"one":1,"extra":"WOW","two":"two","three":true,"four":null,"five":true}'
  )
})

test('Insert after key in object', () => {
  const newObj: any = assign(testObj1, 'b.inner3.innerArray[0].extra', 'Hi there', {
    insertAfter: 'four',
  })
  expect(JSON.stringify(newObj.b.inner3.innerArray[0])).toEqual(
    '{"one":1,"two":"two","three":true,"four":null,"extra":"Hi there","five":true}'
  )
})

test('Insert at start key in object', () => {
  const newObj = assign(testObj1, 'b.inner3.innerArray[1].new', 'Hi there', {
    insertBefore: 'one',
  })
  expect(JSON.stringify((newObj as any).b.inner3.innerArray[1])).toEqual(
    '{"new":"Hi there","one":"one","two":2,"three":3,"four":{"one":1}}'
  )
})

test("Insert after key that doesn't exist", () => {
  expect(assign(testObj1, 'b.inner3.oneMore', 'YUP', { insertBefore: 'missing' })).toStrictEqual({
    ...testObj1_original,
    b: {
      inner: 'this',
      inner2: 45,
      inner3: {
        innerDeep: 2.4,
        innerDeep2: [1, 2, 3],
        innerBool: false,
        innerArray: [
          { one: 1, two: 'two', three: true, four: null, five: true },
          { one: 'one', two: 2, three: 3, four: { one: 1 } },
        ],
        oneMore: 'YUP',
      },
    },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})

test('Insert by index in object', () => {
  const newObj: any = assign(testObj1, 'b.inner3.innerArray[0].extra', 'Hi there', {
    insertAfter: 3,
  })
  expect(JSON.stringify(newObj.b.inner3.innerArray[0])).toEqual(
    '{"one":1,"two":"two","three":true,"four":null,"extra":"Hi there","five":true}'
  )
})

test('Insert at start index in object', () => {
  const newObj = assign(testObj1, 'b.inner3.innerArray[1].new', 'Hi there', {
    insertBefore: 0,
  })
  expect(JSON.stringify((newObj as any).b.inner3.innerArray[1])).toEqual(
    '{"new":"Hi there","one":"one","two":2,"three":3,"four":{"one":1}}'
  )
})

test("Insert after object index that doesn't exist", () => {
  expect(assign(testObj1, 'b.inner3.oneMore', 'YUP', { insertBefore: 999 })).toStrictEqual({
    ...testObj1_original,
    b: {
      inner: 'this',
      inner2: 45,
      inner3: {
        innerDeep: 2.4,
        innerDeep2: [1, 2, 3],
        innerBool: false,
        innerArray: [
          { one: 1, two: 'two', three: true, four: null, five: true },
          { one: 'one', two: 2, three: 3, four: { one: 1 } },
        ],
        oneMore: 'YUP',
      },
    },
  })
  // Ensure original hasn't been modified
  expect(testObj1).toStrictEqual(testObj1_original)
})
