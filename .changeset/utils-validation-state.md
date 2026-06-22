---
'@json-edit-react/utils': minor
---

Add reactive validation helpers — `useValidationState`, `validationStyles`, `ajvAdapter`, and the `useStableValue` primitive they build on.

`useValidationState(data, validate)` runs a validator over the whole document and returns a queryable, identity-stable error index: `isValid`, `errors`, and the O(1) lookups `hasErrorAt(path)` / `errorsAt(path)` / `hasErrorWithin(path)`. It targets json-edit-react's fine-grained re-rendering: validating inline in a style function / `allow*` filter / custom-node `condition` goes stale when an edit on one node changes the validity of a node on *another* branch (which doesn't re-render). The hook ties the result's identity to the error set, so memoizing a `theme` / `customNodeDefinitions` / `allow*` value on it re-renders the tree exactly when validity changes — and never on a valid→valid commit. The validator runs once per `data` change (not per node, not per keystroke), so the whole-document cost is O(N), not the O(N²) of validating inside every node's render.

`validationStyles(validation, options?)` is theme sugar: a partial theme whose leaf slots flag `hasErrorAt` nodes (and, with `within`, collection ancestors via `hasErrorWithin`) — compose it as `theme={[myTheme, validationStyles(validation)]}`. `ajvAdapter(ajv.compile(schema))` adapts a compiled AJV validate function to the `Validate` contract, normalizing `instancePath` JSON-Pointers into node paths and keeping `required` errors at the parent path. You bring your own validator (or pass any `(data) => ValidationIssue[]`), so the package takes no third-party runtime dependency — not even on AJV.

`useStableValue(compute, deps, isEqual?)` is exported standalone: like `useMemo`, but it returns the previous reference while the computed value is equal, so any cross-branch derived value (validation, duplicate detection, a doc-wide total) can drive a memo-piercing channel without re-rendering the tree on every commit.
