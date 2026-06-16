// The catalogue of filter-builder recipes shown in the control panel. Each
// `predicate` is a real `FilterPredicate` from `@json-edit-react/utils`; the
// `code` string is what's displayed (and is exactly what produced the
// predicate). The builders intern their results, so referencing them at module
// scope here gives one stable instance per recipe.

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
} from '@json-edit-react/utils'

export interface Recipe {
  id: string
  group: string
  label: string
  code: string
  description: string
  predicate: FilterPredicate
}

// Display order of the chip groups.
export const RECIPE_GROUPS = ['Keys & paths', 'Position', 'Type & value', 'Combinators'] as const

export const RECIPES: Recipe[] = [
  // --- Keys & paths ---
  {
    id: 'key-id-name',
    group: 'Keys & paths',
    label: 'id / name keys',
    code: "byKey('id', 'name')",
    description: 'Nodes whose key is `id` or `name` — an exact key match, anywhere in the tree.',
    predicate: byKey('id', 'name'),
  },
  {
    id: 'key-at',
    group: 'Keys & paths',
    label: 'timestamp keys',
    code: 'byKey(/_at$/)',
    description: 'Keys ending in `_at` (created_at, updated_at) — a RegExp tested against the key.',
    predicate: byKey(/_at$/),
  },
  {
    id: 'path-tags',
    group: 'Keys & paths',
    label: 'tag entries',
    code: "byPath('**.tags.*')",
    description: 'Every element inside any `tags` array, at any depth — `**` spans whole segments.',
    predicate: byPath('**.tags.*'),
  },
  {
    id: 'path-lead-email',
    group: 'Keys & paths',
    label: 'dept lead emails',
    code: "byPath('departments.*.lead.email')",
    description: 'The `email` of each department lead — `*` matches one segment (the array index).',
    predicate: byPath('departments.*.lead.email'),
  },

  // --- Position ---
  {
    id: 'root',
    group: 'Position',
    label: 'root',
    code: 'root',
    description: 'The root node (level 0).',
    predicate: root,
  },
  {
    id: 'deep',
    group: 'Position',
    label: 'deep (level ≥ 4)',
    code: 'byLevel({ min: 4 })',
    description: 'Anything at depth 4 or deeper — lead fields, teams, members and below.',
    predicate: byLevel({ min: 4 }),
  },
  {
    id: 'big',
    group: 'Position',
    label: 'large collections (≥ 5)',
    code: 'bySize({ min: 5 })',
    description: 'Objects/arrays with five or more children. Leaves have no size and never match.',
    predicate: bySize({ min: 5 }),
  },
  {
    id: 'in-array',
    group: 'Position',
    label: 'array items',
    code: 'inArray',
    description: 'Nodes whose parent is an array — department, team and member records, plus tags/skills.',
    predicate: inArray,
  },
  {
    id: 'in-object',
    group: 'Position',
    label: 'object fields',
    code: 'inObject',
    description: 'Nodes whose parent is an object (the root, having no parent, is excluded).',
    predicate: inObject,
  },
  {
    id: 'collections',
    group: 'Position',
    label: 'collections',
    code: 'collections',
    description: 'Objects and arrays.',
    predicate: collections,
  },
  {
    id: 'primitives',
    group: 'Position',
    label: 'leaves',
    code: 'primitives',
    description: 'Leaf values — everything that isn’t a collection.',
    predicate: primitives,
  },

  // --- Type & value ---
  {
    id: 'numbers',
    group: 'Type & value',
    label: 'numbers',
    code: "byType('number')",
    description: 'Every number-valued node — headcounts, budgets, coordinates, years.',
    predicate: byType('number'),
  },
  {
    id: 'bool-null',
    group: 'Type & value',
    label: 'booleans & nulls',
    code: "byType('boolean', 'null')",
    description: 'Boolean and null values — flags like `active` / `remote`, and empty `manager` / `parentCompany`.',
    predicate: byType('boolean', 'null'),
  },
  {
    id: 'true',
    group: 'Type & value',
    label: 'true values',
    code: 'byValue(true)',
    description: 'Leaves whose value is exactly `true`.',
    predicate: byValue(true),
  },
  {
    id: 'urls',
    group: 'Type & value',
    label: 'URLs',
    code: 'byValue(/^https?:/)',
    description: 'String values that look like a URL — websites, repositories, avatars.',
    predicate: byValue(/^https?:/),
  },

  // --- Combinators ---
  {
    id: 'str-not-url',
    group: 'Combinators',
    label: 'strings, not URLs',
    code: "and(byType('string'), not(byValue(/^https?:/)))",
    description: 'String values, excluding URLs — names, roles, cities, dates.',
    predicate: and(byType('string'), not(byValue(/^https?:/))),
  },
  {
    id: 'email-or-web',
    group: 'Combinators',
    label: 'email or website',
    code: "or(byKey('email'), byKey('website'))",
    description: 'Any `email` or `website` field — `or` matches when either predicate does.',
    predicate: or(byKey('email'), byKey('website')),
  },
  {
    id: 'not-collections',
    group: 'Combinators',
    label: 'not collections',
    code: 'not(collections)',
    description: 'The negation of `collections` — the same set as `primitives`, the long way round.',
    predicate: not(collections),
  },
]

export interface SearchStrategy {
  id: string
  label: string
  code: string
  description: string
  filter: FilterPredicate
}

export const SEARCH_STRATEGIES: SearchStrategy[] = [
  {
    id: 'value',
    label: "matchesSearch('value')",
    code: "matchesSearch('value')",
    description: 'Core’s default — matches a node’s value. Only the matching nodes (and their ancestors) stay visible.',
    filter: matchesSearch('value'),
  },
  {
    id: 'key',
    label: "matchesSearch('key')",
    code: "matchesSearch('key')",
    description: 'Matches keys and path segments rather than values — try a field name like “email” or “skills”.',
    filter: matchesSearch('key'),
  },
  {
    id: 'all',
    label: "matchesSearch('all')",
    code: "matchesSearch('all')",
    description: 'Matches keys OR values — the union of the two above.',
    filter: matchesSearch('all'),
  },
  {
    id: 'record',
    label: 'matchRecord (people)',
    code: "matchRecord({\n  fields: ['name', 'email', 'role'],\n  path: 'departments.*.teams.*.members.*',\n})",
    description:
      'Reveals a person’s WHOLE record when their name, email or role matches — not just the field that hit. Search “Bao” and compare against matchesSearch.',
    filter: matchRecord({
      fields: ['name', 'email', 'role'],
      path: 'departments.*.teams.*.members.*',
    }),
  },
]
