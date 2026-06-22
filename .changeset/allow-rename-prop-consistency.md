---
'json-edit-react': major
'@json-edit-react/components': major
---

Renamed the `restrict*` props to `allow*` (inverting their polarity), plus a batch of display-prop renames for naming consistency.

**`restrict*` → `allow*` (semantics inverted).** `restrictEdit`/`restrictDelete`/`restrictAdd`/`restrictTypeSelection`/`restrictDrag` become `allowEdit`/`allowDelete`/`allowAdd`/`allowTypeSelection`/`allowDrag`. The polarity flips: a `boolean` inverts, and a `FilterFunction` now returns `true` to **permit** a node (it previously returned `true` to **block** it). Defaults flip accordingly — `allowEdit`/`allowDelete`/`allowAdd`/`allowTypeSelection` default to `true`, and `allowDrag` defaults to `false` (drag is still off by default). The axes remain independent: `allowEdit={false}` does not also disable add/delete/drag — use `JsonViewer` for a fully read-only display.

**Display / config renames** (pure renames, no behaviour change unless noted):

- `keySort` → `sortKeys`
- `rootFontSize` → `baseFontSize`
- `errorMessageTimeout` → `errorDisplayTime`
- `stringTruncate` → `stringTruncateLength` (also the `componentProps` of `Hyperlink` / `EnhancedLink` in `@json-edit-react/components`)
- `showArrayIndices` → `showArrayIndexes`
- `arrayIndexFromOne` (`boolean`) → `arrayIndexStart` (`number`): `arrayIndexFromOne={true}` becomes `arrayIndexStart={1}` (default `0`)

The `editorRef` imperative API is unchanged: `overrideRestrictions` and the `'RESTRICTED'` `startEdit` result keep their names.

See the [migration guide](../migration-guide.md#11-restrict-props-renamed-to-allow-semantics-inverted) for full mapping tables and recipes.
