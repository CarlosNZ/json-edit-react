import { useMemo, useRef, type DependencyList } from 'react'
import { deepEqual } from './deepEqual'

/**
 * Like `useMemo`, but returns the *previous* reference whenever the freshly
 * computed value is equal to it — so the identity changes only when the value
 * genuinely changes, not merely when `deps` change.
 *
 * This is the identity stabiliser that lets a value derived from the whole
 * document — validation errors, duplicate detection, a doc-wide total — drive a
 * memo-piercing channel in json-edit-react without re-rendering the tree on
 * every commit. It recomputes per `data` change but hands the editor the same
 * reference until the result actually differs, so a stable
 * `theme`/`customNodeDefinitions`/`allow*` identity keeps the node-memo
 * boundary intact and the tree re-renders once, exactly when the derived value
 * changes — cross-branch effects included, which no single node would otherwise
 * re-render for.
 *
 * `useValidationState` is built on this. Reach for it directly for any other
 * cross-branch derived condition:
 *
 * ```tsx
 * const duplicates = useStableValue(() => findDuplicatePaths(data), [data])
 * const theme = useMemo(() => [base, highlight(duplicates)], [duplicates])
 * // the tree re-renders only when the set of duplicates changes
 * ```
 *
 * `isEqual` defaults to a structural deep-equal. Pass your own when the value
 * has a cheaper key, or fields that shouldn't be compared.
 */
export const useStableValue = <T>(
  compute: () => T,
  deps: DependencyList,
  isEqual: (prev: T, next: T) => boolean = deepEqual
): T => {
  // The ref is the real stability anchor: even if React discards the memo and
  // recomputes with unchanged deps, an equal result returns the same
  // reference.
  const ref = useRef<{ value: T } | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const next = compute()
    if (ref.current && isEqual(ref.current.value, next)) return ref.current.value
    ref.current = { value: next }
    return next
  }, deps)
}
