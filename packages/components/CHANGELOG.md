# @json-edit-react/components

## 0.9.0-beta.4

### Minor Changes

- New `AutoType` component (#393): an edit-only node that replaces the Type selector with a single text input and infers the value's type from what you type — `12.3` → number, `true` → boolean, `null` → null, `{…}`/`[…]` → object/array, and anything else a string. It applies to every value node (pair it with `allowTypeSelection={false}`); collections aren't matched, so they keep their built-in "Edit as JSON" editor. Confirming an unchanged value keeps the original, so a string that merely looks like a number won't silently re-type. Accepts an optional `jsonParse` component prop (default `JSON.parse`) for a lenient parser such as `JSON5.parse`.

### Patch Changes

- ColorPicker: fix an occasional infinite re-render / feedback loop between the picker and the text input (#390). The picker's own output is now echoed straight back into react-colorful's `color` prop instead of being re-derived through colord: that round-trip re-rounded the value and re-added the alpha key the non-alpha picker strips, defeating react-colorful's `===` identity check and forcing a redundant re-sync on every change (and collapsing the hue at the grey axis). A finiteness guard also ensures react-colorful never receives a non-finite colour — a `NaN` (which its pointer math can produce for a zero-size picker) would otherwise permanently defeat that same identity check and spin an infinite render. colord is still used to format the text value, and the ineffective `isUpdatingFromPicker` guard is removed.

## 0.9.0-beta.3

### Patch Changes

- Stop annotating component render JSX with `/*#__PURE__*/`. Those annotations did nothing for tree-shaking (a component's `return jsx(...)` is inside its function and drops with it), and terser repositioned them onto the `return` keyword — an invalid spot that made consumers' bundlers warn ("annotation that Rollup cannot interpret due to the position of the comment") and discard them. The annotations that actually drive per-component shaking (on the `createDefinitionFactory` / `lazy` calls) are unchanged, so bundle output and tree-shaking are identical — this only quiets the build warnings.

## 0.9.0-beta.2

### Patch Changes

- Fix per-component tree-shaking (#388). Importing a single definition no longer pulls every component and its heavy deps: e.g. `import { hyperlinkDefinition }` drops from ~50 kB gzip to <1 kB, with react-markdown / react-colorful / colord no longer reachable. The build stamps `/*#__PURE__*/` onto the eager `jsx`/`lazy`/`createDefinitionFactory` calls, and the exotic-type definitions (BigInt, Symbol, Date, DatePicker, Unix Timestamp) now declare `defaultValue` as a function so it isn't built at module load. As a bonus, the time-based defaults (Date / DatePicker / Unix Timestamp) are now computed fresh per new node instead of being frozen at app-load time. Requires `json-edit-react` ≥ 2.0.0-beta.7 (function-`defaultValue` support). No change to how components are authored or imported.
- ColorPicker: register colord's named-colour plugin lazily (on first render) instead of at module top level. The top-level `extend(...)` was a real side effect that contradicted the package's `sideEffects: false`, so a bundler trusting that flag could drop it and silently break named-colour parsing ('red', 'rebeccapurple', …). No behavioural change — the plugin still registers before any colour is parsed.

## 0.9.0-beta.0

### Major Changes

- 6b76705: Renamed the `restrict*` props to `allow*` (inverting their polarity), plus a batch of display-prop renames for naming consistency.

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

- b82f8db: Renamed the `CustomNodeDefinition` fields and props type for consistency, around one distinction: a **node** is a position in the data tree; a **component** is the React function that renders it.

  - **Render slots** (they hold React components, not "elements"): `element` → `component`, `customKey` → `keyComponent`, `wrapperElement` → `wrapperComponent`.
  - **Config**: `customNodeProps` → `componentProps` (the bag passed to `component` + `keyComponent`).
  - **Visibility flags** (now all positive `show*`): `hideKey` → `showKey` (**polarity inverted** — `showKey` defaults to `true`), `showInTypesSelector` → `showInTypeSelector`.
  - **Types**: `CustomNodeProps` → `CustomComponentProps` (the props your component receives; also resolves the long-standing `CustomNodeProps` / `CustomNodeDefinition` name clash). The new `CustomWrapperProps` types `wrapperComponent`, which now receives its config as `wrapperProps` (previously delivered as `customNodeProps`). `CustomNodeDefinition` and `CustomKeyProps` keep their names.
  - **Error reporter removed**: custom components no longer receive an error-reporter prop (v1's positional `onError`). To reject invalid input, `throw` from the definition's `fromStandardType` — the editor rejects the commit, keeps the editor open, shows the message inline, and fires the consumer's `onError`. This removes the name clash with the editor-level `onError` _observer_.
  - **Key component**: `CustomKeyProps.setIsEditingKey` → `startEditingKey` — a zero-arg "enter key-edit mode" command, renamed off the `setIs*` prefix that wrongly implied a React `Dispatch` setter.
  - **Keyboard handler**: `CustomComponentProps.handleKeyPress` → `onKeyDown` — "keyPress" is React's deprecated event name; `onKeyDown` matches `TextEditorProps.onKeyDown` (and the public `AutogrowTextArea`'s handler prop).
  - **Value access**: `CustomComponentProps` no longer carries the redundant `data` field (it duplicated `value`, and was typed `unknown`). Read the node's live value via `value`, or its committed value via `nodeData.value`.

  All 12 components in `@json-edit-react/components` use the new field names. Consumers overriding a shipped definition's `customNodeProps` must rename to `componentProps`, and custom-component bodies must rename the props type (`CustomNodeProps` → `CustomComponentProps`), the config prop they destructure (`customNodeProps` → `componentProps`), move any error-reporting call (v1's `onError`) into a `throw`ing `fromStandardType`, rename a key component's `setIsEditingKey` call to `startEditingKey`, rename the key-down handler `handleKeyPress` → `onKeyDown`, and read the node value via `value` / `nodeData.value` instead of `data`.

  See the [migration guide](../migration-guide.md#13-customnodedefinition-field-renames) for the full mapping and before/after examples.

### Minor Changes

- b66b15f: Add `ErrorIndicator` — a custom-node component that wraps the built-in node (`originalNode`) and adds a glyph (default ⚠️) beside it, to flag nodes you target.

  Unlike the other pre-built components it has no intrinsic value type: `errorIndicatorDefinition({ condition })` decorates exactly the value nodes the consumer's `condition` selects, so it pairs directly with `useValidationState` from `@json-edit-react/utils` — `errorIndicatorDefinition({ condition: (nd) => validation.hasErrorAt(nd.path) })`, memoized on the validation state, marks invalid nodes (correctly across branches). It guards to value (leaf) nodes, so a condition that also matches a collection (e.g. an AJV `if`/`then` error reported at a parent object's path) never wraps that collection. Options via `componentProps`: `errorGlyph` (any `ReactNode`, default `⚠️`) and `position` (`'before' | 'after'`, default `'after'`). With no `condition` it flags nothing. Dependency-free — it imports only React and core types.

- d1c5297: Move the editor-slot widgets (`ReactSelect`, `CodeEditor`) to their own subpath, `@json-edit-react/components/widgets`. They're a different kind of thing from the rest of the package — they satisfy JsonEditor's `Select` / `TextEditor` prop contracts to replace a built-in UI control, rather than ship a `CustomNodeDefinition` for `customNodeDefinitions` — so they're kept off the package root, leaving it uniformly node-definition components.

  Import them from the subpath: `import { ReactSelect, CodeEditor } from '@json-edit-react/components/widgets'`. Everything else continues to import from the package root.

- da49479: `DatePicker` now renders its calendar UI from a swappable widget passed via `componentProps.DatePicker`, rather than bundling `react-datepicker` directly. Import the supplied `ReactDatePicker` from the `@json-edit-react/components/widgets` subpath and pass it (`datePickerDefinition({ componentProps: { DatePicker: ReactDatePicker } })`), or supply any component satisfying the exported `DatePickerWidgetProps` contract (`Date` in, `Date` out) to drop in your own picker. With no widget supplied the node falls back to editing the raw ISO string and shows a warning, so `react-datepicker` is only pulled into your bundle when you opt in.

  A consumer's picker that ships its own OK/Cancel buttons keeps working: the contract surfaces `onConfirm`/`onCancel` (alongside `onChange`, which only updates the edit buffer). react-datepicker specifics (`dateFormat`, `minDate`, etc.) move onto `ReactDatePicker` and are set by wrapping it: `DatePicker: (props) => <ReactDatePicker {...props} dateFormat="dd/MM/yyyy" />`. The read-only display defaults to the locale date/time and accepts an optional `formatter: (date: Date) => string` in `componentProps`.

- 19be8f0: Pre-built custom-node definitions are exported as **definition factories**: `hyperlinkDefinition()`, `enhancedLinkDefinition()`, `datePickerDefinition()`, `dateObjectDefinition()`, `colorPickerDefinition()`, `markdownDefinition()`, `imageDefinition()`, `booleanToggleDefinition()`, `bigIntDefinition()`, `nanDefinition()`, `symbolDefinition()`, `undefinedDefinition()`.

  Calling a factory with no arguments yields the standard definition. Passing overrides customizes it without losing the built-in safety condition: a `condition` override is _targeting_ — ANDed with the definition's guard, so e.g. `markdownDefinition({ condition: ({ key }) => key === 'description' })` can never match a value the component can't render — `componentProps` is shallow-merged with the defaults, any other field replaces its default, and the explicit `guard` key replaces the guard itself. The override surface is typed by the exported `DefinitionOverrides<T>`.

  The underlying components and their props types (`MarkdownComponent`, `DateTimePicker`, `LinkCustomComponent`, …) are exported alongside the factories, for wrapping or use in fully hand-rolled definitions.

- 7cb6ba7: BigInt, Symbol, Date Picker, Date Object, Color Picker and Enhanced Link definitions set `editOnTypeSwitch`, so switching a node to one of these types opens it for editing immediately (single commit on confirm, Esc cancels) instead of instantly committing the placeholder `defaultValue`.
- 7cb6ba7: The ✓ button, Enter, Tab and `editorRef.confirm()` now produce identical commits for every component: BigInt, Symbol, Date Object and Color Picker move their commit transforms into `fromStandardType` on their definitions, so the ✓ button no longer commits the raw buffer (e.g. BigInt committing a plain string, Color Picker bypassing `keepAsColor` validation). Behaviour change on invalid input: instead of silently reverting to the last valid value and closing, the editor stays open with your text intact and shows the error inline. The same hook seeds `editOnTypeSwitch` switches from the node's existing value instead of the placeholder default — Symbol seeds its description from the value, BigInt and Date Object seed from parseable values (and otherwise fall back to their defaults), Color Picker seeds its text input, Date (ISO) seeds the picker from parseable dates (falling back to now), and Enhanced Link reverses `toStandardType`'s `<url> (<text>)` form for a lossless round-trip, otherwise putting URL-looking values in its url field and anything else in its text field. Enhanced Link's fields now write to the core edit buffer, fixing edits being silently discarded when confirming with ✓.
- fca0b35: Split custom components into a separate publishable package.

  - New package: `@json-edit-react/components` ships 12 ready-to-use custom node components: `Hyperlink`, `EnhancedLink`, `DatePicker`, `DateObject`, `ColorPicker`, `Markdown`, `Image`, `BooleanToggle`, `BigInt`, `NaN`, `Symbol`, `Undefined`. Heavy third-party libraries (`react-datepicker`, `react-markdown`, `react-colorful`) are bundled as regular dependencies but loaded lazily at runtime via `React.lazy`, so unused components contribute zero to the consumer's bundle.
  - **Breaking (json-edit-react v2)**: the old `LinkCustomComponent` and `LinkCustomNodeDefinition` are no longer exported from `json-edit-react`. Replaced by `LinkCustomComponent` + the `hyperlinkDefinition` definition factory (functionally a superset, with configurable `componentProps`) from `@json-edit-react/components`. Migration: `import { hyperlinkDefinition } from '@json-edit-react/components'` and pass `hyperlinkDefinition()` to `customNodeDefinitions`.
  - The `custom-component-library` workspace is now a downstream consumer of `@json-edit-react/components` — its `components/` folder moved into the new package; its app imports from `@json-edit-react/components` like any other consumer would.

- b5b05da: Add two new components that plug into `JsonEditor`'s editor-slot props (not `customNodeDefinitions`):

  - `ReactSelect` — a `react-select` wrapper that satisfies the `SelectProps` contract. Pass to `JsonEditor`'s `Select` prop to replace the built-in native `<select>` used for type changes, enum value picking, and the new-key dropdown.
  - `CodeEditor` — a CodeMirror-based JSON editor that satisfies `TextEditorProps`. Pass to `JsonEditor`'s `TextEditor` prop to upgrade the raw-JSON text editor. Accepts an optional `theme` prop matching the built-in theme display names.

  Both follow the package's existing `React.lazy` pattern, so the third-party libraries (`react-select`, `@uiw/react-codemirror`, CodeMirror themes) only load at the moment the component is first rendered.

- 7cb6ba7: The Symbol, BigInt, Enhanced Link, and Date Object definitions provide `toStandardType`, so switching one of these nodes to a standard type via the Type selector seeds the editor sensibly: Symbol → its description, BigInt → its digit string, Enhanced Link → `<url> (<text>)` (instead of `'[object Object]'`), Date Object → its ISO string.
- b9fef80: Add a `UnixTimestamp` component: epoch numbers (seconds or milliseconds) rendered as a readable date, reusing the same swappable `DatePicker` widget for editing.

  The guard matches numbers in a plausible epoch window (years 1990–2100, as seconds or ms) — a heuristic, so target real timestamp fields with a `condition` override (ANDed with the guard) to avoid catching unrelated numbers. The unit defaults to `'auto'` (detected from magnitude, since the seconds and millisecond ranges don't overlap) and is preserved on commit; force it with `componentProps.unit`. The read-only view defaults to `displayAs: 'number'` (the ordinary number node plus a badge, default `'UNIX'`, via `badgeLabel`); `displayAs: 'date'` shows a formatted date with an optional `formatter`. Editing uses the picker passed via `componentProps.DatePicker` (e.g. `ReactDatePicker` from `@json-edit-react/components/widgets`); with none, the standard number editor handles edits. The value stays a plain JSON number throughout.

### Patch Changes

- 13f5950: Fix `BigInt` discarding edits on confirm: the keyboard confirm committed `BigInt(nodeData.value)` — the already-committed value — instead of the edited buffer. It now commits the typed value, falling back to the last valid value (with an `'Invalid BigInt'` `onError`) when the input isn't a valid integer string.

  Also fix `BigInt`, `DateObject` and `ColorPicker` displaying stale invalid text after an invalid-input fallback: committing the unchanged last-valid value doesn't alter the data, so the edit buffer never resynced. The fallback now resets the buffer explicitly.

- 4b5d6a9: The Markdown component no longer crashes the editor when its node's value isn't a string. react-markdown throws on non-string children, and a value-type-agnostic condition (e.g. matching by key) could feed it one — switching a matched node's type to number and committing took down the whole tree. Non-string values now render via their string representation.
- 14c4eda: Standardize publish workflows across all three packages (tooling-only).

  - **Core** now publishes from a self-contained `build_package/` staging directory (set via `publishConfig.directory`). Replaces the fragile `prepublishOnly` swap-and-restore dance; a failed publish can no longer leave the repo with a half-swapped README.
  - **Short-README link rewriting** in `scripts/build_npm_readme.py` now handles relative file links (e.g. `[migration-guide.md](migration-guide.md)`) in addition to anchor links, so npm-page links render correctly.
  - **Sub-packages** gain a `prepack: pnpm build` guard so `pnpm pack` / `pnpm publish` always ship a fresh build, and a `preview-publish` script that produces an inspectable `.tgz`.
  - **Sub-package builds** now clean up `build/dts/` intermediate output, so the published tarballs no longer include those redundant declaration files.

  Published runtime behaviour is unchanged.

- Updated dependencies [6b76705]
- Updated dependencies [de1cd5d]
- Updated dependencies [c846bc0]
- Updated dependencies [556b1cf]
- Updated dependencies [99ed120]
- Updated dependencies [b844e0f]
- Updated dependencies [94e5598]
- Updated dependencies [ae66784]
- Updated dependencies [13f5950]
- Updated dependencies [b82f8db]
- Updated dependencies [ffb32b3]
- Updated dependencies [7cb6ba7]
- Updated dependencies [a0872b5]
- Updated dependencies [1ac80d0]
- Updated dependencies [556b1cf]
- Updated dependencies [ee583bc]
- Updated dependencies [fc23b40]
- Updated dependencies [1cb7dc7]
- Updated dependencies [5ae18cb]
- Updated dependencies [03f6060]
- Updated dependencies [7cb6ba7]
- Updated dependencies [2c937a0]
- Updated dependencies [fca0b35]
- Updated dependencies [fca0b35]
- Updated dependencies [2cfdeae]
- Updated dependencies [ceb8dd9]
- Updated dependencies [b26c2cd]
- Updated dependencies [941a1cd]
- Updated dependencies [a20da5f]
- Updated dependencies [a186a61]
- Updated dependencies [2cfdeae]
- Updated dependencies [355b7f8]
- Updated dependencies [4b3576c]
- Updated dependencies [ece6d70]
- Updated dependencies [14c4eda]
- Updated dependencies [a0872b5]
- Updated dependencies [de1cd5d]
- Updated dependencies [f9458fc]
- Updated dependencies [a186a61]
- Updated dependencies [7cb6ba7]
- Updated dependencies [ece6d70]
  - json-edit-react@2.0.0
