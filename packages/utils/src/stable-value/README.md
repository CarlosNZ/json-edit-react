# Stable identity — `useStableValue`

Like `useMemo`, but it returns the **previous reference** whenever the freshly computed value is equal to the last one — so the identity changes only when the *value* genuinely changes, not merely when `deps` change. Zero dependencies.

```ts
useStableValue<T>(compute: () => T, deps: DependencyList, isEqual?: (prev: T, next: T) => boolean): T
```

`isEqual` defaults to a structural deep-equal (early-exit on first difference); pass your own when the value has a cheaper key or fields that shouldn't be compared.

## Why it exists

json-edit-react re-renders the tree when a memo-piercing prop changes identity — `theme`, `customNodeDefinitions`, an `allow*` filter. To drive that channel from a value derived off the whole document (validation errors, duplicate detection, a doc-wide total), you want to recompute per `data` change but hand the editor the *same* reference until the derived value actually differs: a stable identity keeps the §16 node-memo boundary intact across no-op commits, and the identity flips — re-rendering the tree once — exactly when the value changes (including cross-branch effects no single node would re-render for).

Plain `useMemo(() => derive(data), [data])` can't do this: `data` changes every commit, so the memo yields a fresh identity every commit, re-rendering the whole tree on every keystroke.

```tsx
const duplicates = useStableValue(() => findDuplicatePaths(data), [data])
const theme = useMemo(() => [base, highlightDuplicates(duplicates)], [duplicates])
// the tree re-renders only when the set of duplicate paths changes
```

[`useValidationState`](../validation) is built on this; reach for `useStableValue` directly for any other cross-branch derived condition.

## Note on the comparison

`isEqual` compares the **computed result**, not `data` — so keep the result small (a derived summary: an error set, a list of paths, a total), and the compare stays cheap regardless of document size. Returning the whole document as the result is the one way to make it expensive.
