# json-edit-react

## 2.0.0-beta.8

- A **synchronous** `onUpdate` rejection (`false`, `{ error }`, or a thrown error) now resolves in place rather than applying optimistically and then reverting. The rejected value is never written through `setData`, so it no longer flashes in the editor and leaves nothing transient for downstream state (an undo history, autosave, a dirty flag) to pick up. Asynchronous rejections are unchanged — they still commit optimistically and revert when the promise settles (#391).
- As a result, the `onEditEvent` lifecycle for a synchronously-rejected edit / rename / add is now `submit* → cancel* → updateError` (no `commit*`), matching how the instant operations (delete, move) already report a fast rejection.

## 2.0.0-beta.7

- A custom node definition's `defaultValue` can now be a function `(nodeData) => value`, called each time a node is switched to that type — the same callback form the editor-level `defaultValue` prop already supports. Use it for a fresh value (e.g. `() => new Date()`) instead of one fixed when the module loads. Plain values keep working unchanged.

## 2.0.0-beta.6

- Renaming a property key now requires `allowDelete` on the node and `allowAdd` on its **parent** collection — no longer the node's own `allowAdd`, and `allowEdit` no longer applies; consistent with how a drag relocate is gated (#374). See the [migration guide](migration-guide.md#5-restrict-props-renamed-to-allow-semantics-inverted).

## 2.0.0-beta.5

- Drag-and-drop now respects the `allow*` permissions consistently: reordering within a collection needs its `allowEdit`, while relocating into a different collection needs `allowDelete` on the source **and** `allowAdd` on the destination. Picking a node up needs only `allowDrag` (no longer `allowDelete` too). See the [migration guide](migration-guide.md#5-restrict-props-renamed-to-allow-semantics-inverted).

## 2.0.0-beta.4

- Collection custom components with `showOnEdit` now receive live child rows while editing (#384).
- Restore the `collectionInner` themeable element (#383).

## 2.0.0-beta.0

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

- de1cd5d: The clickable icon controls — the ✓ / ✗ confirm/cancel pair and the edit/copy/delete/add icons — are now real `<button>` elements instead of `<div onClick>`, so assistive tech announces them as actionable and reads an `aria-label` (always present, independent of `showIconTooltips`). Their appearance is unchanged (the default button chrome is reset in the bundled CSS) and they carry `tabIndex={-1}`, so the editor's field-to-field Tab navigation is unaffected. Two new localisation keys (`TOOLTIP_OK`, `TOOLTIP_CANCEL`) provide the confirm/cancel labels.

  Breaking only for custom CSS that targets these controls by tag name: a selector like `.jer-confirm-buttons > div` must become `.jer-confirm-buttons > button`. Wrapper-class and icon selectors are unaffected, and consumer-supplied `customButtons` remain `<div>`-wrapped.

- b844e0f: The `collapse` prop now defaults to `3` (previously `false`). The tree opens with its top three levels of nesting expanded and deeper nodes collapsed, so deeply-nested data no longer renders its full depth on first paint. Data that's three levels or shallower is unaffected (still fully expanded). To restore the always-fully-open behaviour, pass `collapse={false}`.
- 13f5950: Fix type-switching away from a custom node mid-edit leaving an inconsistent editing UI (#335).

  Switching a custom node's type to a standard one now behaves like any other deferred primitive type change: the custom component yields to the target type's standard editor, pre-filled with a conversion of the node's actual value, and the single commit happens on confirm. Previously the custom component kept rendering over the editor while the buffer was silently replaced with the `DEFAULT_STRING` placeholder (`'New data!'`), which confirm then committed verbatim.

  Conversions are also safe for non-JSON sources: `null`/`undefined` → `string` yields an empty buffer (not the literal `"null"`/`"undefined"`), a `Symbol` converts to its description for `string` and to `0` for `number` (where it previously threw), and `NaN` → `number` yields `0`.

  **Breaking:** the `DEFAULT_STRING` localisation key is removed — the placeholder it supplied no longer exists. Remove it from your `translations` object if present.

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

- 1ac80d0: Fine-grained editing re-renders + React 18 requirement.

  - **Breaking**: the React peer dependency is now `>=18.0.0` (was `>=16.0.0`). v2 uses React's built-in `useSyncExternalStore`.
  - Editing state moved to a selectable external store. Previously every node subscribed to a single editing context, so starting/moving an edit re-rendered the whole tree. Each node now subscribes only to its own editing slice, so moving an edit between nodes re-renders just the nodes involved — a large win on big documents. No public API or behaviour change.
  - Drag-while-editing is now blocked at drag-start (reading editing state imperatively) rather than by disabling `draggable` on every node, so starting/ending an edit no longer re-renders all draggable nodes.

- 556b1cf: Replace the `externalTriggers` prop with an imperative `editorRef` handle (#251).

  The `externalTriggers` state-as-RPC prop is removed, along with the `ExternalTriggers` and `EditState` types. Imperative control now goes through a typed ref handle attached via a new `editorRef` prop. The handle is **UI-interactions only** — it opens/commits/cancels a value-edit session or collapses nodes; it has no data mutators (you own `data`/`setData`, so mutating data is just `setData(newData)`):

  ```ts
  const editorRef = useRef<JsonEditorHandle>(null)
  // ...
  <JsonEditor data={data} setData={setData} editorRef={editorRef} />

  editorRef.current.collapse({ path, collapsed, includeChildren })
  editorRef.current.startEdit({ path })                             // open the value editor
  editorRef.current.startEdit({ path, overrideRestrictions: true }) // bypass restrictEdit
  editorRef.current.confirm()                                       // commit the open session
  editorRef.current.cancel()                                        // discard it
  ```

  `editorRef` is a plain ref-valued prop (not the `ref` attribute), so `JsonEditor<T>` stays generic with full type inference. `startEdit` is synchronous and returns a `StartEditResult` — `true` if it opened the session, else `'PATH_NOT_FOUND'` (the path is gone) or `'RESTRICTED'` (`restrictEdit` blocks it). It respects `restrictEdit` by default (evaluated at call time); pass `overrideRestrictions: true` to bypass it (skips only the filter — your `onUpdate` still runs at `confirm()`). `confirm()` commits the open session through `onUpdate` (the same path as clicking the editor's confirm button); `cancel()` discards it. `startEdit` auto-reveals a target collapsed below the current view. `JsonViewer` accepts `editorRef` too, but its `JsonViewerHandle` is collapse-only. Adds the `JsonEditorHandle`, `JsonViewerHandle`, `StartEditOptions`, and `StartEditResult` types to the public API, and exports the `splitPropertyString` path-parsing helper (companion to `toPathString`) for building handle paths.

  Imperative session openers for **key-rename** and **add** (`startRename` / `startAdd`) and an awaitable `confirm()` returning a `CommandResult` were prototyped during the §17 API work but deferred to a later 2.x release (they were the largest removable slice of the §17 bundle growth); the rename/add session _events_ still fire via `onEditEvent` for UI-driven sessions.

- 2c937a0: `JsonEditor` is now generic on the data type.

  - `JsonEditor<T = JsonData>` — consumers can preserve their data shape across the component boundary: `<JsonEditor<MyShape> data={...} setData={...} />`.
  - The generic flows through `data`, `setData`, and the root data slots of `UpdateFunction`, `OnChangeFunction`, `OnErrorFunction`, plus `NodeData.fullData` inside every `FilterFunction` variant.
  - Default of `JsonData` keeps existing untyped code source-compatible. Per-node `value` and `parentData` slots stay wide (they are arbitrary-depth slices, no static type can describe them).
  - **Breaking (json-edit-react v2)** only because the emitted `.d.ts` signatures change. Runtime behaviour is unchanged.

  See the [migration guide](../migration-guide.md#3-jsoneditor-is-now-generic-on-the-data-type) for details and examples.

- fca0b35: Split custom components into a separate publishable package.

  - New package: `@json-edit-react/components` ships 12 ready-to-use custom node components: `Hyperlink`, `EnhancedLink`, `DatePicker`, `DateObject`, `ColorPicker`, `Markdown`, `Image`, `BooleanToggle`, `BigInt`, `NaN`, `Symbol`, `Undefined`. Heavy third-party libraries (`react-datepicker`, `react-markdown`, `react-colorful`) are bundled as regular dependencies but loaded lazily at runtime via `React.lazy`, so unused components contribute zero to the consumer's bundle.
  - **Breaking (json-edit-react v2)**: the old `LinkCustomComponent` and `LinkCustomNodeDefinition` are no longer exported from `json-edit-react`. Replaced by `LinkCustomComponent` + the `hyperlinkDefinition` definition factory (functionally a superset, with configurable `componentProps`) from `@json-edit-react/components`. Migration: `import { hyperlinkDefinition } from '@json-edit-react/components'` and pass `hyperlinkDefinition()` to `customNodeDefinitions`.
  - The `custom-component-library` workspace is now a downstream consumer of `@json-edit-react/components` — its `components/` folder moved into the new package; its app imports from `@json-edit-react/components` like any other consumer would.

- fca0b35: Split themes into a separate publishable package.

  - New package: `@json-edit-react/themes` ships the six pre-built themes (`githubDarkTheme`, `githubLightTheme`, `monoDarkTheme`, `monoLightTheme`, `candyWrapperTheme`, `psychedelicTheme`).
  - **Breaking (json-edit-react v2)**: these theme exports are no longer re-exported from `json-edit-react`. Consumers must `import { ... } from '@json-edit-react/themes'`.
  - Also promoted as public API in core (additive, non-breaking among the v2 changes): `AutogrowTextArea` (joins existing `StringDisplay`, `StringEdit`, `toPathString`).

- ceb8dd9: Split the `onUpdate` override return into node-level `{ value }` and whole-document `{ data }`.

  Returning `{ value: X }` now replaces the **edited node's** value (applied at its path), not the whole document — the common case of tidying what the user just entered (lower-case, round, trim, sort _this_ array). It is honoured for `edit` and `add`; for `rename` / `move` / `delete` it has no target value and is ignored. To replace the **whole document** (stamp a top-level field, sort siblings, canonicalise the structure), return the new key `{ data: X }`, which works on every event.

  **Breaking.** Previously `{ value: X }` replaced the whole document. Any `onUpdate` relying on that — including whole-document timestamp/sort transforms — must switch to `{ data: X }`. Returning both keys is a mistake: `{ data }` wins, `{ value }` is ignored, and a console warning is emitted. See the [migration guide](https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md) (§9).

- b26c2cd: Reworked the editing/commit lifecycle to be **optimistic by default**, with an optional synchronous **gate**, and renamed/extended the `onEditEvent` stream.

  **Optimistic commits.** When the user submits an edit, the editor now closes and the data updates immediately; the consumer's `onUpdate` runs in the background, and a rejection (`false` / `{ error }` / a thrown error / a rejected promise) automatically reverts the change and surfaces the error. A slow `onUpdate` (e.g. a remote save) no longer blocks the editor. Each in-flight commit is tracked with its own token, so a late failure reverts only its own node and can't clobber a newer edit.

  **Gating via `hold()`.** `onUpdate` receives a second argument, `{ hold }`. Calling `hold()` (synchronously, before the first `await`) keeps the editor open and blocks the rest of the tree until the returned `release()` is called — the path for confirmation dialogs or pre-commit validation. Without it, commits stay optimistic.

  **`onEditEvent` lifecycle.** The committed-phase events are renamed `confirm*` → `commit*` (`commitEdit` / `commitRename` / `commitAdd`); a new `submit*` event fires when the user commits (the window a `hold()` gate runs in); and `updateSuccess` / `updateError` report the background settlement of any committed change whose `onUpdate` ran. A session is now `start* → [submit*] → commit*`, or `start* → cancel*`. A no-op confirm reports `commitEdit` (not `cancelEdit`).

  See the [migration guide](https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md) (§9, §10) for details.

- 941a1cd: Path identity is now `CollectionKey[]` everywhere instead of a dot-joined string.

  - The internal editing-state, drag-source, and `areChildrenBeingEdited` checks all compare arrays directly, fixing two classes of bug at once:
    - Keys containing `.` no longer collide with deeper paths (e.g. `['foo.bar', 'baz']` is now distinguishable from `['foo', 'bar', 'baz']`).
    - The "is a descendant" check is a proper array prefix, not a string substring — so editing `foobar` no longer claims `foo`'s children are editing, and dragging `foo` no longer hides the drop highlight on `foobar`.
  - `toPathString` is still exported, but its encoding changes to `/`-joined `encodeURIComponent` (e.g. `['data', 0, 'name']` → `'data/0/name'`). The result is now provably injective. The optional second `key?: 'key_'` argument is removed — the new identity model encodes value-vs-key mode as a field, not a string prefix. **If you only use `toPathString`'s output as an HTML `name`/`id`, no code change is needed.**

  See the [migration guide](../migration-guide.md#5-topathstring-encoding-changed) for details.

- a186a61: Theme `styles` gains two row-level themeable elements — `headerRow` (a collection's header line) and `valueRow` (a leaf value's row) — so row height, background, and the like can be themed (e.g. `headerRow: { minHeight: '2em' }`). The `collectionInner` element is removed: its only distinct use — styling the children body apart from the header — is now covered by `headerRow` + `collection`. `collection`, `collectionElement`, and `dropZone` are unchanged.
- 355b7f8: `JsonEditor` is now strictly controlled. `setData` is required, the controlled/uncontrolled dual mode is gone, and the `viewOnly` shorthand is removed. A new sibling export `JsonViewer` is the canonical read-only entry point.

  - `<JsonEditor>` requires `setData` — forgetting it is now a TypeScript error rather than a silent "edits don't propagate" footgun.
  - `<JsonViewer>` (new) wraps `JsonEditor` with all edit affordances locked off. Accepts the same display, theming, keyboard, search, collapse, custom-node, and localisation props but omits `setData`, the update callbacks, the edit-permission props, and `externalTriggers`.
  - `viewOnly` prop is removed. For static read-only displays, use `<JsonViewer>`. For dynamic permissions-style toggling on the same mounted component, use `allowEdit={cond}` + `allowAdd={cond}` + `allowDelete={cond}` (and `allowDrag={cond}` if you'd previously enabled drag-and-drop; otherwise the default is already `false`/off).
  - The internal `useData` hook is deleted — `JsonEditor` now reads `data` and `setData` from props directly.

  See the [migration guide](../migration-guide.md#6-setdata-is-required-viewonly-removed-jsonviewer-added) for migration recipes.

- ece6d70: Replace the v1 `enableClipboard` prop with `showClipboardButton` (boolean, default `true`) plus the separate `onCopy` observer.

  `enableClipboard` did two unrelated jobs through a `boolean | CopyFunction` overload: toggling the copy button and observing copies. These are now two single-purpose props. `showClipboardButton` is a plain display toggle — it sits in the `show*` family (`showArrayIndexes`, `showStringQuotes`, …), not the `allow*` capability gates, because hiding the copy button can't actually prevent copying (the value is selectable in the DOM); it only controls whether the convenience button renders. The copy callback moves to `onCopy?: OnCopyFunction`, which receives the same flat `NodeData` payload every other observer gets, and `CopyFunction` is removed in favour of `OnCopyFunction`. See the [migration guide](../migration-guide.md#6-enableclipboard-split-into-showclipboardbutton--oncopy).

- f9458fc: Rework the theming engine: compose multiple style functions and tidy the theme types. The common cases — passing colours, style objects, arrays, and style functions via the `theme` prop — are unchanged.

  **Style functions compose.** When an element's value is an array with more than one style function, all of them now run and merge (later wins per property) — matching what the docs always described. Previously only the last function in the array took effect. Functions are still applied after static styles.

  **Types.** `ThemeStyles` is now `Partial<Record<ThemeableElement, …>>` — inherently optional per key. The compiled style map is partial too, but `getStyles` fills any gap with `{}`, so its public return contract is unchanged.

  Internally the compile step is now a single pure pass with no behaviour change for existing themes. See the [migration guide](../migration-guide.md#14-theming-partial-themestyles-and-function-composition).

- a186a61: Themes now own their icon glyphs. The standalone `icons` prop is removed; supply glyphs via `theme.icons` (keyed `add`/`edit`/`delete`/`copy`/`ok`/`cancel`/`collection`), where each value is an `IconDefinition` (`content` plus optional `viewBox`/`svgProps`/`scale`). User-supplied glyphs are themeable via `currentColor`, just like the built-ins. The expand/collapse key is renamed `chevron` → `collection`. The `IconAdd`…`IconChevron` components, `IconProps`, and `IconReplacements` are no longer exported (the built-in glyphs now live on `defaultTheme.icons`); `IconDefinition`, `ThemeIcons`, and `IconSvg` (the glyph renderer — pass an `IconDefinition`'s parts) are added.

### Minor Changes

- 94e5598: Opening an edit on another node now **commits** the in-progress edit instead of cancelling it, matching Tab.

  Previously, clicking another node's edit control (its pencil, double-clicking another value, or clicking another key to rename) while an edit was open silently discarded the in-progress buffer and fired `cancelEdit`/`cancelRename`. Tab already committed-then-moved, so the two "leave this field and go edit elsewhere" gestures behaved oppositely. Now a displace behaves like Tab: a changed edit commits (and `onUpdate` runs), an unchanged one closes via `commit*` with no `onUpdate`/`setData`, and an edit that can't commit (malformed JSON in a collection edit, a duplicate key in a rename, or a custom component's `fromStandardType` throwing) **blocks** the switch — the editor stays open with its inline error, and Esc / ✗ remain the explicit discard path.

  The one exception is the object **add** session (typing a new key): a displace still cancels it, since you can't Tab out of a new-key edit either.

  This changes the `onEditEvent` stream for a displaced session from `cancel*` to `submit*`/`commit*` (or nothing extra, for a blocked switch). See the [migration guide](https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md).

- ae66784: Expose an `isPending` prop on custom node components (`CustomComponentProps` / `CustomWrapperProps`). It's `true` while a node's optimistic edit is settling — the value is already applied locally but the consumer's async `onUpdate` hasn't resolved yet — and `false` otherwise (including when there's no `onUpdate`, where the commit settles synchronously). Use it to show a saving/pending state, e.g. a spinner or overlay, for the duration of an async update. See the new "Pending overlay" example in the demo.
- ffb32b3: Allow any `keyboardControls` binding to be disabled by setting it to `null`. A disabled binding is no longer intercepted and falls through to its native browser behaviour — e.g. `{ tabForward: null, tabBack: null }` restores normal Tab/Shift-Tab focus traversal instead of moving between editable nodes.
- 7cb6ba7: Add an `editOnTypeSwitch` field to `CustomNodeDefinition` (default `false`; requires `component` + `showOnEdit`): switching to the custom type in the Type selector becomes a local, deferred switch instead of an instant commit — the edit buffer is seeded from the node's current value (via `fromStandardType`, falling back to `defaultValue`), the target definition's component renders in edit state, a single commit happens on confirm, and Esc cancels the whole switch. The new collection mounts expanded when the committed value is an object/array, matching the instant-commit path.
- ee583bc: Add dedicated `ERROR_RENAME` / `ERROR_MOVE` localisation keys and `RENAME_ERROR` / `MOVE_ERROR` error codes for rejected rename/move operations (#308).

  A rejected rename/move (`onUpdate` returning `false`) now surfaces an operation-specific message ("Rename unsuccessful" / "Move unsuccessful") and a matching `onError` code (`RENAME_ERROR` / `MOVE_ERROR`), giving these first-class events full parity with `add`/`delete`. Previously both reused the generic `ERROR_UPDATE` message and `UPDATE_ERROR` code. The two new codes are additive members of the public `JerErrorCode` union.

- fc23b40: Changing a value's type to `object` or `array` now launches the new collection expanded (#217). A level-based `collapse` setting would previously leave the just-created collection collapsed, hiding its contents until manually expanded.
- 1cb7dc7: Export the `CustomButtonDefinition` type from the package entry.

  The `customButtons` prop has always been typed as `CustomButtonDefinition[]`, but the type itself wasn't exported, so TypeScript consumers couldn't import it to annotate their button definitions. It's now part of the public API.

- 5ae18cb: Export the `valueDataTypes` and `collectionDataTypes` constants (the scalar and collection subsets of the already-exported `standardDataTypes`). Useful for restricting `allowTypeSelection` to primitives-only or collections-only.
- 03f6060: Collection counts now reflect the active search filter, displayed as "n of m" (e.g. `"3 of 20 items"`) whenever search is narrowing the visible children. `showCollectionCount` gains a new `'when-collapsed-or-filtered'` literal that surfaces the count on a collection whenever it's collapsed _or_ a search filter is active — this is the new default, so the n-of-m form is visible without users having to collapse the node. Pass `'when-collapsed'` for the previous behaviour, or override `customText.ITEMS_FILTERED` (e.g. returning `${size} items`) to suppress the n-of-m form entirely.

  Internally, the per-node `filterNode` cascade is replaced with a single post-order walk at the editor level (`computeFilterState`) that produces both whole-tree visibility and per-collection visible-child counts in one pass. The new walk is also surfaced to nodes via a new `FilterStateProvider` context slice — `searchText`/`searchFilter` are no longer threaded as per-node props, which strengthens the §16 node memoization.

  Two related bug fixes fall out of the rewrite:

  - An intermediate collection whose key matched the search filter but whose body was empty (or whose descendants weren't path-aware-matched) used to drop out and drag its ancestors with it. The new walk tests every node, including intermediate collections, so the matching node and its ancestors stay visible. This was observable with a custom `searchFilter` that only inspected `key`, and with the built-in `'key'` filter on empty `{}` / `[]` bodies.
  - `index` on the synthesized `childNodeData` a custom `searchFilter` receives is now the position within visible children (matching `buildNodeData` semantics); previously it was inherited from the parent and frequently stale. `size` is now the child's actual collection size; previously it was the path depth.

  The `ITEMS_FILTERED` localisation key (default `'{{visible}} of {{total}} items'`) drives the new display. A `customText.ITEMS_FILTERED` override receives the standard `NodeData` plus a new `visibleSize` field carrying the visible-child count alongside the existing `size` (the total).

  The internal `filterNode` and `filterCollection` helpers are removed — they were never re-exported from the package entry point and aren't user-facing. `matchNode` and `matchNodeKey` are unchanged.

- 7cb6ba7: Add a `fromStandardType` field to `CustomNodeDefinition` — the inverse of `toStandardType`, converting a standard-typed value into the custom type's value. It runs on every confirm of a custom edit (the ✓ button, Enter, Tab, `editorRef.confirm()` — all paths run this single transform, so ✓ no longer commits the raw edit buffer), where throwing rejects the confirm: nothing commits, the edit session stays open with the user's input intact, and the thrown message surfaces via `onError` and the inline error display (the same contract as confirming invalid JSON on a collection edit). The same hook seeds the editor when an `editOnTypeSwitch` switch opens the type for editing — the node's current value carries into the switch instead of being replaced by `defaultValue` (a throw there seeds the value's string form for the user to fix). Value nodes now show their inline error while editing, `editorRef.confirm()` no longer tears down a session whose confirm was rejected, and custom components' `setValue` accepts any `JsonData` so `renderCollectionAsValue` components can buffer object values.
- 4b3576c: Add a standalone stylesheet export for Shadow DOM / manual style injection.

  The base stylesheet is still inlined and injected into the document `<head>` automatically, so the zero-config case is unchanged. It is now _also_ published as a standalone file, importable via the `json-edit-react/style.css` subpath export, for consumers who need to inject the styles themselves — most notably inside a Shadow DOM, where styles injected into the document `<head>` can't cross the shadow boundary. The stylesheet's custom properties are now defined on both `:root` and `:host` so they resolve correctly in either context. Resolves [#225](https://github.com/CarlosNZ/json-edit-react/issues/225).

- 7cb6ba7: Add a `toStandardType` field to `CustomNodeDefinition`: an optional function that converts a custom node's value to a primitive seed when the Type selector switches the node to a standard type. Core's generic coercion handles the rest per target type, and applies unchanged when the definition provides no hook (so e.g. an object-valued custom node without one still seeds `'[object Object]'` on a switch to `string`).

### Patch Changes

- c846bc0: The closing bracket of an expanded object/array now aligns horizontally with the key (the start of the opening line), matching how JSON pretty-printers position a close bracket under the line that opened it. Previously it carried a depth-dependent offset that drifted toward the collapse chevron at the default indent. The alignment is now independent of the `indent` prop (#220).

  Breaking only for custom CSS that positioned the outside closing bracket via `.jer-bracket-outside`: it no longer sets `padding-left`, so any rule that compensated for the old offset should be removed.

- 556b1cf: Stabilise the `onCollapse` callback internally so an inline consumer callback no longer churns the collapse context.

  `CollapseProvider` now keeps `onCollapse` in a ref (mirroring how `EditingProvider` already handles `onEditEvent`) instead of listing it in `setCollapseState`'s dependencies. Previously, passing a fresh `onCollapse` identity each render recreated `setCollapseState` and the collapse context value, re-rendering every node that subscribes to it (every `CollectionNode`) on each parent render. Consumers no longer need to memoise `onCollapse` to avoid that. No API or behaviour change — the callback still fires once per command with the original `CollapseState`.

- 99ed120: Fix collapse broadcasts not cascading past the initial mount frontier (#273).

  With `collapse={N}` and a tree deeper than N, firing a subtree-expand broadcast (e.g. via Opt-click "Open All" or `externalTriggers.collapse`) now reaches every descendant — including levels that hadn't yet mounted at broadcast time. Previously the cascade halted at the original mount frontier.

  Internally, `CollapseProvider` is now state-based with a version counter (replacing the pub-sub broadcast introduced in §4 Part 4). `handleAdd` and `handleChangeDataType` clear the pending broadcast so user-driven new mounts use their default state rather than inheriting a sweeping Collapse-All. No public API change.

- a0872b5: Internal cleanup: remove the now-unused `previouslyEditedElement` / `recordPreviousEdit` and `tabDirection` / `setTabDirection` plumbing from the editing store. These were only ever consumed by the redirect `useLayoutEffect` retired in the previous Tab-viability work; with the redirect gone, the state was write-only and the actions had no readers. `EditingStore` shrinks to `{ open, cancel, submit, areChildrenBeingEdited }` (plus the subscribe/getSnapshot pair). No user-visible change.
- 2cfdeae: Narrowed the `inputHighlight` theme style to a plain colour string. It maps to the editor's text-selection `::selection` highlight, surfaced as a single CSS custom property, so only a static colour is ever meaningful — a style object had only its `backgroundColor` read, and a style function or array did nothing at all. If you previously passed `{ backgroundColor: '…' }`, pass the colour string directly, e.g. `inputHighlight: '#b3d8ff'`.
- a20da5f: Bump the rollup TypeScript `target` from `es6` to `es2020`, shrinking the published bundle by ~0.9 kB gzipped (−4.6%).

  The `react >=18` peer dependency already rules out the legacy browsers that `es6` was downleveling for, so emitting native `async`/`await`, object spread, and rest destructuring drops the tslib downlevel helpers (`__awaiter`, `__rest`, `__spreadArray`, …) entirely — they were ~13% of the pre-minified bundle. No source or behaviour change.

- 2cfdeae: The two theme colours that can't be applied inline — the input-selection highlight and the copy-button glow — are now rendered as CSS custom properties on the editor container instead of being written to the document root. This scopes them per editor instance (separate themes no longer clobber one another's `--jer-highlight-color` / `--jer-icon-copy-color`), makes them reachable inside a shadow root, and applies them during SSR with no post-hydration flash. The `:root, :host` defaults in the bundled stylesheet still cover any un-themed case — including a new `--jer-icon-copy-color` default, so the copy-button pulse keeps its glow even when `iconCopy` is a dynamic style function (which colours the icon per-node but can't collapse to a single container-level value for the pulse).
- 14c4eda: Standardize publish workflows across all three packages (tooling-only).

  - **Core** now publishes from a self-contained `build_package/` staging directory (set via `publishConfig.directory`). Replaces the fragile `prepublishOnly` swap-and-restore dance; a failed publish can no longer leave the repo with a half-swapped README.
  - **Short-README link rewriting** in `scripts/build_npm_readme.py` now handles relative file links (e.g. `[migration-guide.md](migration-guide.md)`) in addition to anchor links, so npm-page links render correctly.
  - **Sub-packages** gain a `prepack: pnpm build` guard so `pnpm pack` / `pnpm publish` always ship a fresh build, and a `preview-publish` script that produces an inspectable `.tgz`.
  - **Sub-package builds** now clean up `build/dts/` intermediate output, so the published tarballs no longer include those redundant declaration files.

  Published runtime behaviour is unchanged.

- a0872b5: Tab navigation now skips filtered-out and non-editable nodes up front instead of opening them and bouncing reactively. The redirect `useLayoutEffect` in `ValueNodeWrapper` that previously fired transient `startEdit` / `cancelEdit` observer events on dead-end nodes is gone — `onEditEvent` consumers no longer see those spurious pairs.

  The change is in `getNextOrPrevious`, which gains an optional 5th `isViable?: (nodeData) => boolean` predicate. `useCommon` composes the predicate from the precomputed `filterState.visiblePaths` Set and the existing `allowEditFilter`, and threads it through. Tab navigation from both value edits and key edits (via `KeyDisplay`) now benefits.

  Behaviour change worth noting: when no viable Tab target exists, the editor cancels cleanly. The previous "fall back to `previouslyEditedElement`" hop is gone.

  When live search hides the actively-edited node, the input now unmounts cleanly and the editing record sits inactive in the store; clearing the search later resumes the edit. No off-screen commit footgun because there's no input element to commit through.

- de1cd5d: Harden the text-editing fields against host-app CSS. The string and raw-JSON editors now pin `box-sizing` and an explicit `line-height` instead of leaving them to inherit, so a consuming app's global reset (e.g. `* { box-sizing: border-box }`) or an element-level `textarea` / `input` rule can no longer distort their layout or text wrapping. This also keeps the auto-growing textarea's hidden measuring element locked to the real `<textarea>`, fixing a latent case where the raw-JSON editor could mis-measure its height even with no host reset present.

  The pinned `box-sizing` is `content-box` (the model the editor was designed against), so it's a no-op for consumers without a global reset. The raw-JSON editor's line spacing is now set explicitly and may shift very slightly.

- ece6d70: Fix `CustomNodeDefinition`'s `U` generic so it binds `wrapperProps`, not just `wrapperComponent`. The generic exists to keep a `wrapperComponent` and the `wrapperProps` config object it receives in sync, but `wrapperProps` was typed `Record<string, unknown>`, so a mismatch between the two went uncaught at compile time. It's now `wrapperProps?: U`, mirroring how `componentProps?: T` already binds the value-component generic. Default (un-parameterized) usage is unchanged, since `U` defaults to `Record<string, unknown>`.
