import { type CollectionKey, type EditingState } from '../types'

export type Path = (string | number)[]

// Splits a string representing a (nested) property/index on an Object or Array
// into an array of strings/indexes
// e.g. "data.organisations.nodes[0]" => ["data", "organisations", "nodes", 0]
export const splitPropertyString = (propertyPath: string): Path =>
  propertyPath
    .split(/(\.|\[\d+\])/)
    .filter((part) => part !== '.' && part !== '')
    .map((part) => {
      const match = /\[(\d+)\]/.exec(part)
      if (!match) return part
      return Number(match[1])
    })

// The inverse of `splitPropertyString`: renders a path as a dot/bracket string
// (e.g. ["data", "users", 0, "name"] => "data.users[0].name"). Used for
// human-readable error messages and the copy-path feature.
export const stringifyPath = (path: Path | string | number): string => {
  if (typeof path === 'string') return path
  if (typeof path === 'number') return String(path)
  return path.reduce((str: string, part) => {
    if (typeof part === 'number') return `${str}[${part}]`
    else return str === '' ? part : `${str}.${part}`
  }, '')
}

/**
 * Converts a path expressed as an array of CollectionKeys to a string suitable
 * for HTML `name`/`id` attributes. The encoding is injective: keys are
 * URL-encoded (so any literal `/` becomes `%2F`) and joined with `/`. Because
 * `encodeURIComponent` never emits `/`, the separator can only appear between
 * keys, never inside one — so distinct paths always produce distinct strings.
 *
 * One edge case needs a sentinel: a single empty-string key `['']` would
 * otherwise produce `''` and collide with the root path `[]`. We map it to
 * `'\0'` instead — safe because `encodeURIComponent` never emits a literal
 * null char (it produces `'%00'` for the null byte).
 */
export const toPathString = (path: CollectionKey[]) => {
  if (path.length === 1 && path[0] === '') return '\0'
  return path.map((part) => encodeURIComponent(String(part))).join('/')
}

export const pathsEqual = (a: CollectionKey[], b: CollectionKey[]): boolean =>
  a.length === b.length && a.every((k, i) => k === b[i])

// Reflexive: a node is considered a (trivial) descendant of itself. Both
// callers (areChildrenBeingEdited, drag-onto-self guard) want this behaviour.
export const isDescendantOf = (node: CollectionKey[], ancestor: CollectionKey[]): boolean =>
  node.length >= ancestor.length && ancestor.every((k, i) => k === node[i])

export const editingStatesEqual = (a: EditingState | null, b: EditingState | null): boolean => {
  if (a === null || b === null) return a === b
  return a.mode === b.mode && pathsEqual(a.path, b.path)
}
