import { useMemo } from 'react'
import { useStableValue } from '../stable-value'
import type { ValidationIssue, ValidationState, Validate } from './types'

// An injective path → string key for the internal index. Mirrors the scheme
// core uses for node IDs (encodeURIComponent per segment, '/'-joined, with a
// sentinel for the lone empty-string key) so keys containing '.' or '/' never
// collide. Kept local to preserve the package's type-only dependency on core.
const toKey = (path: (string | number)[]): string => {
  if (path.length === 1 && path[0] === '') return '\0'
  return path.map((part) => encodeURIComponent(String(part))).join('/')
}

// Compare issue lists by value, ignoring `raw` (which may be a large or cyclic
// library error object — never deep-recurse it). Two issues match when their
// path, message, and keyword match; lists match element-wise in order
// (validators emit issues deterministically for a given document).
const issuesEqual = (a: ValidationIssue[], b: ValidationIssue[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (x.message !== y.message || x.keyword !== y.keyword) return false
    if (x.path.length !== y.path.length) return false
    for (let j = 0; j < x.path.length; j++) if (x.path[j] !== y.path[j]) return false
  }
  return true
}

// One pass over the issues builds the O(1) query surface. The Map (keyed by the
// injective `toKey`, which safely escapes keys containing `.` or `/`) backs
// exact-node lookups; the Set holds every ancestor prefix of every error path —
// including the path itself — so a collapsed parent can answer "something
// invalid in here".
const buildValidationState = (issues: ValidationIssue[]): ValidationState => {
  const exact = new Map<string, ValidationIssue[]>()
  const within = new Set<string>()

  for (const issue of issues) {
    const key = toKey(issue.path)
    const list = exact.get(key)
    if (list) list.push(issue)
    else exact.set(key, [issue])

    for (let i = 0; i <= issue.path.length; i++) within.add(toKey(issue.path.slice(0, i)))
  }

  return {
    isValid: issues.length === 0,
    errors: issues,
    hasErrorAt: (path) => exact.has(toKey(path)),
    errorsAt: (path) => exact.get(toKey(path)) ?? [],
    hasErrorWithin: (path) => within.has(toKey(path)),
  }
}

/**
 * Reactive, whole-document validation as a queryable, identity-stable index.
 *
 * Document validity is a whole-document property: an edit at one node can flip
 * the validity of another node on a *different* branch (e.g. JSON Schema
 * `if/then`, `dependentRequired`, discriminated unions). Under fine-grained
 * re-rendering that other node never re-renders on its own, so validating
 * inline in a style function / `allow*` filter / custom-node `condition` goes
 * stale. This hook fixes that by tying the result's *identity* to the error
 * set:
 *
 * - It runs `validate` once per `data` change (not per node, not per
 *   keystroke), so the whole-document cost is O(N), not the O(N²) of validating
 *   inside every node's render.
 * - The returned object is **referentially stable while the error set is
 *   unchanged**. Memoize a `theme` / `customNodeDefinitions` / `allow*` value on
 *   it (`useMemo(() => …, [validation])`) and the §16 node-memo boundary stays
 *   intact across valid→valid commits; when validity actually changes, the new
 *   identity pierces `React.memo` through that channel and the tree re-renders
 *   once — correctly restyling cross-branch nodes.
 *
 * Lookups are O(1): `hasErrorAt(path)` for a node, `errorsAt(path)` for its
 * messages, `hasErrorWithin(path)` for "this node or anything inside it".
 *
 * ```tsx
 * const validation = useValidationState(data, ajvAdapter(ajv.compile(schema)))
 * const theme = useMemo(() => [base, validationStyles(validation)], [validation])
 * // <JsonEditor data={data} setData={setData} theme={theme} />
 * ```
 */
export const useValidationState = (data: unknown, validate: Validate): ValidationState => {
  const issues = useStableValue(() => validate(data), [data, validate], issuesEqual)
  return useMemo(() => buildValidationState(issues), [issues])
}
