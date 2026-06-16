import type { JsonData, NodeData } from 'json-edit-react'
import {
  and,
  byKey,
  byLevel,
  byPath,
  bySize,
  byType,
  byValue,
  collections,
  inArray,
  inObject,
  matchesSearch,
  matchRecord,
  not,
  or,
  primitives,
  root,
  type FilterPredicate,
} from '../src'

// ---------------------------------------------------------------------------
// One shared document, probed from every angle below. Read the tree alongside
// the expectations — each row notes the value type, level, and (for collections)
// child count, plus whether the parent is an array. `"schema.url"` deliberately
// contains a dot to exercise the segment-array escape hatch.
//
//   (root)                                          obj  L0  size 3
//   ├─ meta                                         obj  L1  size 4
//   │   ├─ version          2                       num  L2
//   │   ├─ "schema.url"     "https://…"             str  L2   ← key has a dot
//   │   ├─ locked           true                    bool L2
//   │   └─ notes            null                    null L2
//   ├─ users                                        arr  L1  size 2
//   │   ├─ [0]                                      obj  L2  size 7  (in array)
//   │   │   ├─ id           1                       num  L3
//   │   │   ├─ name         "Leanne Graham"         str  L3
//   │   │   ├─ username     "Bret"                  str  L3
//   │   │   ├─ email        "leanne@example.com"    str  L3
//   │   │   ├─ status       "LOCKED"                str  L3
//   │   │   ├─ roles        ["admin","ops"]         arr  L3  size 2
//   │   │   │   ├─ [0]      "admin"                 str  L4   (in array)
//   │   │   │   └─ [1]      "ops"                   str  L4   (in array)
//   │   │   └─ address                              obj  L3  size 2
//   │   │       ├─ city     "Gwenborough"           str  L4
//   │   │       └─ geo                              obj  L4  size 2
//   │   │           ├─ lat  "-37.3159"              str  L5
//   │   │           └─ lng  "81.1496"               str  L5
//   │   └─ [1]                                      obj  L2  size 7  (in array)
//   │       ├─ id           2                       num  L3
//   │       ├─ name         "Ervin Howell"          str  L3
//   │       ├─ username     "Antonette"             str  L3
//   │       ├─ email        "ervin@example.com"     str  L3
//   │       ├─ status       "active"                str  L3
//   │       ├─ roles        ["viewer"]              arr  L3  size 1
//   │       │   └─ [0]      "viewer"                str  L4   (in array)
//   │       └─ address                              obj  L3  size 2
//   │           ├─ city     "Wisokyburgh"           str  L4
//   │           └─ geo                              obj  L4  size 2
//   │               ├─ lat  "-43.9509"              str  L5
//   │               └─ lng  "-34.4618"              str  L5
//   └─ config                                       obj  L1  size 2
//       ├─ featureFlags                             obj  L2  size 2
//       │   ├─ beta         false                   bool L3
//       │   └─ experimental true                    bool L3
//       └─ limits                                   obj  L2  size 2
//           ├─ maxUsers     100                     num  L3
//           └─ maxItems     50                      num  L3
// ---------------------------------------------------------------------------
const data = {
  meta: {
    version: 2,
    'schema.url': 'https://schema.example.com/v2',
    locked: true,
    notes: null,
  },
  users: [
    {
      id: 1,
      name: 'Leanne Graham',
      username: 'Bret',
      email: 'leanne@example.com',
      status: 'LOCKED',
      roles: ['admin', 'ops'],
      address: { city: 'Gwenborough', geo: { lat: '-37.3159', lng: '81.1496' } },
    },
    {
      id: 2,
      name: 'Ervin Howell',
      username: 'Antonette',
      email: 'ervin@example.com',
      status: 'active',
      roles: ['viewer'],
      address: { city: 'Wisokyburgh', geo: { lat: '-43.9509', lng: '-34.4618' } },
    },
  ],
  config: {
    featureFlags: { beta: false, experimental: true },
    limits: { maxUsers: 100, maxItems: 50 },
  },
}

// --- Test harness (self-contained — touches only core's public types) -------

type Path = (string | number)[]

const isColl = (v: unknown): v is object => v !== null && typeof v === 'object'

const get = (obj: unknown, path: Path): unknown =>
  path.reduce<unknown>((acc, k) => (acc == null ? acc : (acc as Record<string, unknown>)[k]), obj)

// A faithful NodeData for any path in `data`, built the same way the editor
// would (key, level, index, size, parentData all derived from the document).
const nodeAt = (path: Path): NodeData => {
  const value = get(data, path)
  const parentData = path.length === 0 ? null : (get(data, path.slice(0, -1)) ?? null)
  const key = path.length === 0 ? '' : path[path.length - 1]
  let index = 0
  if (Array.isArray(parentData)) index = Number(key)
  else if (parentData) index = Object.keys(parentData).indexOf(String(key))
  return {
    key,
    path,
    level: path.length,
    index,
    value: value as JsonData,
    size: isColl(value) ? Object.keys(value).length : null,
    parentData: parentData as object | null,
    fullData: data as JsonData,
  }
}

// Every node path in the document, in render (pre-order) order.
const allPaths = (value: unknown, prefix: Path = []): Path[] => {
  const paths: Path[] = [prefix]
  if (isColl(value))
    for (const [k, v] of Object.entries(value)) {
      const key = Array.isArray(value) ? Number(k) : k
      paths.push(...allPaths(v, [...prefix, key]))
    }
  return paths
}
const PATHS = allPaths(data)

// A readable label for a path: dotted keys, `[n]` for indices, `(root)` for [].
const label = (path: Path): string =>
  path.length === 0
    ? '(root)'
    : path.reduce<string>(
        (s, k) => (typeof k === 'number' ? `${s}[${k}]` : s === '' ? `${k}` : `${s}.${k}`),
        ''
      )

// The paths a predicate matches, as readable labels, in document order. The
// workhorse: most assertions read as "this predicate selects exactly these
// nodes from the whole tree".
const select = (pred: FilterPredicate, searchText?: string): string[] =>
  PATHS.filter((path) => pred(nodeAt(path), searchText)).map(label)

// =============================================================================
// Property builders
// =============================================================================

describe('byKey', () => {
  it('matches a single key, anywhere it appears in the tree', () => {
    expect(select(byKey('city'))).toEqual(['users[0].address.city', 'users[1].address.city'])
  })

  it('is variadic — matches any of several keys', () => {
    expect(select(byKey('id', 'name'))).toEqual([
      'users[0].id',
      'users[0].name',
      'users[1].id',
      'users[1].name',
    ])
  })

  it('accepts a RegExp, tested against the stringified key', () => {
    expect(select(byKey(/^max/))).toEqual(['config.limits.maxUsers', 'config.limits.maxItems'])
  })

  it('matches numeric array indices', () => {
    expect(select(byKey(0))).toEqual(['users[0]', 'users[0].roles[0]', 'users[1].roles[0]'])
  })
})

describe('byPath', () => {
  it('matches a fixed path; `*` fills exactly one segment (incl. indices)', () => {
    expect(select(byPath('users.*.name'))).toEqual(['users[0].name', 'users[1].name'])
  })

  it('accepts both dotted and bracket index notation', () => {
    expect(select(byPath('users.0.email'))).toEqual(['users[0].email'])
    expect(select(byPath('users[0].email'))).toEqual(['users[0].email'])
  })

  it('supports {a,b} alternation within a segment', () => {
    expect(select(byPath('users.*.{name,email}'))).toEqual([
      'users[0].name',
      'users[0].email',
      'users[1].name',
      'users[1].email',
    ])
  })

  it('`*` matches within a segment, not just whole segments', () => {
    expect(select(byPath('config.limits.max*'))).toEqual([
      'config.limits.maxUsers',
      'config.limits.maxItems',
    ])
  })

  it('`**` matches zero-or-more segments — a subtree that INCLUDES its root', () => {
    expect(select(byPath('config.**'))).toEqual([
      'config',
      'config.featureFlags',
      'config.featureFlags.beta',
      'config.featureFlags.experimental',
      'config.limits',
      'config.limits.maxUsers',
      'config.limits.maxItems',
    ])
  })

  it('a bare name is EXACT, not a subtree', () => {
    expect(select(byPath('config'))).toEqual(['config'])
  })

  it('`**` can lead, to match a tail anywhere', () => {
    expect(select(byPath('**.geo.lat'))).toEqual([
      'users[0].address.geo.lat',
      'users[1].address.geo.lat',
    ])
  })

  it('treats a dotted key as ONE segment under `*`', () => {
    // `meta.*` matches all four children, including the key that contains a dot.
    expect(select(byPath('meta.*'))).toEqual([
      'meta.version',
      'meta.schema.url',
      'meta.locked',
      'meta.notes',
    ])
  })

  it('needs the segment-array form to target a key containing a dot', () => {
    // The string form splits on the dot and matches nothing real…
    expect(select(byPath('meta.schema.url'))).toEqual([])
    // …whereas the array form addresses the single real node.
    expect(byPath(['meta', 'schema.url'])(nodeAt(['meta', 'schema.url']))).toBe(true)
  })

  it('accepts a RegExp, tested against the stringified path', () => {
    expect(select(byPath(/\.geo$/))).toEqual([
      'users[0].address.geo',
      'users[1].address.geo',
    ])
  })
})

describe('byLevel', () => {
  it('takes a bare number for an exact level (root = 0)', () => {
    expect(select(byLevel(1))).toEqual(['meta', 'users', 'config'])
  })

  it('bounds one end with the object form (omitted end = unbounded)', () => {
    expect(select(byLevel({ max: 1 }))).toEqual(['(root)', 'meta', 'users', 'config'])
    expect(select(byLevel({ min: 5 }))).toEqual([
      'users[0].address.geo.lat',
      'users[0].address.geo.lng',
      'users[1].address.geo.lat',
      'users[1].address.geo.lng',
    ])
  })
})

describe('bySize', () => {
  it('matches collections by child count', () => {
    expect(select(bySize({ min: 7 }))).toEqual(['users[0]', 'users[1]'])
    expect(select(bySize({ max: 1 }))).toEqual(['users[1].roles'])
    expect(select(bySize(2))).toEqual([
      'users',
      'users[0].roles',
      'users[0].address',
      'users[0].address.geo',
      'users[1].address',
      'users[1].address.geo',
      'config',
      'config.featureFlags',
      'config.limits',
    ])
  })

  it('never matches a leaf (a leaf has no size)', () => {
    expect(bySize({ min: 0 })(nodeAt(['meta', 'version']))).toBe(false)
  })
})

describe('byType', () => {
  it('matches primitive value types', () => {
    expect(select(byType('boolean'))).toEqual([
      'meta.locked',
      'config.featureFlags.beta',
      'config.featureFlags.experimental',
    ])
    expect(select(byType('null'))).toEqual(['meta.notes'])
    expect(select(byType('number'))).toEqual([
      'meta.version',
      'users[0].id',
      'users[1].id',
      'config.limits.maxUsers',
      'config.limits.maxItems',
    ])
  })

  it('distinguishes object from array', () => {
    expect(select(byType('array'))).toEqual(['users', 'users[0].roles', 'users[1].roles'])
  })
})

describe('byValue', () => {
  it('matches an exact value', () => {
    expect(select(byValue('LOCKED'))).toEqual(['users[0].status'])
    expect(select(byValue(true))).toEqual(['meta.locked', 'config.featureFlags.experimental'])
    expect(select(byValue(null))).toEqual(['meta.notes'])
  })

  it('is variadic — matches any of several values', () => {
    expect(select(byValue(1, 2))).toEqual(['meta.version', 'users[0].id', 'users[1].id'])
  })

  it('accepts a RegExp for partial/pattern matching on the value', () => {
    expect(select(byValue(/example\.com$/))).toEqual(['users[0].email', 'users[1].email'])
  })
})

// =============================================================================
// Node-position constants
// =============================================================================

describe('position constants', () => {
  it('root is exactly the top node', () => {
    expect(select(root)).toEqual(['(root)'])
  })

  it('collections / primitives partition the tree', () => {
    // Every node is one or the other, never both.
    expect(select(collections)).toEqual(PATHS.filter((p) => isColl(get(data, p))).map(label))
    expect(select(primitives)).toEqual(PATHS.filter((p) => !isColl(get(data, p))).map(label))
  })

  it('inArray matches array items only', () => {
    expect(select(inArray)).toEqual([
      'users[0]',
      'users[0].roles[0]',
      'users[0].roles[1]',
      'users[1]',
      'users[1].roles[0]',
    ])
  })

  it('inObject matches object fields (and never the root, which has no parent)', () => {
    expect(inObject(nodeAt(['meta', 'version']))).toBe(true)
    expect(inObject(nodeAt(['users', 0]))).toBe(false) // parent is the users array
    expect(inObject(nodeAt([]))).toBe(false) // root: parentData is null
  })
})

// =============================================================================
// Combinators
// =============================================================================

describe('and / or / not', () => {
  it('and = every predicate matches', () => {
    // The user-record nodes: level-2 items that live in an array.
    expect(select(and(byPath('users.*'), inArray))).toEqual(['users[0]', 'users[1]'])
  })

  it('or = any predicate matches (document order, across branches)', () => {
    expect(select(or(byKey('beta'), byKey('lat')))).toEqual([
      'users[0].address.geo.lat',
      'users[1].address.geo.lat',
      'config.featureFlags.beta',
    ])
  })

  it('not negates; not(collections) is exactly primitives', () => {
    expect(select(not(root))).toEqual(PATHS.slice(1).map(label))
    expect(select(not(collections))).toEqual(select(primitives))
  })

  it('empty combinators have identity behaviour', () => {
    expect(select(and())).toEqual(PATHS.map(label)) // vacuously true everywhere
    expect(select(or())).toEqual([]) // vacuously false everywhere
  })

  it('accepts a hand-rolled FilterFunction alongside the builders', () => {
    const big = ({ value }: NodeData) => typeof value === 'number' && value >= 100
    expect(select(and(byPath('config.**'), big))).toEqual(['config.limits.maxUsers'])
  })
})

// =============================================================================
// Search bridges
// =============================================================================

describe('matchesSearch', () => {
  it("'value' matches node values (the default)", () => {
    expect(select(matchesSearch('value'), 'leanne')).toEqual(['users[0].name', 'users[0].email'])
    expect(select(matchesSearch(), 'leanne')).toEqual(select(matchesSearch('value'), 'leanne'))
  })

  it("'key' matches keys (substring, like core)", () => {
    expect(select(matchesSearch('key'), 'username')).toEqual([
      'users[0].username',
      'users[1].username',
    ])
  })

  it("'all' matches key OR value", () => {
    expect(select(matchesSearch('all'), 'antonette')).toEqual(['users[1].username'])
  })

  it('composes with a path scope — search only within a subtree', () => {
    // "true" matches meta.locked AND config.featureFlags.experimental by value,
    // but the path scope keeps only the one inside config — and the searchText
    // is threaded through `and` to the inner matchesSearch.
    expect(select(and(byPath('config.**'), matchesSearch('value')), 'true')).toEqual([
      'config.featureFlags.experimental',
    ])
  })
})

describe('matchRecord', () => {
  it('reveals a whole record matched on its key fields (path-located)', () => {
    expect(
      select(matchRecord({ fields: ['name', 'username'], path: 'users.*' }), 'antonette')
    ).toEqual([
      'users[1]',
      'users[1].id',
      'users[1].name',
      'users[1].username',
      'users[1].email',
      'users[1].status',
      'users[1].roles',
      'users[1].roles[0]',
      'users[1].address',
      'users[1].address.city',
      'users[1].address.geo',
      'users[1].address.geo.lat',
      'users[1].address.geo.lng',
    ])
  })

  it("defaults path to '*' (top-level items) and keys off the RECORD's field, not the node's own value", () => {
    // searchText "2" — meta.version is 2, so the whole meta record shows. Note
    // users[0].id is ALSO 2, but matchRecord tests the record's `version`
    // field, not each node's own value, so the users records stay hidden.
    expect(select(matchRecord({ fields: ['version'] }), '2')).toEqual([
      'meta',
      'meta.version',
      'meta.schema.url',
      'meta.locked',
      'meta.notes',
    ])
  })
})

// =============================================================================
// Referential stability (interning) — inline use must not churn the node memo
// =============================================================================

describe('interning', () => {
  it('returns the same instance for equal arguments', () => {
    expect(byKey('name')).toBe(byKey('name'))
    expect(byPath('users.*')).toBe(byPath('users.*'))
    expect(byType('string', 'number')).toBe(byType('string', 'number'))
    expect(byValue('LOCKED')).toBe(byValue('LOCKED'))
    expect(byLevel(2)).toBe(byLevel(2))
    expect(byLevel({ max: 2 })).toBe(byLevel({ max: 2 }))
  })

  it('distinguishes different arguments', () => {
    expect(byKey('name')).not.toBe(byKey('email'))
    expect(byLevel(2)).not.toBe(byLevel({ max: 2 }))
  })

  it('keys RegExp args on source + flags', () => {
    expect(byValue(/x/i)).toBe(byValue(/x/i))
    expect(byKey(/x/i)).not.toBe(byKey(/x/g))
  })

  it('combinators are stable when their (interned) children are', () => {
    expect(and(byKey('a'), byKey('b'))).toBe(and(byKey('a'), byKey('b')))
    expect(not(root)).toBe(not(root))
  })
})
