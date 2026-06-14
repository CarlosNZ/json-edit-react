---
'@json-edit-react/components': minor
---

Add `ErrorIndicator` — a custom-node component that wraps the built-in node (`originalNode`) and adds a glyph (default ⚠️) beside it, to flag nodes you target.

Unlike the other pre-built components it has no intrinsic value type: `errorIndicatorDefinition({ condition })` decorates exactly the value nodes the consumer's `condition` selects, so it pairs directly with `useValidationState` from `@json-edit-react/utils` — `errorIndicatorDefinition({ condition: (nd) => validation.hasErrorAt(nd.path) })`, memoized on the validation state, marks invalid nodes (correctly across branches). It guards to value (leaf) nodes, so a condition that also matches a collection (e.g. an AJV `if`/`then` error reported at a parent object's path) never wraps that collection. Options via `componentProps`: `errorGlyph` (any `ReactNode`, default `⚠️`) and `position` (`'before' | 'after'`, default `'after'`). With no `condition` it flags nothing. Dependency-free — it imports only React and core types.
