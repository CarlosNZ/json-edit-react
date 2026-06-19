<!--
DRAFT for review — a proposed rewrite of the messy back half of the
"Custom Nodes & Components" section (from the `condition` + `component`
prose onward). The part above it in the README — the intro, the pre-built
component usage, and the definition-object code block — is unchanged; this
picks up right after that code block.

Reorg principle: one simple on-ramp, then progressive disclosure. Each
capability appears exactly once, in the order you'd reach for it. The
slot model (key vs. value) is introduced once, early, as the backbone
the rest hangs off.
-->

A definition has two essential parts: a **`condition`** that decides _which_ nodes it applies to, and a **`component`** that decides _what renders_ in their place. `condition` is just a [Filter function](#filter-functions) — it receives the standard `nodeData` (`key`, `path`, `value`, etc.) and returns a boolean. Every node in the tree is tested against each definition in turn, and the **first** one whose condition matches wins, so order your `customNodeDefinitions` array by priority.

That's the whole model. Everything below is optional depth you add only when you need it.

### The two slots: key and value

Every node is rendered as a **key** (the property label) and a **value** (everything to the right of it). A definition can target either slot, independently:

- **`component`** replaces the **value** — the common case (an image, a date picker, a colour swatch).
- **`keyComponent`** replaces the **key** — a styled, annotated, or interactive label.
- Provide **both** to own the entire row.

Reach for the specific slot you want before reaching for a whole-node override: `showKey: false` lets one `component` render the whole row, but it's an escape hatch for tightly-coupled composites that genuinely can't be split — and it gives up the standard key-editing UX.

Collection (object/array) nodes use these same two slots, plus a couple of collection-only options — see [Collection nodes](#collection-nodes) below.

### What your component receives

Your `component` gets all the props a built-in node gets, plus a few extras — see [`BaseNodeProps`](https://github.com/CarlosNZ/json-edit-react/blob/main/src/types.ts) (common to every node) and [`CustomComponentProps`](https://github.com/CarlosNZ/json-edit-react/blob/main/src/types.ts). The ones you'll use most:

- **`value`** — the node's current value.
- **`setValue(newValue)`** — commit a change from inside your component.
- **`nodeData`** — the full [node data](#filter-functions) (`key`, `path`, `parentData`, …).
- **`componentProps`** — the custom props your component receives — your own config, like props you'd pass to any React component — regardless of whether it sits in the `component` or `keyComponent` slot.
- **`isPending`** — `true` while this node's optimistic edit is still settling (an async `onUpdate` hasn't resolved yet) — drive a spinner or overlay off it.

A worked example with both standard and custom props is the [Date Picker component](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/src/DatePicker/component.tsx) in `@json-edit-react/components`.

### Display vs. edit modes

By default a custom component is a **display** component: it renders in the viewer, and editing falls back to the standard interface. Three flags change that:

- **`showOnView`** (default `true`) — render in view mode.
- **`showOnEdit`** (default `false`) — render in edit mode too. Set this for a component that _is_ its own editor (a date picker, a colour picker).
- **`showEditTools`** (default `true`) — show the copy / add / edit / delete icons on hover. Disable them only if your component supplies its own way to enter edit mode.

### Editing a non-plain value — `fromStandardType`

If your component edits a value whose committed form isn't the raw text in the edit buffer — say the buffer holds digits but the value is a `BigInt` — define **`fromStandardType: (value, nodeData, componentProps) => value`**, the inverse of `toStandardType`: it takes a standard-typed value and returns your custom one. It fires at two moments — when an edit is **confirmed** (the input is the edit buffer; the ✓ button, <kbd>Enter</kbd>, <kbd>Tab</kbd>, `editorRef.confirm()`) and when a **type switch seeds** your component (the input is the node's current value, demoted to a standard type first). Pass already-correct values through unchanged.

`throw` to signal an unconvertible value. On a **confirm** that rejects the edit — nothing commits, the editor stays open with the user's text intact, and the message shows inline and fires `onError` (the same as confirming invalid JSON). On a **type-switch seed** there's nothing to reject yet, so it simply falls back to seeding `defaultValue` (the original stays recoverable with <kbd>Esc</kbd>).

### Letting users create your type

To let users turn a node _into_ your custom type from the Type selector, set **`showInTypeSelector: true`** and provide:

- **`name`** — the label shown in the selector.
- **`defaultValue`** — the value inserted when the type is chosen. It must satisfy your `condition` (so the new node immediately renders as your component).

By default, choosing the type commits `defaultValue` and closes the editor. For types the user will almost always want to edit straight away (date, colour, BigInt), set **`editOnTypeSwitch: true`** (requires `component` + `showOnEdit`): the edit buffer is seeded by your `fromStandardType` (so a string→Symbol switch carries the string into the description), falling back to `defaultValue`; your component opens in its edit state, one commit happens on confirm, and <kbd>Esc</kbd> cancels the whole switch.

### Customising the key — `keyComponent`

A `keyComponent` replaces the property label. The key difference from a value `component`: a value component can host its own editor (`showOnEdit` + `setValue`), but a `keyComponent` renders in **view mode only** — so it handles editing by _delegating_ back to the standard key input through a few handles, rather than rendering its own editor (which it never needs — a key is only ever a string or number).

The props you'll reach for ([`CustomKeyProps`](https://github.com/CarlosNZ/json-edit-react/blob/main/src/types.ts) has the full set):

- **`name`** — the key as _displayed_ (array indices already offset by `arrayIndexStart`, empty keys already substituted with the `emptyStringKey` placeholder). For the raw key, use `nodeData.key`.
- **`nodeData`** — the full [node data](#filter-functions).
- **`componentProps`** — the same config object passed to `component`.

And, since the component itself is view-only, three handles to let the user **rename** the key:

- **`canEditKey`** — whether key editing is permitted (gates the two below).
- **`startEditingKey()`** — hand off to the standard key input.
- **`handleEditKey(newKey)`** — commit a new key programmatically.

Plus a handful of layout/interaction extras — `styles` / `getStyles` (theme styles; spread `...styles` to keep column alignment), `handleClick` (forward it for default behaviour like collapse-on-header-click), and `path` — see [`CustomKeyProps`](https://github.com/CarlosNZ/json-edit-react/blob/main/src/types.ts) for the full list.

`keyComponent` works **identically on value and collection nodes**, so one definition can, say, give every underscore-prefixed key a lock icon whether its value is a primitive or a nested object. The same definition can combine `keyComponent` and `component` to own a row end-to-end.

> [!WARNING]
> The colon after the key is **not** rendered for you — your component owns the entire key slot. And `showKey: false` suppresses the key slot completely, including any `keyComponent`.

See the [Custom Keys data set](https://carlosnz.github.io/json-edit-react/?data=customKeys) in the demo for short reference implementations (classified-field markers, redacted keys, priority badges, and a definition that uses both slots together).

### Decorating the default node — `passOriginalNode`

Sometimes you don't want to _replace_ a node, just add to it. Set **`passOriginalNode: true`** and your component also receives **`originalNode`** and **`originalNodeKey`** — the value and key exactly as the library would have rendered them. Render those plus your decoration (a badge, a marker, a highlight) for a "default node, with extra" effect. The [`ErrorIndicator`](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/README.md) component works this way. (You may need a little CSS to line your wrapper up with the default layout.)

### Collection nodes

Object and array nodes use the same two slots as value nodes, plus options for the parts a value node doesn't have. The full mapping across both: 

| Slot             | Value node                     | Collection node                                                          |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Key              | `keyComponent`                 | `keyComponent` (brackets, chevron, count, collapse all preserved)        |
| Value / contents | `component`                    | `component` (renders **between** the brackets)                           |
| Whole node       | `component` + `showKey: false` | `wrapperComponent` (+ `wrapperProps`), or `showCollectionWrapper: false` |

The collection-specific details:

- When your `component` takes over the **contents**, the normal descendants are handed to you as React [`children`](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children) — rendering them is now your job.
- `wrapperComponent` wraps the collection from the **outside**: the entire collection node — brackets, chevron, count, and its contents (including any custom `component`) — arrives as your wrapper's `children`, so you render `{children}` where the collection should sit. The wrapper is optional — a `component` on its own renders inside the default brackets. Below, both slots are on the **same** node: the **blue** border is the `wrapperComponent`, and the **red** is its `component` rendering the contents — nested inside, since the `component` is part of what the wrapper gets as `children` (note the key and brackets sit inside blue but outside red):

  <img width="450" alt="custom node levels" src="image/custom_component_levels.png">

- `showCollectionWrapper: false` is the full-replacement escape hatch — no chevron, brackets, or built-in collapse, so you supply your own show/hide. Prefer the slots above for most needs.

#### Displaying a collection as a value

For a specialised object you'd rather treat as a single value — a JavaScript [`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date), say — set **`renderCollectionAsValue: true`**. The whole object is passed to your `component` as one value instead of being expanded into key/value rows; your component is responsible for handling it. The [`DateObject`](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components/src/DateObject) and [`EnhancedLink`](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components/src/EnhancedLink) components in `@json-edit-react/components` both do this.

### Editing as JSON — `stringifyReplacer` / `parseReviver`

If your node holds a non-JSON value (`BigInt`, `Date`, `Symbol`, …), editing the document as raw JSON text would lose it to the default `JSON.stringify` / `JSON.parse`. Supply a [**replacer**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#replacer) and [**reviver**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#the_reviver_parameter) to serialize and restore it however you like.

This is separate from [`fromStandardType`](#editing-a-non-plain-value--fromstandardtype): that handles the inline **edit buffer** (field editing and type-switching), whereas this handles **JSON text**. A non-JSON type like `BigInt` typically needs both.

The [`BigInt`](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/src/BigInt/definition.ts) component, for example, round-trips through:

```json
{
  "__type": "BigInt",
  "value": 1234567890123456789012345678901234567890
}
```
