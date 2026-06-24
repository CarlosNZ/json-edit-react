# json-edit-react

<!-- NPM INTRO -->

<img width="60" alt="screenshot" src="image/logo192.png" style="float:left; margin-right: 1em;">

A highly-configurable [React](https://github.com/facebook/react) component for editing or viewing JSON/object data


## 🚀️ [Explore the Demo](https://carlosnz.github.io/json-edit-react-v2/) <!-- omit in toc -->

![NPM Version](https://img.shields.io/npm/v/json-edit-react)
![GitHub License](https://img.shields.io/github/license/carlosnz/json-edit-react)
![NPM Downloads](https://img.shields.io/npm/dm/json-edit-react)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/CarlosNZ/json-edit-react)
[![Discuss on GitHub](https://img.shields.io/badge/Discussions-Join%20the%20conversation-blue?logo=github)](https://github.com/CarlosNZ/json-edit-react/discussions)
[![Sponsor](https://img.shields.io/badge/Sponsor-♥-pink.svg)](https://github.com/sponsors/CarlosNZ)


### Features include:

 - ✅ **Easy inline editing** of individual values or whole blocks of JSON text 
 - 🔒 **Granular control** – restrict edits, deletions, or additions per element
 - 📏 **[JSON Schema](https://json-schema.org/) validation** (using 3rd-party validation library)
 - 🎨 **Customisable UI** — built-in or custom [themes](#appearance--theming), CSS overrides or targeted classes
 - 📦 **Self-contained** — plain HTML/CSS, no external UI library dependencies, and *zero runtime dependencies*
 - 🔍 **Search & filter** — find data by key, value or custom function
 - 🚧 **[Custom components](#custom-nodes--components)** — replace keys and/or values with specialised components (e.g. date picker, links, images, `undefined`, `BigInt`, `Symbol`)
 - 🌏 **[Localisation](#localisation)** — easily translate UI labels and messages
 - 🔄 **[Drag-n-drop](#drag-and-drop-reordering)** re-ordering within objects/arrays
 - 🎹 **[Keyboard customisation](#keyboard-control)** — define your own key bindings
 - 🎮 **[External control](#programmatic-control)** via callbacks and imperative methods

💡 Try the **[Live Demo](https://carlosnz.github.io/json-edit-react-v2/)** to see these features in action!

<img width="392" alt="screenshot" src="image/screenshot.png">

## Optional Companion Packages  <!-- omit in toc -->

- **THEMES**: [@json-edit-react/themes](https://www.npmjs.com/package/@json-edit-react/themes) — curated, ready-made [themes] (#themes)
- **COMPONENTS**: [@json-edit-react/components](https://www.npmjs.com/package/@json-edit-react/components) - custom node components (links, date picker, etc.)
- **UTILITIES**: [@json-edit-react/themes](https://www.npmjs.com/package/@json-edit-react/themes) — a collection of helpers and tools for enhancing json-edit-react

> [!IMPORTANT]
> This documentation is for V2 of **json-edit-react**, which is currently in beta. V1 docs are [here](https://github.com/CarlosNZ/json-edit-react).
> 
> If you're upgrading from V1, be sure to read the [migration guide](https://github.com/CarlosNZ/json-edit-react/blob/main/migration-guide.md).
> 
> 🎤️ Got feedback? [Open an issue](https://github.com/CarlosNZ/json-edit-react/issues), or [join the discussion](https://github.com/CarlosNZ/json-edit-react/discussions/198).

<!-- NPM INTRO -->

----

## Contents  <!-- omit in toc -->
- [Using the editor (for end users)](#using-the-editor-for-end-users)
- [Installation](#installation)
- [Implementation](#implementation)
- [Props Reference](#props-reference)
- [Managing state](#managing-state)
- [Filter Functions](#filter-functions)
- [Controlling editing](#controlling-editing)
- [Reacting to changes](#reacting-to-changes)
- [Appearance \& theming](#appearance--theming)
- [Initial expansion — `collapse`](#initial-expansion--collapse)
- [Search \& filtering](#search--filtering)
- [Localisation](#localisation)
- [Keyboard control](#keyboard-control)
- [Custom Nodes \& Components](#custom-nodes--components)
- [Overriding and extending the UI](#overriding-and-extending-the-ui)
- [Programmatic control](#programmatic-control)
- [Performance considerations](#performance-considerations)
- [Undo functionality](#undo-functionality)
- [Exported helpers \& types](#exported-helpers--types)
- [Issues \& support](#issues--support)
- [Inspiration](#inspiration)
- [Changelog](#changelog)

<!-- NPM USAGE -->

## Using the editor (for end users)

It's pretty self explanatory (click the "edit" icon to edit, etc.), but there are a few not-so-obvious ways of interacting with the editor:

- **Double-click** a value (or a key) to edit it
- When editing a string, use <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>-<kbd>Enter</kbd> or <kbd>Shift</kbd>-<kbd>Enter</kbd> to add a new line (<kbd>Enter</kbd> submits the value)
- It's the opposite when editing a full object/array node (which you do by **clicking "edit"** on an object or array value) — <kbd>Enter</kbd> for new line, and <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>/<kbd>Shift</kbd>-<kbd>Enter</kbd> for submit
- <kbd>Escape</kbd> to **cancel** editing
- Use <kbd>Tab</kbd>/<kbd>Shift-Tab</kbd> to quickly move from one value to another when editing
- When clicking the "**clipboard**" icon, holding down <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> will copy the *path* to the selected node rather than its value
- When opening/closing a node, hold down <kbd>Alt</kbd>/<kbd>Option</kbd> to open/close *all* child nodes at once
- For Number inputs, the <kbd>↑</kbd> / <kbd>↓</kbd> arrow keys will increment/decrement the value
- For Boolean inputs, the <kbd>Space</kbd> bar will toggle the value
- Easily navigate to the next or previous node for editing using the <kbd>Tab</kbd>/<kbd>Shift-Tab</kbd> keys.
- **Drag and drop** items to change the structure or modify display order
- When editing is not permitted, double-clicking a string value will expand the text to the full value if it is truncated due to length (there is also a clickable "..." for long strings)
- **JSON text input** can accept "looser" input, if an additional JSON parsing method is provided (e.g. [JSON5](https://json5.org/)). See `jsonParse` prop.

[Have a play with the Demo app](https://carlosnz.github.io/json-edit-react-v2/) to get a feel for it!

## Installation

```sh
# Depending on your package manager:

npm i json-edit-react
# OR
yarn add json-edit-react
# OR
pnpm add json-edit-react
```

## Implementation

```jsx
import { JsonEditor } from 'json-edit-react'

// In your React component:
return (
  <JsonEditor
    data={ jsonData }
    setData={ setJsonData }
    { ...otherProps } />
);

// For a read-only viewer, use the `JsonViewer` component instead:
import { JsonViewer } from 'json-edit-react'

return <JsonViewer data={ jsonData } { ...otherProps } />
```

<!-- NPM USAGE -->

## Props Reference

`data` and `setData` are the only *required* props. For a read-only component, use [`JsonViewer`](#read-only-display--jsonviewer) instead — its only required prop is `data`.

This is a reference list of *all* possible props, divided into related sections. Most of them provide a link to a section below in which the concepts are explored in more detail.

<details open>
<summary>

### Data Management

</summary>

| Prop                  | Type                    | Default | Description                                                                                                                                                    |
| --------------------- | ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`                | `object\|array`         | -       | The data to be displayed / edited                                                                                                                              |
| `setData`             | `object\|array => void` | -       | Method to update your `data` object. **Required.** See [Managing state](#managing-state) below for additional notes.                                           |
| `onUpdate`            | `UpdateFunction`        | -       | A function to run whenever a value is changed in the editor — edit, add, delete, rename *or* move. See [Update functions](#onupdate--accept-reject-transform). |
| `onChange`            | `OnChangeFunction`      | -       | A function to modify/constrain user input as they type — see [OnChange functions](#onchange--validating-each-keystroke).                                       |
| `onError`             | `OnErrorFunction`       | -       | A function to run whenever the component reports an error — see [OnErrorFunction](#onerror).                                                                   |
| `showClipboardButton` | `boolean`               | `true`  | Show or hide the "Copy to clipboard" button in the UI.                                                                                                         |
| `onCopy`              | `OnCopyFunction`        | -       | A function to run whenever an item is **copied** to the clipboard — see [Copy Function](#oncopy).                                                              |

</details>
<details>
<summary>

### Restricting Editing

</summary>

| Prop                 | Type                                       | Default | Description                                                                                                                                                                                        |
| -------------------- | ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowEdit`          | `boolean\|FilterFunction`                  | `true`  | If `false`, no editing at all is permitted. A callback function can be provided (return `true` to permit a given node) — see [Advanced Editing Control](#filter-functions)                         |
| `allowDelete`        | `boolean\|FilterFunction`                  | `true`  | As with `allowEdit` but for deletion                                                                                                                                                               |
| `allowAdd`           | `boolean\|FilterFunction`                  | `true`  | As with `allowEdit` but for adding new properties                                                                                                                                                  |
| `allowTypeSelection` | `boolean\|TypeOptions\|TypeFilterFunction` | `true`  | Controls which data types the user can select, including [Custom Node](#custom-nodes--components) types, and **Enums** — see [Data Type Restrictions](#restricting-data-types--allowtypeselection) |
| `newKeyOptions`      | `string[] \| NewKeyOptionsFunction`        | -       | New keys can be restricted to certain values — see [New Key Restrictions & Default Values](#new-key-restrictions--default-values)                                                                  |
| `defaultValue`       | `any\|DefaultValueFunction`                | `null`  | Value that new properties are initialised with — see [New Key Restrictions & Default Values](#new-key-restrictions--default-values)                                                                |
| `allowDrag`          | `boolean\|FilterFunction`                  | `false` | Set to `true` to enable drag and drop functionality — see [Drag-n-drop](#drag-and-drop-reordering)                                                                                                 |

</details>

<details>
<summary>

### Look and Feel / UI
</summary>

| Prop                    | Type                                                      | Default                        | Description                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme`                 | `ThemeInput`                                              | `defaultTheme`                 | Either one of the built-in themes (imported separately), or an object specifying some or all theme properties — see [Themes](#appearance--theming).                                                                                                                                                                                                                                                       |
| `showIconTooltips`      | `boolean`                                                 | false                          | Display icon tooltips when hovering.                                                                                                                                                                                                                                                                                                                                                                      |  |
| `indent`                | `number`                                                  | `3`                            | Specify the amount of indentation for each level of nesting in the displayed data.                                                                                                                                                                                                                                                                                                                        |
| `collapse`              | `boolean\|number\|FilterFunction`                         | `3`                            | Defines which depth level of the data tree will be displayed "expanded" in the UI on initial load — see [Collapse](#initial-expansion--collapse).                                                                                                                                                                                                                                                         |
| `collapseAnimationTime` | `number`                                                  | `300`                          | Time (in ms) for the transition animation when collapsing collection nodes.                                                                                                                                                                                                                                                                                                                               |
| `collapseClickZones`    | `Array<"left" \| "header" \| "property">`                 | `["left", "header"]`           | Aside from the <span style="font-size: 140%">`⌄`</span> icon, you can specify other regions of the UI to be clickable for collapsing/opening a collection.                                                                                                                                                                                                                                                |
| `rootName`              | `string`                                                  | `"data"`                       | A name to display in the editor as the root of the data object.                                                                                                                                                                                                                                                                                                                                           |
| `showArrayIndexes`      | `boolean`                                                 | `true`                         | Whether or not to display the index (as a property key) for array elements.                                                                                                                                                                                                                                                                                                                               |
| `arrayIndexStart`       | `0 \| 1`                                                  | `0`                            | The number the *first* array element's index label starts from.                                                                                                                                                                                                                                                                                                                                           |
| `showStringQuotes`      | `boolean`                                                 | `true`                         | Whether or not to display string values in "quotes".                                                                                                                                                                                                                                                                                                                                                      |
| `showCollectionCount`   | `boolean\|"when-collapsed"\|"when-collapsed-or-filtered"` | `"when-collapsed-or-filtered"` | Whether or not to display the number of items in each collection (object or array).                                                                                                                                                                                                                                                                                                                       |
| `stringTruncateLength`  | `number`                                                  | `250`                          | String values longer than this many characters will be displayed truncated (with `...`). The full string will always be visible when editing.                                                                                                                                                                                                                                                             |
| `sortKeys`              | `boolean\|CompareFunction`                                | `false`                        | If `true`, object keys will be ordered (using default JS `.sort()`). A [compare function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) can also be provided to define sorting behaviour, except the input type should be a tuple of the key and the value of a node i.e. `(a: [string \| number, ValueData], b: [string \| number, ValueData]) => number` |
| `minWidth`              | `number\|string` (CSS value)                              | `250`                          | Minimum width for the editor container.                                                                                                                                                                                                                                                                                                                                                                   |
| `maxWidth`              | `number\|string` (CSS value)                              | `600`                          | Maximum width for the editor container.                                                                                                                                                                                                                                                                                                                                                                   |
| `baseFontSize`          | `number\|string` (CSS value)                              | `16px`                         | The "base" font size from which all other sizings are derived (in `em`s). By changing this you will scale the entire component.                                                                                                                                                                                                                                                                           |
| `insertAtTop`           | `boolean\|"object"\|"array"`                              | `false`                        | If `true`, inserts new values at the *top* rather than bottom. Can set the behaviour just for arrays or objects by setting to `"object"` or `"array"` respectively.                                                                                                                                                                                                                                       |
| `errorDisplayTime`      | `number`                                                  | `2500`                         | Time (in ms) to display the error message in the UI.                                                                                                                                                                                                                                                                                                                                                      |  |
| `showErrorMessages`     | `boolean `                                                | `true`                         | Whether or not the component should display its own error messages (you'd probably only want to disable this if you provided your own [`onError` function](#onerror))                                                                                                                                                                                                                                     |
</details>
<details>
<summary>

### Search and Filtering
</summary>

| Prop                 | Type                                          | Default     | Description                                                                                                        |
| -------------------- | --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `searchText`         | `string`                                      | `undefined` | Data visibility will be filtered by matching against value, using the method defined below in `searchFilter`       |
| `searchFilter`       | `"key"\|"value"\|"all"\|SearchFilterFunction` | `undefined` | Define how `searchText` should be matched to filter the visible items — see [Search/Filtering](#search--filtering) |
| `searchDebounceTime` | `number`                                      | `350`       | Debounce time when `searchText` changes                                                                            |

</details>
<details>
<summary>

### Custom components & overrides (incl. Localisation)
</summary>

| Prop                    | Type                                                | Default                                   | Description                                                                                                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customNodeDefinitions` | `CustomNodeDefinition[]`                            |                                           | You can provide custom React components to override specific nodes in the data tree, according to a condition function — see [Custom nodes](#custom-nodes--components) or browse the [@json-edit-react/components](https://www.npmjs.com/package/@json-edit-react/components) |
| `customButtons`         | `CustomButtonDefinition[]`                          | `[]`                                      | You can add your own buttons to the Edit Buttons panel if you'd like to be able to perform a custom operation on the data — see [Custom Buttons](#custom-buttons)                                                                                                             |
| `translations`          | `LocalisedStrings`                                  | `{ }`                                     | UI strings (such as error messages) can be translated by passing an object containing localised string values (there are only a few) — see [Localisation](#localisation)                                                                                                      |
| `customText`            | `CustomTextDefinitions`                             |                                           | In addition to [localising the component](#localisation) text strings, you can also *dynamically* alter them, depending on the data — see [Custom Text](#dynamic-text--customtext)                                                                                            |
| `TextEditor`            | `ReactComponent`<br>&nbsp;&nbsp;`<TextEditorProps>` |                                           | Pass a component to offer a custom text/code editor when editing full JSON object as text. [See details](#replacing-the-textcode-editor--texteditor-codeeditor)                                                                                                               |
| `Select`                | `ReactComponent`<br>&nbsp;&nbsp;`<SelectProps>`     | `<NativeSelect>`                          | Pass a component to replace the built-in native `<select>` (drop-down)                                                                                                                                                                                                        |
| `jsonParse`             | `(input: string) => JsonData`                       | `JSON.parse`                              | Provide an alternative JSON parser (e.g. [JSON5](https://json5.org/)), to allow "looser" text input when editing JSON blocks.                                                                                                                                                 |
| `jsonStringify`         | `(data: JsonData) => string`                        | `(data) => JSON.stringify(data, null, 2)` | Similarly, override the presentation of the text when editing JSON. You can supply different formatting parameters to the native `JSON.stringify()`, or provide a third-party option, like the aforementioned JSON5.                                                          |
| `keyboardControls`      | `KeyboardControls`                                  | As explained [above](#keyboard-control)   | Override some or all of the keyboard controls — see [Keyboard customisation](#keyboard-control)                                                                                                                                                                               |

</details>
<details>
<summary>

### External interaction
</summary>

More detail [below](#programmatic-control)

| Prop          | Type                    | Default | Description                                                                                                                                                                                                                           |
| ------------- | ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onEditEvent` | `OnEditEventFunction`   | -       | Callback for the full edit lifecycle — `start`/`submit`/`commit`/`cancel`, the instant `delete`/`move`, and the background `updateSuccess`/`updateError` settlement — see [Event callbacks](#listening-to-the-lifecycle--oneditevent) |
| `onCollapse`  | `OnCollapseFunction`    | -       | Callback to execute whenever the user collapses or opens a node                                                                                                                                                                       |
| `editorRef`   | `Ref<JsonEditorHandle>` | -       | Imperative handle to collapse/open nodes or start/stop editing. See [Imperative handle](#driving-the-editor--the-editorref-handle)                                                                                                    |

</details>

<details>
<summary>

### Miscellaneous
</summary>

| Prop        | Type     | Default | Description                                                                                                                       |
| ----------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | `string` | -       | Name for the HTML `id` attribute on the main component container.                                                                 |
| `className` | `string` | -       | Name of a CSS class to apply to the overall component. In most cases, specifying `theme` properties will be more straightforward. |
</details>

----

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Managing state

### Controlled component — `data` + `setData`

You manage the `data` state yourself outside this component and pass in a `setData` method, which is called internally to update your `data`. 

### Read-only display — `JsonViewer`

If your use case is read-only — displaying JSON without any editing affordances — import `JsonViewer` instead of `JsonEditor`:

```tsx
import { JsonViewer } from 'json-edit-react'

<JsonViewer data={data} theme={someTheme} />
```

`JsonViewer` is a thin wrapper over `JsonEditor` that locks all edit, add, delete and drag operations off. It accepts the same display, theming, keyboard, search, collapse, localisation and custom-node props, but drops `setData`, the update callbacks (`onUpdate` / `onChange`), and the edit-permission props (`allowEdit` / `allowAdd` / `allowDelete` / `allowDrag` / `allowTypeSelection`) — none of which are meaningful in a read-only context. Its `editorRef` handle (`JsonViewerHandle`) is collapse-only.

If you instead need an editor that *sometimes* locks editing (e.g. based on user permissions), keep using `<JsonEditor>` and toggle the relevant `allow*` props dynamically — `allowEdit={canEdit}` etc.

[![▶ Live example: Read-only viewer](https://img.shields.io/badge/▶_Live_example-Read--only_viewer-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/json-viewer)

### Typed data — `JsonEditor<T>`

`JsonEditor` is generic on the type of its `data` prop, so TypeScript users can preserve their data shape across the component boundary instead of falling back to `unknown`:

```tsx
interface User {
  name: string
  email: string
  roles: string[]
}

const [user, setUser] = useState<User>(initialUser)

<JsonEditor<User>
  data={user}
  setData={setUser}
  onUpdate={({ newData }) => {
    // newData is typed as User
  }}
/>
```

The generic flows through `data`, `setData`, the `onUpdate` / `onChange` / `onError` callbacks (root data slots only — per-node `value` stays `unknown`), and `NodeData.fullData` inside `FilterFunction`s. Defaults to `JsonData` (≈ `unknown`) so untyped consumers don't need to change anything.

> [!TIP]
> `T` describes the data you *provide*. It is an input contract, not a runtime invariant — if the user can freely restructure the JSON, post-edit values may not conform to `T`. Pair with `allowAdd` / `allowDelete` / `allowTypeSelection` to lock the shape, or validate inside `onUpdate` if you depend on it.

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Filter Functions

```jsx
// The powerhouse of the component
(nodeData) => result
```

The dynamic capabilities of the editor are powered by one core concept — the `FilterFunction`. You provide a callback that receives a bunch of metadata about the current node, and it returns a boolean, or value, that determines what happens. Editing, search, styling, conditional rendering all rely on this workhorse structure, so we'll explain the shape of it here so you'll grasp how it's used throughout this doc.

| Type                    | Shape                                 | Drives                                                             | Section                   |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------ | ------------------------- |
| `FilterFunction`        | `(nodeData) => boolean`               | `allowEdit` / `allowDelete` / `allowAdd` / `allowDrag`, `collapse` | Controlling editing       |
| `TypeFilterFunction`    | `(nodeData) => boolean \| DataType[]` | `allowTypeSelection`                                               | Controlling editing       |
| `SearchFilterFunction`  | `(nodeData, searchText) => boolean`   | `searchFilter`                                                     | Search & filtering        |
| `StyleFunction`         | `(nodeData) => CSS \| null`           | `theme` styles                                                     | Appearance & theming      |
| `CustomTextFunction`    | `(nodeData) => string \| null`        | `customText`                                                       | Localisation              |
| `condition`             | `(nodeData) => boolean`               | `customNodeDefinitions`                                            | Custom nodes & components |
| `DefaultValueFunction`  | `(nodeData, newKey?) => value`        | `defaultValue`                                                     | Controlling editing       |
| `NewKeyOptionsFunction` | `(nodeData) => string[] \| null`      | `newKeyOptions`                                                    | Controlling editing       |

The side-effect callbacks (`onUpdate` / `onChange` / `onError` / `onCollapse` / `onCopy` / `onEditEvent`) receive the **same** `NodeData` plus their own extras — see [Reacting to changes](#reacting-to-changes) and [Programmatic control](#programmatic-control).

### The `NodeData` object

So what is this `nodeData` input? It's an object of the following shape:

```tsx
interface NodeData {
    key: CollectionKey          // name of the property (string or number (arrays))
    path: CollectionKey[]       // path to the property (as an array of property keys)
    level: number               // depth of the property (with 0 being the root)
    index: number               // index of the node within its collection (based on display order)
    value: JsonData             // value of the property
    size: number | null         // if a collection (object, array), the number of items
                                //   (null for non-collections)
    visibleSize?: number | null // direct-child count under the current search filter.
                                //   - `number` on collections under an active filter;
                                //   - `null` on render-path nodes when no filter is active
                                //      or this isn't a tracked collection (e.g. a leaf).
                                //   - `undefined` only inside the `searchFilter` callback
                                //       itself (the walk hasn't computed counts yet) or when
                                //       NodeData reaches you via an imperative bridge
                                //       (onCollapse / onEditEvent / the editorRef handle).
                                //        Use `!= null` to gate on "has a real count".
    parentData: object | null   // parent object containing the current node
    fullData: JsonData          // the full (overall) data object
    collapsed?: boolean         // whether or not the current node is in a
                                //   "collapsed" state (only for Collection nodes)
}
```

Let's get into the many ways we can use this...

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Controlling editing

As well as configuring which nodes of can be **edited**, **deleted**, or **added** to, you can also specify:

- the data types (if any) available to each node (including *enums*),
- a restricted set of available keys that can be added to a node,
- default values for specific nodes and data types,
- drag 'n' drop restrictions
- which nodes appear open or closed ("collapsed")

As outlined in the [props list](#restricting-editing) above, most of these props can take either:

- a `boolean` (in which case `true` means the operation is fully permitted, `false` means it's fully disabled)
- a `FilterFunction` callback, which allows edit controls to be defined dynamically

The callback for each type of permission is slightly different, so let's look at each in turn:

### Permissions — `allowEdit` / `allowDelete` / `allowAdd`

These each take a `boolean` value, or a [`FilterFunction`](#filter-functions) callback, which must return a boolean -- if `false` that node will **not** be editable (return `true` to permit it).

[![▶ Live example: Edit restrictions](https://img.shields.io/badge/▶_Live_example-Edit_restrictions-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/edit-restrictions)

> [!NOTE]
> There is no specific permission function for editing object **property names**. Since renaming a property is equivalent to deleting it and adding it back under a new name, a node's key is only editable when it returns `true` for **all three** of `allowEdit`, `allowDelete` *and* `allowAdd` (and the node isn't the root or an array index).


### Restricting data types — `allowTypeSelection`

The `allowTypeSelection` prop can take either a `boolean` (`false` means the data type can **not** be changed at all, `true` means any type is allowed) or a [`TypeFilterFunction`](#filter-functions), or an **array** of available data types. The core types are:

- `"string"`
- `"number"`
- `"boolean"`
- `"null"`
- `"object"`
- `"array"`

The data type array can also specify [Custom Node](#custom-nodes--components) types (as defined in the custom node's `name` prop), as well as **Enum** options (see [Enums](#enums) below).

The `TypeFilterFunction`, while it takes the same input shape as a standard `FilterFunction`, can return *either* a simple `boolean` *or* an `array` of available types.

> [!NOTE]
> If `allowTypeSelection` returns less than two available types for a given node, the "Type Selector" drop-down won't appear for that node.

[![▶ Live example: Type restrictions](https://img.shields.io/badge/▶_Live_example-Type_restrictions-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/type-restrictions)

### Enums

By defining an **Enum** type, you can restrict the available values to a pre-defined list:

<img width="331" alt="Eye colour enum example" src="image/enum_example.png">

To define an Enum, just add an object with the following structure to your "Types" array (either directly in the prop, or returned from the callback):

```js
{
  enum: "My Enum Type" // name that will appear in the Types selector drop-down
  values: [  // the list of allowed values
    "Option A",
    "Option B",
    "Option C"
  ]
  matchPriority: 1 // (Optional) used to recognize existing string values
                   //   as the particular type (see below)
}
```

What is `matchPriority`? Well, when the data object is initialised, we have no way to know whether a given string value is "just a string" or is supposed to be one of the members of an Enum type (and we don't want to assume that if it's listed somewhere in an Enum `values` list that it definitely *should* be restricted to that type). So, if `matchPriority` is not defined, then that Enum type will *never* be initially assigned to a potentially matching Enum value when editing. If `matchPriority` is defined, then the highest priority Enum that has the value in its `values` list will be assigned (so if multiple Enums have overlapping `values`, the one with the highest priority will be applied.).

If the type of a given node is going to be *restricted* to a particular Enum type (i.e. the `allowTypeSelection` prop returns *only* one value), then a `matchPriority` is essential, otherwise it wouldn't be possible to switch a `string` to that type.

You can see examples of this in the [Star Wars data set](https://carlosnz.github.io/json-edit-react-v2/?data=starWars) of the Demo — the `eye_color`, `skin_color`, `hair_color` and `films` values are all restricted to a single, matching Enum type.

> [!NOTE]
> When editing, once an Enum type is selected from the Types selector, that node will continue to be displayed as that type for subsequent edits in the same session -- the `matchPriority` is purely for automatic recognition of a given value as a specific type when *first* editing it.

[![▶ Live example: Enums](https://img.shields.io/badge/▶_Live_example-Enums-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/enums)

### New-key restrictions & default values

You can restrict the available properties a given collection node can have (when adding new properties) by setting the `newKeyOptions` prop. The value can be either a **list of keys**, or a [`NewKeyOptionsFunction`](#filter-functions) callback which returns the key list.

This will cause the UI to present a Drop-down selector when adding a new key rather than the usual text input:

<img width="415" alt="Key selection" src="image/key_select.png">

The initial *value* for newly-added keys can also be defined with the `defaultValue` prop -- this can be *any* value, or a [`DefaultValueFunction`](#filter-functions) callback returning any value. The input signature is almost the same as standard `FilterFunctions`, but it can take a second argument, which is the name of the new key.

You can see an example of this in the [JSON Schema validation data](https://carlosnz.github.io/json-edit-react-v2/?data=jsonSchemaValidation) of the Demo app when you add new keys to either the `address` collection or the root node.

[![▶ Live example: New keys & defaults](https://img.shields.io/badge/▶_Live_example-New_keys_%26_defaults-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/new-key-restrictions)

### Drag-and-drop reordering

The `allowDrag` property controls which items (if any) can be dragged into new positions. By default, this is *off*, so you must set `allowDrag = true` to enable this functionality. Like the Edit permissions above, this property can also take a `FilterFunction` for fine-grained control. There are a couple of additional considerations, though:

- JavaScript does *not* guarantee object property order, so enabling this feature may yield unpredictable results. See [here](https://dev.to/frehner/the-order-of-js-object-keys-458d) for an explanation of how key ordering is handled.
> [!WARNING]
> It is strongly advised that you only enable drag-and-drop functionality if:
> 1. you're sure object keys will always be simple strings (i.e. not digits or non-standard characters)
> 2. you're saving the data in a serialisation format that preserves key order. For example, storing in a Postgres database using the `jsonb` (binary JSON) type, key order is meaningless, so the next time the object is loaded, the keys will be listed alphabetically.

- The `allowDrag` filter applies to the *source* element (i.e. the node being dragged), not the destination.
- To be draggable, the node must *also* be delete-able (via the `allowDelete` prop), as dragging a node to a new destination is essentially just deleting it and adding it back elsewhere.
- Similarly, the destination collection must be editable in order to drop it in there. This ensures that if you've gone to the trouble of configuring restrictive editing constraints using Filter functions, you can be confident that they can't be circumvented via drag-n-drop.

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Reacting to changes

### `onUpdate` — accept, reject, transform

The **`onUpdate`** prop allows you to provide a callback that runs whenever the data changes in the editor — for *every* kind of change. You might wish to use this to update some external state, post a notification, make an API call, modify the data before saving it, or [validate the data structure](#json-schema-validation) against a JSON schema. (It is *not* an alternative to `setData` — see [Managing state](#managing-state).)

The function receives two arguments. The first is a single object, built on the standard [node data](#filter-functions) (`key`, `path`, `value`, `fullData`, etc.) with an **`event`** discriminant plus the change-specific fields; the second is a `control` object for [gating the commit](#async-updates--gating--hold):

```js
{
    // ...standard node data (key, path, value, fullData, ...)
    //    describing the node BEFORE the change — for `add`, this is the new
    //    node's position, with `value` unset
    event,        // 'edit' | 'add' | 'delete' | 'rename' | 'move'
    newData,      // the whole document AFTER the change
    // ...plus one event-specific field:
    newValue,     // the new value           (event: 'edit' | 'add')
    newKey,       // the new key             (event: 'rename')
    newPath,      // the destination path    (event: 'move')
}
```

Branch on `event` to handle each operation:

```js
onUpdate={(props) => {
  switch (props.event) {
    case 'edit':   /* props.newValue */ break
    case 'rename': /* props.newKey   */ break
    case 'move':   /* props.newPath  */ break
    case 'add':    /* props.newValue */ break
    case 'delete': break
  }
}}
```

The function can return nothing (the change proceeds as normal), or a value to accept/reject/transform/cancel the change. The return value can be one of:
- `true` / `void` / `undefined`: the change proceeds as normal
- `false`: treats the change as an error — the data is not updated (reverts to the previous value) and a generic error message is displayed in the UI
- `null`: **silently cancels** the change — no update, and *no* error message (unlike `false`). Use this to quietly abort a change that isn't an error
- `{ value: <value> }`: replace the **edited node's** value with `<value>` (applied at its path). Use this to tidy what the user just entered — lower-case a string, round a number, trim, sort *this* array. Honoured for `edit` and `add`; ignored for `rename` / `move` / `delete` (those events have no node value to set)
- `{ data: <data> }`: replace the **whole document** with `<data>`. Use this for cross-field changes — stamping a `lastModified`, sorting sibling nodes, canonicalising the structure. Works for every event. (Returning both `value` and `data` is a mistake: `data` wins and `value` is ignored, with a console warning.)
- `{ error: <string> }` (or `{ error: { code, message } }`): treats the change as an error, with your provided message shown in the UI

(Any of the above may also be returned from an `async` function / `Promise`.)

[![▶ Live example: onUpdate basics](https://img.shields.io/badge/▶_Live_example-onUpdate_basics-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/on-update)

### Async updates & gating — `hold()`

By default, commits are **optimistic**: when the user submits an edit the input closes and the data updates immediately, then `onUpdate` runs in the background. If it rejects (`false`, `{ error }`, a thrown error, or a rejected promise), the change is automatically reverted and the error surfaced. A slow `onUpdate` — say a network save — therefore never blocks the editor, and the user can keep working. Each in-flight commit is tracked independently, so a late failure reverts only its own node and can't clobber a newer edit.

Structural changes — **delete**, drag-and-drop **move**, and adding an **array** item — settle a little differently. With no open input to keep responsive, they wait a brief moment (~100ms) for `onUpdate`: a fast result (e.g. synchronous schema validation) applies or rejects *in place*, so a rejected delete keeps the node and shows its error immediately; only a slow `onUpdate` falls back to the optimistic path (apply, then revert on failure). A rejected **move** has no settled position to anchor an inline message to, so it reports through the [`onEditEvent`](#listening-to-the-lifecycle--oneditevent) `updateError` event rather than an inline error.

If instead you want to **hold the editor open** until a decision resolves — e.g. to show a confirmation dialog, or to validate before the value is committed — call `hold()` on the second argument:

```js
onUpdate={async (props, { hold }) => {
  const release = hold()          // editor stays open; the rest of the tree is blocked
  const ok = await myConfirmDialog(props)
  if (!ok) return null            // abort — the edit is discarded
  release()                       // commit now (closes the editor)
}}
```

- `hold()` **must be called synchronously**, before the first `await`.
- While held, the editor stays open and the rest of the tree can't be edited (one operation at a time).
- `release()` applies the change and closes the editor.
- If you `hold()` but never `release()`, the eventual `onUpdate` result decides — the change commits when the promise resolves (unless it resolves to a reject/cancel). So a plain `hold()` → `await` → `return` keeps the editor open for the duration and then commits.

> [!TIP]
> A common difficulty in React is getting a modal confirmation to `await` a decision. Modals are fundamentally *declarative* — you render `<Modal open={…} />` and respond to its button callbacks — but an async `onUpdate` wants to ask *imperatively* ("did the user confirm?") and carry on with the answer. Bridging the two by hand means juggling a deferred promise, the dialog's open state, and core's synchronous `hold()` gate all at once.
>
> [`@json-edit-react/utils`](https://www.npmjs.com/package/@json-edit-react/utils) does that bridging for you. **`useConfirmOnUpdate`** lets you declare *when* to confirm and *what* to say, and returns a ready-made `onUpdate` plus the `dialog` state to drive your own modal; the lower-level **`useJsonEditorConfirm`** hands back an awaitable `confirm()` (`Promise<boolean>`) for gating anything — an editor edit, a toolbar action, a custom-node button. You still bring the modal; the hook owns the `await`.

[![▶ Live example: Confirm & settle](https://img.shields.io/badge/▶_Live_example-Confirm_%26_settle-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/confirm-and-settle)


### `onChange` — validating each keystroke

Similar to the Update function, the **`onChange`** function can be used to validate user input, except it's executed as the user types, not on submission. You can use this to restrict, constrain or transform user input — e.g. limiting numbers to positive values, or preventing line breaks in strings. The function *must* return a value in order to update the user input field, so if no changes are to be made, just return the input value unmodified.

The input is the standard [node data](#filter-functions) (`key`, `path`, `value`, `fullData`, etc.) with the in-progress `newValue` included in the object. (Since this runs *before* the data is committed, there's no `newData` — `value` is the current value, `fullData` the current document.)

[![▶ Live example: onChange validation](https://img.shields.io/badge/▶_Live_example-onChange_validation-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/on-change)

### `onError`

Normally, the component will display simple error messages whenever an error condition is detected (e.g. invalid JSON input, duplicate keys, or custom errors returned by the [`onUpdate` function](#onupdate--accept-reject-transform)). However, you can provide your own `onError` callback to capture the error data in order to implement your own error UI, or run additional side effects. (In the former case, you'd probably want to disable the `showErrorMessages` prop, too.) It receives the standard [node data](#filter-functions) (`key`, `path`, `value`, `fullData`, etc.) with the following additional fields spread on top:

```js
{
    // ...standard node data (key, path, value, fullData, ...)
    errorValue,   // the erroneous value that failed to update the property
    error: {      // a JerError
      code,       // one of 'UPDATE_ERROR' | 'DELETE_ERROR' | 'ADD_ERROR'
                  //   | 'RENAME_ERROR' | 'MOVE_ERROR' | 'INVALID_JSON' | 'KEY_EXISTS'
      message     // the (localised) error message that would be displayed
    }
}
```

[![▶ Live example: Custom error UI](https://img.shields.io/badge/▶_Live_example-Custom_error_UI-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/custom-error-ui)

### `onCopy`

The `onCopy` callback runs whenever an item is **copied** to the clipboard. It receives the standard [node data](#filter-functions) (`key`, `path`, `value`, `fullData`, etc.) with the following additional fields spread on top:

```js
{
    // ...standard node data (key, path, value, ...)
    type         // Either "path" or "value" depending on whether "Cmd/Ctrl" was pressed
    stringValue  // A nicely stringified version of the copied value
                 // (i.e. what the clipboard actually receives)
    success      // true/false -- whether the clipboard copy action actually succeeded
    error        // a JerError `{ code: 'CLIPBOARD_ERROR', message }`
                 //   present only when `success === false`
}
```

> [!TIP]
> Since there is very little user feedback when clicking "Copy", a good idea would be to present some kind of notification (see [Demo](https://carlosnz.github.io/json-edit-react-v2/) "Toast" notifications). There are situations (such as an insecure environment) where the browser won't actually permit any clipboard actions. In this case, the `success` property will be `false`, so you can handle it appropriately.

### JSON Schema validation

It's possible to do full [JSON Schema](https://json-schema.org/) validation by creating an [`onUpdate`](#onupdate--accept-reject-transform) that passes the data to a 3rd-party schema validation library (e.g. [Ajv](https://ajv.js.org/)). This will then reject any invalid input, and display an error in the UI (or via a custom [onError](#onerror) function). You can see an example of this in the [Demo](https://carlosnz.github.io/json-edit-react-v2/?data=jsonSchemaValidation) with the "JSON Schema Validation" data set (and the "Custom Nodes" data set). 

[![▶ Live example: JSON Schema validation](https://img.shields.io/badge/▶_Live_example-JSON_Schema_validation-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/json-schema-validation)

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Appearance & theming

### Using a prebuilt theme (`@json-edit-react/themes`)

A selection of curated themes is available in the [`@json-edit-react/themes`](#optional-companion-packages) companion package (as seen in the [Demo app](https://carlosnz.github.io/json-edit-react-v2/)). Install the package, then import a theme and pass it as the `theme` prop:

```sh
npm i @json-edit-react/themes
```

```js
import { JsonEditor } from 'json-edit-react'
import { githubDarkTheme } from '@json-edit-react/themes'

const MyApp = () => {
  const [ data, setData ] = useState({ one: 1, two: 2 })

  return <JsonEditor
    data={data}
    setData={setData}
    theme={githubDarkTheme}
    // other props...
    />
}
```

> [!TIP]
> If you've created a cool theme, feel free to [submit a PR](https://github.com/CarlosNZ/json-edit-react/pulls) to include it in the themes package

### Customising styles — the `theme` object

However, you can pass in your own theme object, or part thereof. A theme object looks like the following (this is the "default" theme definition):

```js
{
  displayName: 'Default',
  icons: { … },  // optional per-glyph IconDefinitions — see "Icons" below
  styles: {
    container: {
      backgroundColor: '#f6f6f6',
      fontFamily: 'monospace',
    },
    // collection: {},
    // collectionElement: {},
    // headerRow: {},
    // valueRow: {},
    // dropZone: {},
    property: '#292929',
    bracket: { color: '#002b36', fontWeight: 'bold' },
    itemCount: { color: '#0000004d', fontStyle: 'italic' },
    string: '#cb4b16',
    number: '#268bd2',
    boolean: 'green',
    null: { color: '#dc322f', fontVariant: 'small-caps', fontWeight: 'bold' },
    input: ['#292929'],
    inputHighlight: '#b3d8ff',
    error: { fontSize: '0.8em', color: 'red', fontWeight: 'bold' },
    iconCollection: '#002b36',
    iconEdit: '#2aa198',
    iconDelete: '#cb4b16',
    iconAdd: '#2aa198',
    iconCopy: '#268bd2',
    iconOk: 'green',
    iconCancel: '#cb4b16',
  },
}

```

The `styles` property is the main one to focus on. Each key (`property`, `bracket`, `itemCount`) refers to a part of the UI. The value for each key is *either*:
- a `string`, in which case it is interpreted as the colour (or background colour in the case of `container` and `inputHighlight`)
- a full CSS style object for fine-grained definition. You only need to provide properties you wish to override — all unspecified ones will fallback to either the default theme, or another theme that you specify as the "base".
- a `Style Function`, which is a variant of [Filter Function](#filter-functions) tha takes the same input, but returns a CSS style object (or `null`). This allows you to *dynamically* change styling of various elements based on content or structure. (An example is in the [Demo](https://carlosnz.github.io/json-edit-react-v2/?data=customNodes) "Custom Nodes" data set, where the character names are styled larger than other string values)
- an array combining any of the above. Static styles merge left → right (later wins per property); a "Style Function" always applies *last*, on top of the merged statics, and multiple functions compose in order. So you can pair static "fallback" styles with a conditional function — when the function returns `null` it contributes nothing, leaving the statics showing through.

`inputHighlight` is the one exception to the above: it sets the text-selection colour through a `::selection` rule (surfaced as a single CSS custom property), so it accepts **only a colour string** — not a style object, function, or array.

For a simple example, you can take an existing theme and override just a few things — pair static overrides (a fixed icon colour, bold-italic booleans) with a conditional style function, all pinned in place as you switch the base theme:

[![▶ Live example: Theme overrides](https://img.shields.io/badge/▶_Live_example-Theme_overrides-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/theme-overrides)

Here's another cool use for Style Functions:

[![▶ Live example: Heat map](https://img.shields.io/badge/▶_Live_example-Heat_map-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/heat-map)

So, to summarise, the `theme` prop can take *either*:

- an imported theme, e.g `"candyWrapperTheme"`
- a theme object:
  - can be structured as above with `fragments`, `styles`, `displayName`, `icons` (glyphs — see [Icons](#icons)) etc., or just the `styles` part (at the root level)
- any number of theme objects (each can be as full or minimal as you like) in an array (with later ones taking precedence when they overlap properties)

You can play round with live editing of the themes in the [Demo app](https://carlosnz.github.io/json-edit-react-v2/?data=editTheme) with the "Edit this theme!" data set.

> [!NOTE]
> #### Sizing and scaling
> Internally, all sizing and spacing is done in `em`s, never `px` (aside from the [`baseFontSize`](#look-and-feel--ui), which sets the "base" size). This makes scaling a lot easier — just change the `baseFontSize` prop (or set `fontSize` on the main container via targeting the class, or tweaking the [theme](#customising-styles--the-theme-object)), and watch the *whole* component scale accordingly.

### CSS classes

Another way to style the component is to target the CSS classes directly. Every element in the component has a unique class name, so you should be able to locate them in your browser inspector and override them accordingly. All class names begin with the prefix `jer-`, e.g. `jer-collection-header-row`, `jer-value-string`.

Note that theme styles are applied *inline*, so any property the theme sets takes precedence over your own CSS rules (short of `!important`). CSS-class overrides are therefore best for structural/layout tweaks the theme doesn't touch (spacing, sizing, borders); colours and fonts are best set through the `theme` prop.

### Style fragments

A `fragments` object is a convenience to define named, reusable style tokens — a colour or a snippet of CSS — and reference them by name from any element's value. Think of it as a palette: define a value once and reuse it in several unrelated places, so a later tweak only happens in one spot.
```js
fragments: { accent: '#E63946' },
styles: {
  property: 'accent',
  iconEdit: 'accent',
}
```

A fragment can also be a full style object, and can be mixed with extra properties (and other fragments) in an array:
```js
fragments: { iconAdjust: { fontSize: '110%', marginRight: '0.6em' } },
styles: {
  iconEdit: ['iconAdjust', { marginLeft: '1em' }],
}
```

### Icons

A theme owns its icon **glyphs** as well as their colour, though any icons not defined fall through as per the styles, bottoming out with the default icons.

The `icons` property is for defining the glyphs; the `styles.icon...` properties control the CSS that gets applied to them, though if an icon as specific colours applied to an inner path, these won't be overridden. The property is structure as follows:

```ts
interface ThemeIcons {
  add?: IconDefinition
  edit?: IconDefinition
  delete?: IconDefinition
  copy?: IconDefinition
  ok?: IconDefinition
  cancel?: IconDefinition
  collection?: IconDefinition
}

interface IconDefinition {
  content: React.ReactNode // the inner SVG markup — <path>/<circle>/… (no outer <svg>)
  viewBox?: string // defaults to '0 0 24 24'
  svgProps?: React.SVGProps<SVGSVGElement> // extra <svg> attrs, e.g. a stroke icon: { fill: 'none', stroke: 'currentColor', strokeWidth: 2 }
  scale?: number // per-glyph size tweak (default 1)
}
```

Core renders the wrapping `<svg>` itself, so you supply only what goes inside it:

```tsx
const myTheme = {
  icons: {
    add: { content: <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4z" /> },
  },
  styles: { iconAdd: '#2aa198' }, // colours the glyph
}
```

**Colour follows `currentColor`.** Core applies the theme's icon colour to the `<svg>`, so any glyph path that uses `fill="currentColor"` (or sets no `fill`) adopts it. A path with its own explicit `fill` keeps that colour — so multi-colour glyphs (flags, brand logos) survive theming, as long as every coloured path carries its own `fill`.

**Sizing.** Icons render a little larger than text by default; `scale` is a per-glyph multiplier on that baseline (e.g. `scale: 1.3` renders 30% bigger). Use it only to even out a glyph whose artwork over- or under-fills its viewBox — size lives in the glyph, never in `styles`.

**Pasting raw SVG.** The `iconFromSvg` helper in [`@json-edit-react/utils`](#optional-companion-packages) turns a raw SVG string (or a React `<svg>` element) into an `IconDefinition`, so you can drop a copied icon straight in:

```tsx
import { iconFromSvg } from '@json-edit-react/utils'

const myTheme = {
  icons: { add: iconFromSvg('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 7h-2v4H7…"/></svg>') },
  styles: {},
}
```

To replace an icon of another theme, layer the new icon onto the `theme` array — the same mechanism as style overrides:

```tsx
theme={[githubDarkTheme, { icons: { add: iconFromSvg('<svg…>') } }]}
```

> [!CAUTION]
> A **string** passed to `iconFromSvg` is interned — identical markup returns the same `IconDefinition` object every time — so the result is referentially stable and safe to write inline, like in this example. The other forms aren't: a React **element**, a pre-built **`IconDefinition`**, or a raw React node placed directly in `theme.icons` produces a new object on every render. Define that value outside the component, or wrap it in `useMemo` (the same rule as any inline `theme` value), so its changing reference doesn't churn the editor's re-rendering.

[![▶ Live example: Custom icons](https://img.shields.io/badge/▶_Live_example-Custom_icons-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/custom-icons)

### The bundled stylesheet (Shadow DOM)

The component's base stylesheet is bundled in and injected into the document `<head>` automatically, so in the normal case there's nothing to import — styling works out of the box.

The exception is when the editor renders inside a [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM): styles injected into the document `<head>` don't cross the shadow boundary, so the component renders unstyled. For this case the stylesheet is also published as a standalone file you can import and inject into the shadow root yourself:

```js
import 'json-edit-react/style.css'
```

How that import resolves depends on your bundler — most will inline or extract it so you can attach it where you need it (for example via a `<style>` element inside the shadow root, or by adding a constructed stylesheet to `shadowRoot.adoptedStyleSheets`). The stylesheet defines its custom properties on both `:root` and `:host`, so it applies correctly whether it lives in the document or in a shadow root.

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Initial expansion — `collapse`

The `collapse` prop determines at what level the tree is expanded to when initially loading:
- `false`: fully open, all nodes expanded all the way down
- `true`: fully collapsed to the root
- a `number`: expand to a depth of this number, anything more nested that that remains collapsed until manually opened. (Default: 3). This is handy for really big data sets — nodes that are closed when initialised never get rendered (so none of their children even mount) until they are expanded.
- `FilterFunction`: dynamically control what is open based on `node data` (see [`FilterFunctions`](#filter-functions)) — handy if you want to pull your users' focus to a certain branch of the tree, say. (The [live Guestbook](https://carlosnz.github.io/json-edit-react-v2/?data=liveData) uses a `collapse` filter function to highlight the first and last entries, as well as the guidance text. ) 

> [!NOTE]
> The tree reacts to a changing `collapse` prop — whenever it changes, the full tree resets to the collapse state determined by the new `collapse` value (or per-node `FilterFunction` result)

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Search & filtering

### Basic search — `searchText` + `searchFilter`

The displayed data can be filtered based on search input from a user. The user input should be captured independently (we don't provide a UI here) and passed in with the `searchText` prop. This input is debounced internally (time can be set with the `searchDebounceTime` prop). The values that the `searchText` are tested against is specified with the `searchFilter` prop. By default (no `searchFilter` defined), it will match against the data *values* (with case-insensitive partial matching — i.e. input "Rod", will match value "Frodo").

### Custom search — `SearchFilterFunction`

You can specify what should be matched by setting `searchFilter` to either `"key"` (match property names), `"value"` (the default described above), or `"all"` (match both properties and values). This should be enough for the majority of use cases, but you can specify your own `SearchFilterFunction`. The search function is the same signature as the above [FilterFunctions](#filter-functions) but takes one additional argument for the `searchText`, i.e.

```ts
( { key, path, level, value, ...etc }:FilterFunctionInput, searchText:string ) => boolean
```

There are two helper functions (`matchNode()` and `matchNodeKey()`) exported with the package that might make creating a search function easier (these are the functions used internally for the `"key"` and `"value"` matches described above). You can see what they do [here](https://github.com/CarlosNZ/json-edit-react/blob/main/src/utils/filter.ts#L79-L110).

An example custom search function can be seen in the [Demo](https://carlosnz.github.io/json-edit-react-v2/?data=jsonPlaceholder) with the "Client list" data set — the search function matches by "name" and "username", and makes the entire "Client" object visible when one matches, so it can be used to find a particular person and edit their specific details.

[![▶ Live example: Client list](https://img.shields.io/badge/▶_Live_example-Client_list-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/json-placeholder)

> [!TIP]
> `searchFilter` callbacks like the one shown here can be fiddly to write, so we've provided a [filter-function toolkit](packages/utils/src/filters/README.md) in [`@json-edit-react/utils`](https://www.npmjs.com/package/@json-edit-react/utils) — a set of small, composable predicate builders (`byKey`, `byPath`, `byLevel`, `byType`, `byValue`), position constants (`root`, `collections`, `primitives`), combinators (`and` / `or` / `not`), and search bridges (`matchRecord`, `matchesSearch`) that snap together to build both `searchFilter` and the `allow*` editing props. The `matchRecord` shown above is one of them, and because every builder is *interned*, you can write them inline — no `useMemo` — without defeating json-edit-react's fine-grained re-rendering.

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Localisation

### `translations`

Localise your implementation (or just customise the default messages) by passing in a `translations` object to replace the default strings. The keys and default (English) values are:
```js
{
  ITEM_SINGLE: '{{count}} item',
  ITEMS_MULTIPLE: '{{count}} items',
  ITEMS_FILTERED: '{{visible}} of {{total}} items',
  KEY_NEW: 'Enter new key',
  KEY_SELECT: 'Select key',
  NO_KEY_OPTIONS: 'No key options',
  ERROR_KEY_EXISTS: 'Key already exists',
  ERROR_INVALID_JSON: 'Invalid JSON',
  ERROR_UPDATE: 'Update unsuccessful',
  ERROR_DELETE: 'Delete unsuccessful',
  ERROR_ADD: 'Adding node unsuccessful',
  ERROR_RENAME: 'Rename unsuccessful',
  ERROR_MOVE: 'Move unsuccessful',
  DEFAULT_NEW_KEY: 'key',
  SHOW_LESS: '(Show less)',
  EMPTY_STRING: '<empty string>' // Displayed when property key is ""
  // These label the icon controls (which are <button>s) for assistive tech via
  // `aria-label`, and also show as visible tooltips when the `showIconTooltips`
  // prop is enabled.
  TOOLTIP_COPY: 'Copy to clipboard',
  TOOLTIP_EDIT: 'Edit',
  TOOLTIP_DELETE: 'Delete',
  TOOLTIP_ADD: 'Add',
  TOOLTIP_OK: 'OK',
  TOOLTIP_CANCEL: 'Cancel',
}
```

Your `translations` object doesn't have to be exhaustive — only define the keys you want to modify.

[![▶ Live example: Localisation](https://img.shields.io/badge/▶_Live_example-Localisation-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/localisation)

### Dynamic text — `customText`

It's possible to change the various text strings displayed by the component. You can [localise it](#localisation), but you can also specify functions to override the displayed text based on certain conditions. For example, say we want the property count text (e.g. `6 items` by default) to give a summary of a certain type of node, which can look nice when collapsed. For example (taken from the [Demo](https://carlosnz.github.io/json-edit-react-v2/?data=customNodes)):

<img width="391" alt="Custom text example" src="image/custom_text.png">

The `customText` property type is:

```ts
type CustomTextDefinitions = Partial<{ [key in keyof LocalisedStrings]: CustomTextFunction }>

// i.e.
// {
//   ITEM_SINGLE: (nodeData) => string | null,
//   ITEMS_MULTIPLE: (nodeData) => string | null
//   ...etc. for other keys as desired
// }
```

[![▶ Live example: Custom text](https://img.shields.io/badge/▶_Live_example-Custom_text-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/custom-text)

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Keyboard control

The default keyboard controls are [outlined above](#keyboard-control), but it's possible to customise/override these. Just pass in a `keyboardControls` prop with the actions you wish to override defined. The default config object is:
```ts
{
  confirm: 'Enter',  // default for all Value nodes, and key entry
  cancel: 'Escape',
  objectConfirm: { key: 'Enter', modifier: ['Meta', 'Shift', 'Control'] },
  objectLineBreak: 'Enter',
  stringConfirm: 'Enter',
  stringLineBreak: { key: 'Enter', modifier: 'Shift' },
  numberConfirm: 'Enter',
  numberUp: 'ArrowUp',
  numberDown: 'ArrowDown',
  tabForward: 'Tab',
  tabBack: { key: 'Tab', modifier: 'Shift' },
  booleanConfirm: 'Enter',
  booleanToggle: ' ', // Space bar
  clipboardModifier: ['Meta', 'Control'],
  collapseModifier: 'Alt',
}
```

If (for example), you just wish to change the general "confirmation" action to <kbd>Cmd-Enter</kbd> (on Mac), or <kbd>Ctrl-Enter</kbd>, you'd just pass in:
```ts
  keyboardControls = {
    confirm: {
      key: "Enter",
      modifier: [ "Meta", "Control" ]
    }
  }
```

**Considerations**:

- Key names come from [this list](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values)
- Accepted modifiers are "Meta", "Control", "Alt", "Shift"
- On Mac, "Meta" refers to the <kbd>Cmd</kbd> key, and "Alt" refers to <kbd>Option</kbd>
- If multiple modifiers are specified (in an array), *any* of them will be accepted (multi-modifier commands not currently supported)
- You only need to specify values for `stringConfirm`, `numberConfirm`, and `booleanConfirm` if they should *differ* from your `confirm` value — they inherit whatever you set `confirm` to, including `null`.
- To **disable** a control entirely, set it to `null`. The key is then no longer intercepted and falls through to its native browser behaviour. This is useful when the default bindings aren't appropriate for your data — for example, `{ tabForward: null, tabBack: null }` turns off Tab navigation between editable nodes so that <kbd>Tab</kbd>/<kbd>Shift-Tab</kbd> resume their normal focus-traversal behaviour. Because the per-type confirms inherit from `confirm`, setting `confirm: null` disables <kbd>Enter</kbd>-to-submit across string, number, boolean and null value editors at once (object/array nodes use `objectConfirm`, so disable that separately if needed). The two modifier controls, `clipboardModifier` and `collapseModifier`, can likewise be disabled with `null` or an empty array `[]`.
- You won't be able to override system or browser behaviours: for example, on Mac "<kbd>Ctrl</kbd>-click" will perform a right-click, so using it as a click modifier won't work (hence we also accept "Meta"/"Cmd" as the default `clipboardModifier`).

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Custom Nodes & Components

Custom nodes are a powerful way to extend the functionality of **json-edit-react** to integrate any kind of data structure you can imagine into the editor. They're built around two simple properties:

- **condition** — what nodes get treated as "special"
- **component** — what we render those nodes with

See the "Custom Nodes" data set in the [demo](https://carlosnz.github.io/json-edit-react-v2/?data=customNodes) to see a few in action.

A wide range of pre-build custom components are available in a separate package to import and drop in as required. These include hyperlinks, date pickers, color pickers, image renderers and several "non-JSON" data types (`undefined`, `BigInt`, `Symbol`, etc.)

Browse them all at [`@json-edit-react/components`](https://www.npmjs.com/package/@json-edit-react/components), and see most of them in use on the demo site's ["Custom Component Library"](https://carlosnz.github.io/json-edit-react-v2/?data=customComponentLibrary).

[![▶ Live example: Custom component library](https://img.shields.io/badge/▶_Live_example-Custom_component_library-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/custom-component-library)

> [!TIP]
> Feel free to contribute any custom components you've made that you think would be useful to others

### How to use the pre-built components

Details for each specific component are available on that package's [README](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components), but the general pattern is the same: import the component's **definition factory**, call it, and pass the result into the `customNodeDefinitions` prop. For example, the `Hyperlink` component — which turns URL strings into clickable links — is added like this:

```jsx
import { JsonEditor } from 'json-edit-react'
import { hyperlinkDefinition } from '@json-edit-react/components'

// Define once (module scope or `useMemo`) so the reference stays stable
const customNodeDefinitions = [hyperlinkDefinition()], //add other definitions in the array

const App = () => (
  <JsonEditor data={data} setData={setData} customNodeDefinitions={customNodeDefinitions} />
)
```

Each factory accepts an optional options object to customise its behaviour — e.g. `hyperlinkDefinition({ condition: ({ key }) => key === 'homepage' })` to restrict it to a specific field — and falls back to sensible defaults when called with no arguments.

That `condition` doesn't _replace_ the definition's built-in one — it's **AND-ed** with it. Each pre-built definition already recognises the data it handles (URL strings for `Hyperlink`, ISO dates for `DatePicker`), so a `condition` you supply only narrows _where_ the component applies. This AND-ing is exactly why the definitions are exposed as factory functions.

### Writing a custom node definition — `condition` + `component`

Custom nodes are provided in the `customNodeDefinitions` prop, as an array of objects of following structure:

```js
{
  condition,            // a FilterFunction, as above

  // The two render slots — provide either, both, or neither:
  keyComponent,         // React component — renders in the KEY slot (the property label)
  component,            // React component — renders in the VALUE / contents slot

  componentProps,       // object (optional) — props shared by `keyComponent` and `component`
  showKey,              // boolean (optional), default true
  defaultValue,         // value for a new instance of your component
  
  // Components are "display only" by default (falls back to core UI for editing)
  showOnEdit            // boolean, default false
  showOnView            // boolean, default true
  showEditTools         // boolean, default true
  name                  // string (appears in Type selector)
  showInTypeSelector    // boolean (optional), default false
  editOnTypeSwitch      // boolean (optional), default false -- switching to this type opens
                        // it for editing instead of committing defaultValue instantly
  passOriginalNode      // boolean (optional), default false -- if `true`, makes the original
                        // node available for rendering within the custom node
  
  // Only affects Collection nodes:
  showCollectionWrapper // boolean (optional), default true
  wrapperComponent      // React component (optional) to wrap *outside* the normal collection wrapper
  wrapperProps          // object (optional) -- props for the above wrapper component
  renderCollectionAsValue // For special "object" data that should be treated like a "Value" node

  // For JSON conversion -- only needed if editing as JSON text
  stringifyReplacer    // function for stringifying to JSON (if non-JSON data type)
  parseReviver?:       // function for parsing as JSON (if non-JSON data type)

  // For type switching & editing
  toStandardType       // function to convert the custom value to a primitive when the
                       // Type selector switches this node to a standard type
  fromStandardType     // the inverse: function to convert a standard-typed value into this
                       // type's value — runs when the user confirms an edit, and to seed
                       // the editor on an `editOnTypeSwitch` switch (see below)
}
```

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

A worked example with both standard and custom props: see the [Date Picker component source](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/src/DatePicker/component.tsx) (in `@json-edit-react/components`) for the props read from _inside_ a component, or the focused example below for a custom `componentProps` config wired from the _outside_.

[![▶ Live example: Date picker](https://img.shields.io/badge/▶_Live_example-Date_picker-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/date-picker)

### Display vs. edit modes

By default a custom component is a **display** component: it renders in the viewer, and editing falls back to the standard interface. Three flags change that:

- **`showOnView`** (default `true`) — render in view mode.
- **`showOnEdit`** (default `false`) — render in edit mode too. Set this for a component that _is_ its own editor (a date picker, a colour picker).
- **`showEditTools`** (default `true`) — show the copy / add / edit / delete icons on hover. Disable them only if your component supplies its own way to enter edit mode.

[![▶ Live example: Display vs. edit modes](https://img.shields.io/badge/▶_Live_example-Display_vs._edit_modes-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/display-vs-edit)

### Editing a non-plain value — `fromStandardType`

If your component edits a value whose committed form isn't the raw text in the edit buffer — say the buffer holds digits but the value is a `BigInt` — define **`fromStandardType: (value, nodeData, componentProps) => value`**, the inverse of `toStandardType`: it takes a standard-typed value and returns your custom one. It fires at two moments — when an edit is **confirmed** (the input is the edit buffer; the ✓ button, <kbd>Enter</kbd>, <kbd>Tab</kbd>, `editorRef.confirm()`) and when a **type switch seeds** your component (the input is the node's current value, demoted to a standard type first). Pass already-correct values through unchanged.

`throw` to signal an unconvertible value. On a **confirm** that rejects the edit — nothing commits, the editor stays open with the user's text intact, and the message shows inline and fires `onError` (the same as confirming invalid JSON). On a **type-switch seed** there's nothing to reject yet, so it simply falls back to seeding `defaultValue` (the original stays recoverable with <kbd>Esc</kbd>).

[![▶ Live example: BigInt](https://img.shields.io/badge/▶_Live_example-BigInt-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/bigint)

### Letting users create your type

To let users turn a node _into_ your custom type from the Type selector, set **`showInTypeSelector: true`** and provide:

- **`name`** — the label shown in the selector.
- **`defaultValue`** — the value inserted when the type is chosen. It must satisfy your `condition` (so the new node immediately renders as your component).

By default, choosing the type commits `defaultValue` and closes the editor. For types the user will almost always want to edit straight away (date, colour, BigInt), set **`editOnTypeSwitch: true`** (requires `component` + `showOnEdit`): the edit buffer is seeded by your `fromStandardType` (so a string→Symbol switch carries the string into the description), falling back to `defaultValue`; your component opens in its edit state, one commit happens on confirm, and <kbd>Esc</kbd> cancels the whole switch.

[![▶ Live example: Creating custom types](https://img.shields.io/badge/▶_Live_example-Creating_custom_types-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/creating-types)

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

[![▶ Live example: Custom node keys](https://img.shields.io/badge/▶_Live_example-Custom_node_keys-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/custom-keys)

### Decorating the default node — `passOriginalNode`

Sometimes you don't want to _replace_ a node, just add to it. Set **`passOriginalNode: true`** and your component also receives **`originalNode`** and **`originalNodeKey`** — the value and key exactly as the library would have rendered them. Render those plus your decoration (a badge, a marker, a highlight) for a "default node, with extra" effect. The [`ErrorIndicator`](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/README.md) component works this way. (You may need a little CSS to line your wrapper up with the default layout.)

[![▶ Live example: Decorating nodes](https://img.shields.io/badge/▶_Live_example-Decorating_nodes-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/decorating-nodes)

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

- `showCollectionWrapper: false` is the full-replacement escape hatch — no chevron, brackets, or built-in collapse, so you're responsible for completely rendering the data within.

See the different "wrapper" and "inner" component elements in use:  
[![▶ Live example: Custom collection nodes](https://img.shields.io/badge/▶_Live_example-Custom_collection_nodes-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/custom-collection-nodes)

A "full-takeover" example:  
[![▶ Live example: Student ID cards](https://img.shields.io/badge/▶_Live_example-Student_ID_cards-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/student-cards)

### Displaying a collection as a value

For a specialised object you'd rather treat as a single value — a JavaScript [`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date), say — set **`renderCollectionAsValue: true`**. The whole object is passed to your `component` as one value instead of being expanded into key/value rows; your component is responsible for handling it. The [`DateObject`](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components/src/DateObject) and [`EnhancedLink`](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components/src/EnhancedLink) components in `@json-edit-react/components` both do this.

[![▶ Live example: Collection as a value](https://img.shields.io/badge/▶_Live_example-Collection_as_a_value-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/collection-as-value)

### Editing as JSON — `stringifyReplacer` / `parseReviver`

If your node holds a non-JSON value (`BigInt`, `Date`, `Symbol`, …), editing the document as raw JSON text would lose it to the default `JSON.stringify` / `JSON.parse`. Supply a [**replacer**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#replacer) and [**reviver**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#the_reviver_parameter) to serialize and restore it however you like.

This is separate from [`fromStandardType`](#editing-a-non-plain-value--fromstandardtype): that handles the inline **edit buffer** (field editing and type-switching), whereas this handles **JSON text**. A non-JSON type like `BigInt` typically needs both, as seen in the example [above](#editing-a-non-plain-value--fromstandardtype).

The [`BigInt`](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/src/BigInt/definition.ts) component, for example, is represented in JSON text as:

```json
{
  "__type": "BigInt",
  "value": 1234567890123456789012345678901234567890
}
```
which can then be re-parsed into a true `BigInt` when committing.

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Overriding and extending the UI

**json-edit-react** aims to be unopinionated about UI implementations, so as well as being extremely [style-able](#appearance--theming), you can also swap out basic UI elements with your own, as well as adding your own [custom buttons](#custom-buttons) to the edit tools.

Two UI elements ("widgets") are easily swappable — you just have to provide an alternative component that complies with the same API surface:
- `textarea` — used for editing JSON blocks, passed in on the `TextEditor` prop
- `select` — drop-down selectors, passed in on the `Select` prop

[![▶ Live example: Swap the built-ins](https://img.shields.io/badge/▶_Live_example-Swap_the_built--ins-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/swap-the-built-ins)

### Replacing the text/code editor — `TextEditor` (`CodeEditor`)

By default, this is a native HTML [`textarea`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea) element for plain-text editing. You can replace it with any component that offers the following API:

- `value: string` — the current text
- `onChange: (value: string) => void`  — should be called on every keystroke to update `value`
- `onKeyDown: (e: React.KeyboardEvent) => void` — should be called on every keystroke to detect "Accept"/"Cancel" keys

You can see an example in the [demo](https://carlosnz.github.io/json-edit-react-v2/) where I have implemented [**CodeMirror**](https://codemirror.net/) when the "Custom Text Editor" option is checked. It changes the native editor (on the left) into the one shown on the right:

<img width="800" alt="Text editor comparison" src="image/text-editor-comparison.png">  

This demo component is available from the `@json-edit-react/components` package

> [!TIP]
> True `JSON` text is rather fussy about formatting (quoted keys, no trailing commas, etc.), which can be annoying to deal with when typing by hand. I recommend accepting "looser" `JSON` text input by passing in an alternative parser, such as [JSON5](https://json5.org/) (which is what is used in the [Demo](https://carlosnz.github.io/json-edit-react-v2/)). Set this via [the `jsonParse` prop](#custom-components--overrides-incl-localisation).

### Replacing the native `<select>` element

Similarly, the drop-downs used in component are stock HTML [`select`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) elements. Drop-downs can appear in 3 places:

- [type selection](#restricting-data-types--allowtypeselection)
- [enum options](#enums)
- [new key options](#new-key-restrictions--default-values)

You can provide any component you like that conforms to the following API:

```ts
export interface SelectProps {
  options: string[]
  /** Controlled value. Mutually exclusive with `defaultValue`. */
  value?: string
  /** Initial value when used uncontrolled — typically `''` so the
   *  placeholder shows first. Mutually exclusive with `value`. */
  defaultValue?: string
  /** Fired with the selected option's value. */
  onChange: (value: string) => void
  /** Forwarded to the underlying input. Lets the call site keep
   *  ownership of keyboard semantics via `handleKeyboard(...)`. */
  onKeyDown?: (e: React.KeyboardEvent) => void
  /** Grab focus on mount. */
  autoFocus?: boolean
  /** Disabled first option shown when nothing is selected. */
  placeholder?: string
  /** Form name / id hint. */
  name?: string
  /** Class applied to the inner control. */
  className?: string
}
```

If your drop-down component of choice has a different interface, you can create a thin wrapper component around it to translate the props accordingly. I have provided an example of this using [**react-select**](https://react-select.com/home) in the `@json-edit-react/components` repo, called [ReactSelect](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/README.md#editor-slot-widgets), so you can copy that pattern or just use that one directly (this is the component used in the [example](https://carlosnz.github.io/json-edit-react-v2/examples/swap-the-built-ins) above).

#### But what about the text input element?

I haven't made the main string input component swappable, for two main reasons:

1. It's actually a special `textarea` that grows in width and height as the contents changes, not just a single-line `<input>`. I'm using a [bit of a hack](https://github.com/CarlosNZ/json-edit-react/blob/main/src/AutogrowTextArea.tsx) to achieve this, so it wouldn't be straightforward to just swap it out with a single component that could directly replace it.
2. Unlike `<select>`, which has genuinely useful functionality differences in other offerings, the text input is intended to be minimal, so you can achieve (almost) the full look as any UI library just using CSS (Details for specific libraries forthcoming)/

### Custom buttons

In addition to the "Copy", "Edit" and "Delete" buttons that appear by each value, you can add your own buttons if you need to allow some custom operations. Provide an array of button definitions in the `customButtons` prop, with the following structure:

```ts
customButtons = [
  {
    Element: React.FC<{ nodeData: NodeData }>,
    onClick?: (nodeData: NodeData, e: React.MouseEvent) => void
  }
]
```
> [!WARNING]
> The `onClick` is *optional* -- don't provide it if you have your own `onClick` handler within your button component.

> [!NOTE]
> Unlike [custom node definitions](#custom-nodes--components), custom buttons don't have a `condition` property. However, you can still make them conditional as they have full access to each node's `nodeData` — just return `null` from the component when they shouldn't appear.


[![▶ Live example: Custom buttons](https://img.shields.io/badge/▶_Live_example-Custom_buttons-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/custom-buttons)

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Programmatic control

You can interact with the component externally, with event callbacks and triggers to set/get the collapse or editing state of any node.

### Listening to the lifecycle — `onEditEvent`

Pass in a function to the props `onEditEvent` and `onCollapse` if you want your app to be able to respond to these events.

The `onEditEvent` callback streams the complete **interaction lifecycle**. It receives the standard [node data](#filter-functions) (`key`, `path`, `value`, `fullData`, …) with an `event` field — the current step — spread on top. Each kind of change emits its own events: editing a value, renaming a key and adding a property run as multi-step **sessions**, while deleting, moving, and the background result of a save each fire a single event.

| Change                | Events (in order)                                                   | Notes                                                                                   |
| --------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Edit a value          | `startEdit` → `submitEdit` → `commitEdit` *or* `cancelEdit`         |                                                                                         |
| Rename a key          | `startRename` → `submitRename` → `commitRename` *or* `cancelRename` | `commitRename` also carries `oldKey` + `newKey`                                         |
| Add a property        | `startAdd` → `submitAdd` → `commitAdd` *or* `cancelAdd`             |                                                                                         |
| Delete or move a node | `delete` *or* `move`                                                | Instant — fires once, no session                                                        |
| Save settled          | `updateSuccess` *or* `updateError`                                  | Only fired when an `onUpdate` ran; carries the `operation` (and, on error, the `error`) |

A few things worth knowing:
- A session ends with **exactly one** of `commit*` (applied) or `cancel*` (closed without applying) — and `cancel*` also fires when `onUpdate` returns `null`, not only on an explicit cancel.
- A [`hold()` gate](#async-updates--gating--hold), if you've set one, runs in the `submit*` window.
- **Add events describe the parent collection** (the node you're adding *into*); `commitAdd` is where the add lands.
- **Array adds are instant** — they emit only `commitAdd` (no `startAdd`/`submitAdd`/`cancelAdd`, since there's no key-entry step).
- A **no-op confirm** (the user submits without changing the value) still emits `commitEdit` — the session closed cleanly, it just didn't change anything (and no `update*` follows, since `onUpdate` isn't run).
- A type change mid-edit that's structural (to an object/array/custom node) is itself a commit, so it emits `commitEdit` while editing continues — one session can emit multiple `commitEdit`s.

[![▶ Live example: Event signals](https://img.shields.io/badge/▶_Live_example-Event_signals-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/event-signals)

### Listening to expansion events — `onCollapse`

The `onCollapse` callback is executed when the user opens or collapses a node (or you drive it via `editorRef.collapse`). It receives the node's [node data](#filter-functions) with the collapse flags spread on top:

```ts
type OnCollapseFunction = (
  nodeData: NodeData & {
    collapsed: boolean // closing = true, opening = false
    includeChildren: boolean // if opened/closed with the Modifier key to
                             // affect all descendants as well
  }
) => void
```

[![▶ Live example: Collapse signals](https://img.shields.io/badge/▶_Live_example-Collapse_signals-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/collapse-signals)

### Driving the editor — the `editorRef` handle

You can *drive* the editor's UI imperatively via a handle: open a value-edit **input session** at a node, commit or cancel it, and collapse nodes. Create a ref with `useRef` and pass it to the `editorRef` prop (an ordinary prop, not the `ref` attribute):

```tsx
import { useRef } from 'react'
import { JsonEditor, type JsonEditorHandle } from 'json-edit-react'

const editorRef = useRef<JsonEditorHandle>(null)

// ...
<JsonEditor data={data} setData={setData} editorRef={editorRef} />

// Then, from an event handler:
editorRef.current?.collapse({ path: ['user'], collapsed: true, includeChildren: true })
editorRef.current?.startEdit({ path: ['user', 'name'] })  // open the value editor
editorRef.current?.confirm()  // commit the open session (runs onUpdate)
editorRef.current?.cancel()   // discard the open session
```

The handle shape is:

```ts
interface JsonEditorHandle {
  // Collapse/expand a node (or a whole subtree, with `includeChildren`).
  // Same `CollapseState` shape as the `onCollapse` callback input.
  collapse: (state: CollapseState | CollapseState[]) => void
  // Open a value-edit session at a node; returns whether it opened (see below).
  startEdit: (options: StartEditOptions) => StartEditResult
  // Commit the open session (clicks the live confirm control), then exit.
  confirm: () => void
  // Discard the open session without committing.
  cancel: () => void
}

interface StartEditOptions {
  // The target node to edit.
  path: CollectionKey[]
  // Bypass `allowEdit` (default false). Skips ONLY the filter — your
  // `onUpdate` still runs (and may reject) at `confirm()`.
  overrideRestrictions?: boolean
}

// `true` if the session opened, else why it didn't.
type StartEditResult = true | 'RESTRICTED' | 'PATH_NOT_FOUND'

interface CollapseState {
  path: CollectionKey[]
  collapsed: boolean
  includeChildren: boolean
}
```

> [!TIP]
> Pass **`overrideRestrictions: true`** to bypass the filter. *A common pattern is to lock the whole tree with `allowEdit={false}` and imperatively enable editing on one node through your own UI*. It skips **only** the filter: your `onUpdate` still runs at `confirm()` and may reject or transform the value.

[![▶ Live example: Imperative control](https://img.shields.io/badge/▶_Live_example-Imperative_control-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/imperative-control)

A few additional behaviours worth noting:

- **`startEdit` is synchronous** and returns `true` if it opened the session, or the reason it didn't: `'PATH_NOT_FOUND'` (the path doesn't exist in the current data) or `'RESTRICTED'` (`allowEdit` blocks it) — so you can give your own feedback (e.g. a toast) on a refused command. The target is never silently redirected to a different node.
- **`confirm()`** commits the open session — it triggers the same path as clicking the editor's confirm button, running your `onUpdate`. **`cancel()`** discards it. Only one session is open at a time, so both take no arguments.
- `startEdit` will **auto-reveal a target that's currently collapsed** — any collapsed ancestors expand so the node becomes visible and enters the session.

> [!NOTE]
> `JsonViewer` exposes the same `editorRef` prop, but its handle (`JsonViewerHandle`) is **collapse-only** — the editing actions aren't meaningful (and would bypass the read-only contract) in a viewer.

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Performance considerations

> [!Important]
> For a large data set, the single most effective thing you can do is **load it mostly collapsed** — the editor only renders nodes that are expanded into view, so a collapsed branch costs nothing until you open it.

Beyond that, `JsonEditor` re-renders at the granularity of a single node (editing one value re-renders just that node, not the whole tree), which you keep intact by passing referentially-stable props (below).


[![▶ Live example: Massive data set](https://img.shields.io/badge/▶_Live_example-Massive_data_set-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/massive-data)

### Keep non-callback props referentially stable

The editor decides whether a node can skip re-rendering by comparing its props **by reference**. So every object / array / function prop you pass should keep a **stable identity** across renders where it hasn't meaningfully changed — define it at module scope, or wrap it in `useMemo` / `useCallback`. A brand-new value every render — `customNodeDefinitions={[…]}`, `allowEdit={(node) => …}`, `theme={{ … }}` — silently defeats this: it still works correctly, it just re-renders far more than it needs to.

In practice this covers **every non-primitive prop except the event callbacks**, in particular:

- **`customNodeDefinitions`** — and, since they live inside it, the `condition` functions and `componentProps` of each definition.
- **The restriction / filter props, whenever you give them a function (or an array/object) rather than a plain boolean** — `allowEdit`, `allowDelete`, `allowAdd`, `allowDrag`, `allowTypeSelection`, `searchFilter`, `customText`, and `collapse` when it's a filter function rather than a number.
- **`theme`** (which carries your `icons`), **`translations`**, **`keyboardControls`**, **`customButtons`**, `collapseClickZones` — and any other object/array prop.

**The event callbacks are the exception — pass them inline freely.** `onUpdate`, `onChange`, `onError`, `onEditEvent`, `onCollapse` and `onCopy` are wrapped in a stable, always-latest identity internally, so an inline arrow there costs nothing. The stability rule is only about the *non-callback* props above.

`theme` is worth calling out specially: it feeds a React context, and a context update bypasses the per-node memo, so an **unstable `theme` re-renders the entire tree on every render** — not just one node. If you build a theme inline (e.g. `theme={['githubDark', { styles: … }]}`), memoise it.

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Undo functionality

Even though Undo/Redo functionality is probably desirable in most cases, this is not built in to the component, for two main reasons:
1. It would involve too much additional UI and this component is intentionally unopinionated about look and feel beyond the essentials (which are mostly customisable/style-able anyway)
2. It is quite straightforward to implement using existing libraries. In fact, I have provided a simple hook in the `@json-edit-react/utils` package called `useUndo`, which is what I'm using in the  [Demo](https://carlosnz.github.io/json-edit-react-v2/).


<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Exported helpers & types

A few helper functions, components and types that might be useful in your own implementations (from creating Filter or Update functions, or Custom components) are exported from the package:

### Functions & components

- `StringDisplay`: main component used to display a string value. Useful as a building block in custom components — handles truncation, "show more / show less" expansion, and the standard double-click-to-edit behaviour.
- `StringEdit`: component used when editing a string value, can be useful for custom components
- `AutogrowTextArea`: the auto-resizing textarea primitive used by `StringEdit` and the built-in string editor
- `useKeyboardListener`: hook that attaches a keyboard listener to an element without native keyboard behaviour (used internally for the `null` value); exported for re-use in [Custom components](#custom-nodes--components)
- `IconSvg`: renders an `IconDefinition`'s parts (`scale`, `viewBox`, inner markup as `children`, plus its `svgProps`) as an `<svg>` — the same renderer the editor uses for theme [icons](#icons); handy for previewing a glyph outside the editor
- `matchNode`, `matchNodeKey`: helpers for defining custom [Search](#search--filtering) functions
- `extract`: function to extract a deeply nested object value from a string path. Originally published at [object-property-extractor](https://github.com/CarlosNZ/object-property-extractor)
- `assign`: function to set a deep object value from a string path. Originally published at [object-property-assigner](https://github.com/CarlosNZ/object-property-assigner)
- `isCollection`: simple utility that returns `true` if input is a "Collection" (i.e. an Object or Array)
- `toPathString`: transforms a path array to a string representation suitable for HTML `name`/`id` attributes, e.g.  `["data", 0, "property1", "name"] => "data/0/property1/name"`. Keys are URL-encoded so the result is unambiguous even when keys contain `/` or other special characters.
- `splitPropertyString`: the rough inverse for dot/bracket notation — parses a property-path string into a path array, e.g. `"data.organisations.nodes[0]" => ["data", "organisations", "nodes", 0]`. Bracket indices become numbers (array indices); this is the same parsing `extract`/`assign` use, and is handy for building the `path` passed to the `editorRef` handle.
- `defaultTheme`: the "default" theme baseline used when no `theme` prop is supplied. (Additional themes ship in [`@json-edit-react/themes`](#using-a-prebuilt-theme-json-edit-reactthemes).)
- `standardDataTypes`: array containing all standard data types: `[ 'string','number', 'boolean', 'null', 'object', 'array' ]`
- `valueDataTypes`: the scalar subset of the above — `[ 'string', 'number', 'boolean', 'null' ]`
- `collectionDataTypes`: the container subset — `[ 'object', 'array' ]`

### Types

- `Theme`: a full [Theme](#customising-styles--the-theme-object) object
- `ThemeInput`: input type for the `theme` prop
- `JsonEditorProps<T>`: all input props for the Json Editor component. Generic on the data type — see [Typed data](#typed-data--jsoneditort).
- `JsonViewerProps<T>`: all input props for the read-only [`JsonViewer`](#read-only-display--jsonviewer) component — a subset of `JsonEditorProps`.
- `JsonData`: main `data` object -- any valid JSON structure. Used as the default for `T`.
- `NodeData`: the data-context object passed to every callback, [Filter function](#filter-functions) and [Custom component](#custom-nodes--components) — see [The `NodeData` object](#the-nodedata-object).
- [`UpdateFunction`](#onupdate--accept-reject-transform), [`UpdateResult`](#onupdate--accept-reject-transform), [`OnChangeFunction`](#onchange--validating-each-keystroke), [`OnErrorFunction`](#onerror), [`FilterFunction`](#filter-functions), [`OnCopyFunction`](#oncopy), [`SearchFilterFunction`](#custom-search--searchfilterfunction), [`OnEditEventFunction`](#listening-to-the-lifecycle--oneditevent) / [`EditEvent`](#listening-to-the-lifecycle--oneditevent), [`OnCollapseFunction`](#listening-to-expansion-events--oncollapse), [`CompareFunction`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort), [`TypeFilterFunction`](#filter-functions), [`NewKeyOptionsFunction`](#new-key-restrictions--default-values), [`DefaultValueFunction`](#new-key-restrictions--default-values)
- `CollapseState`: the shape passed to [`onCollapse`](#listening-to-expansion-events--oncollapse) and accepted by `editorRef.collapse()` — `{ path, collapsed, includeChildren }`.
- `JerError` / `JerErrorCode`: the canonical error shape (`{ code, message }`) reported to [`onError`](#onerror) and accepted in an [`UpdateFunction`](#onupdate--accept-reject-transform) `{ error }` return
- [`CustomNodeDefinition`](#custom-nodes--components), [`CustomButtonDefinition`](#custom-buttons), [`CustomTextDefinitions`](#dynamic-text--customtext), [`CustomTextFunction`](#dynamic-text--customtext), [`JsonEditorHandle`](#driving-the-editor--the-editorref-handle), [`JsonViewerHandle`](#driving-the-editor--the-editorref-handle), [`StartEditOptions`](#driving-the-editor--the-editorref-handle), [`StartEditResult`](#driving-the-editor--the-editorref-handle): input/output types of the respective props
- `TranslateFunction`: function that takes a [localisation](#localisation) key and returns a translated string
- `LocalisedStrings`: the full set of localisable UI strings — the type behind the [`translations`](#localisation) prop, which accepts a `Partial<LocalisedStrings>`
- `IconDefinition`: a themeable icon glyph (`content` plus optional `viewBox`/`svgProps`/`scale`) — see [Icons](#icons)
- `ThemeIcons`: the `theme.icons` map (icon name → `IconDefinition`)
- `CollectionNodeProps`: all props passed internally to "collection" nodes (i.e. objects/arrays)
- `ValueNodeProps`: all props passed internally to "value" nodes (i.e. *not* objects/arrays)
- `CustomComponentProps`: all props passed internally to [Custom nodes](#custom-nodes--components); basically the same as `CollectionNodeProps` with an extra `componentProps` field for passing props unique to your component
- `CustomKeyProps`: props passed to a [`keyComponent`](#customising-the-key--keycomponent) component — see the type definition for the full shape
- `CustomWrapperProps`: props passed to a [`wrapperComponent`](#collection-nodes) — the standard node props plus your `wrapperProps`
- `DataType`: `"string"` | `"number"` | `"boolean"` | `"null"` | `"object"` | `"array"`
- `TypeOptions`: the array form accepted by [`allowTypeSelection`](#restricting-data-types--allowtypeselection) — restricts which data types (and Enums) the user can select
- `EnumDefinition`: type of [Enum definition](#enums) objects
- `KeyboardControls`: structure for [keyboard customisation](#keyboard-control) prop
- `TextEditorProps`: props for custom [Text Editor](#replacing-the-textcode-editor--texteditor-codeeditor)
- `SelectProps`: props accepted by a custom `Select` component (supplied via the `Select` prop) that replaces the built-in native drop-down

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Issues & support

Please open an issue: https://github.com/CarlosNZ/json-edit-react/issues

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Inspiration

This component is heavily inspired by [react-json-view](https://github.com/mac-s-g/react-json-view), a great package that I've used in my own projects. However, it seems to have been abandoned now, and requires a few critical fixes, so I decided to create my own from scratch and extend the functionality while I was at it.

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

## Changelog

- **1.30.0**:
  - New [`customKey`](#customising-the-key--keycomponent) slot on `CustomNodeDefinition` — a definition can now render its own component in the key position, for both value and collection nodes ([#235](https://github.com/CarlosNZ/json-edit-react/pull/235), originally suggested by [@drahoslove](https://github.com/drahoslove) in [#233](https://github.com/CarlosNZ/json-edit-react/pull/233))
  - Internalise `extract` and `assign` utilities — package now has zero runtime dependencies ([#237](https://github.com/CarlosNZ/json-edit-react/pull/237))
- **1.29.1**: Squashed a bug where a parent re-render would revert data mid-edit when editing a whole collection as text ([#234](https://github.com/CarlosNZ/json-edit-react/pull/234))
- **1.29.0**: Option to display array indexes starting at "1" ([#62](https://github.com/CarlosNZ/json-edit-react/issues/62))
- **1.28.2**: When switching data type, only keep editing if new type is primitive ([#216](https://github.com/CarlosNZ/json-edit-react/issues/216))
- **1.28.1**: Fix left padding of root node when value is primitive ([#214](https://github.com/CarlosNZ/json-edit-react/issues/214))
- **1.28.0**:
  - (Optional) tooltips for icons ([#211](https://github.com/CarlosNZ/json-edit-react/pull/211))
  - Call `onEditEvent` when starting/stopping editing of a *new* key ([#208](https://github.com/CarlosNZ/json-edit-react/issues/208))
- **1.27.2**:
  - Bug fix for ":" not rendering when key is `0`
  - Slightly better detection of data type when copying value to clipboard text
- **1.27.0**: 
  - Option to handle custom collections as "Value" nodes ([#203](https://github.com/CarlosNZ/json-edit-react/issues/203))
  - Put `EMPTY_STRING: "<empty string>"` into translations
- **1.26.1**: Fix bug when submitting with keyboard after switching to `null` type ([#194](https://github.com/CarlosNZ/json-edit-react/pull/194))
- **1.26.0**:
  - Handle non-standard data types (e.g. `undefined`, `BigInt`) when stringifying/parsing JSON
  - More custom components (now published as [`@json-edit-react/components`](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components))
- **1.25.6**:
  - Expose a few more components and props to custom components
  - Start building Custom Component library (separate to main package)
- **1.25.4**: Don't treat Date objects as collections, so they can be handled by custom components (#187)[https://github.com/CarlosNZ/json-edit-react/issues/187]
- **1.25.1**: Small bug fix for incorrect resetting of cancelled edits (#184)[https://github.com/CarlosNZ/json-edit-react/issues/184]
- **1.25.0**:
  - Implement [External control](#programmatic-control) via event callbacks and triggers ([#138](https://github.com/CarlosNZ/json-edit-react/issues/138), [#145](https://github.com/CarlosNZ/json-edit-react/issues/145))
  - Define [enum](#enums) types ([#109](https://github.com/CarlosNZ/json-edit-react/issues/109))
  - Define [`newKeyOptions`](#new-key-restrictions--default-values) to restrict adding new properties to a pre-defined list ([#95](https://github.com/CarlosNZ/json-edit-react/issues/95))
- **1.24.0**:
  - Option to access (and render) the original node (and its key) within a [Custom Node](#custom-nodes--components) ([#180](https://github.com/CarlosNZ/json-edit-react/issues/180))
  - Cancelling edit after changing type correctly reverts to previous value ([#122](https://github.com/CarlosNZ/json-edit-react/issues/122))
- **1.23.1**: Fix bug where you could collapse a node by clicking inside a "new key" input field [#175](https://github.com/CarlosNZ/json-edit-react/issues/175)
- **1.23.0**:
  - Add `viewOnly` prop as a shorthand for restricting all editing [#168](https://github.com/CarlosNZ/json-edit-react/issues/168)
  - Add a toggle on the "..." of long strings so they can be expanded to full length in the UI [#172](https://github.com/CarlosNZ/json-edit-react/issues/172)
- **1.22.5**: Fix for crash when trying to switch to object type if new data is rejected by `onUpdate` function [#169](https://github.com/CarlosNZ/json-edit-react/issues/169) (thanks @kyaw-t) [#170](https://github.com/CarlosNZ/json-edit-react/pulls/170)
- **1.22.2**: Make `collapseAnimationTime` use local value rather than global CSS variable [#163](https://github.com/CarlosNZ/json-edit-react/issues/163)
- **1.22.1**: Fix custom nodes not re-calculating condition when `data` changes
- **1.22.0**:
  - Option for [custom text/code editor](#replacing-the-textcode-editor--texteditor-codeeditor) when editing full JSON object [#157](https://github.com/CarlosNZ/json-edit-react/issues/157)
  - Handle clipboard copy errors [#159](https://github.com/CarlosNZ/json-edit-react/pull/159) (thanks @dm-xai) [#160](https://github.com/CarlosNZ/json-edit-react/issues/160)
- **1.21.1**: Users can now navigate between nodes using "Tab"/"Shift-Tab" key
- **1.20.0**: Refactor out direct access of global `document` object, which allows component to work with server-side rendering
- **1.19.2**:
  - Boolean toggle key can be customised [#150](https://github.com/CarlosNZ/json-edit-react/issues/150)
  - Pass `nodeData` to [custom buttons](#custom-buttons) [#146](https://github.com/CarlosNZ/json-edit-react/issues/146)
- **1.19.0**: Built-in [themes](#using-a-prebuilt-theme-json-edit-reactthemes) must now be imported separately -- this improves tree-shaking to prevent unused themes being bundled with your build
- **1.18.0**:
  - Ability to [customise keyboard controls](#keyboard-control)
  - Option to insert new values at the top
- **1.17.0**: `defaultValue` function takes the new `key` as second parameter
- **1.16.0**: Extend the "click" zone for collapsing nodes to the header bar and left margin (not just the collapse icon)
- **1.15.12**:
  - [Custom buttons](#custom-buttons)
  - Misc small bug fixes
- **1.15.7**:
  - Small bug fix for `overflow: clip` setting based on animating
  state
  - Small tweak to outer bracket positioning
- **1.15.5**: Bug fix for collapse icon being clipped when indent is low #104
- **1.15.3**:
  - Allow [UpdateFunction](#onupdate--accept-reject-transform) to return `true` to represent success
  - Refactor collapse animation to improve lag and accuracy
- **1.15.2**:
  - Collapse animation timing is configurable (#96)
  - Bug fix for non-responsive keyboard submit for boolean values (#97)
- **1.15.0**: Remove ([JSON5](https://json5.org/)) from the package, and provided props for passing in *any* alternative JSON parsing and stringifying methods.
- **1.14.0**:
  - Allow [UpdateFunction](#onupdate--accept-reject-transform) to return a modified value, not just an error
  - Add `setData` prop to discourage reliance on internal data [state management](#managing-state)
  - Refactor state/event management to use less `useEffect` hooks
- **1.13.3**: Bug fix for when root data value is `null` [#90](https://github.com/CarlosNZ/json-edit-react/issues/90)
- **1.13.2**: Slightly better error handling when validating [JSON schema](#json-schema-validation)
- **1.13.0**:
  - [Drag-n-drop](#drag-and-drop-reordering) editing!
  - Remove unnecessary dependency
  - Refactor some duplicate code into common hook
- **1.12.0**:
  - Preserve editing mode when changing Data Type
  - [`onError` callback](#onerror) available for custom error handling
- **1.11.8**: Fix regression for empty data root name introduces in 1.11.7
- **1.11.7**: Handle \<empty-string\> object keys / prevent duplicate keys
- **1.11.3**: Bug fix for invalid state when changing type to Collection node
- **1.11.0**:
  - Improve CSS definitions to prevent properties from being overridden by the host environment's CSS
  - Add `rootFontSize` prop to set the "base" size for the component
- **1.10.2**:
  - Fixes for text wrapping and content overlaps when values and inputs contain very long strings (#57, #58)
  - Only allow one element to be edited at a time, and prevent collapsing when an inner element is being edited.
- **1.9.0**:
  - Increment number input using up/down arrow keys
  - Option to display string values without "quotes"
  - Add [`onChange` prop](#onchange--validating-each-keystroke) to allow validation/restriction of user input as they type
  - Don't update `data` if user hasn't actually changed a value (prevents Undo from being unnecessarily triggered)
  - Misc HTML warnings, React compatibility fixes
- **1.8.0**: Further improvements/fixes to collection custom nodes, including additional  `wrapperElement` [prop](#collection-nodes)
  - Add optional `id` prop
- **1.7.2**:
  - Fix and improve Custom nodes in *collections*
  - Include `index` in Filter (and other) function input
- **1.7.0**: Implement [Search/filtering](#search--filtering) of data visibility
- **1.6.1**: Revert data state on Update Function error
- **1.6.0**: Allow a function for `defaultValue` prop
- **1.5.0**:
  - Open/close all descendant nodes by holding "Alt"/"Option" while opening/closing a node
- **1.4.0**:
  - [Style functions](#customising-styles--the-theme-object) for context-dependent styling
  - Handle "loose" ([JSON5](https://json5.org/)) JSON text input(e.g. non-quoted keys, trailing commas, etc.)
- **1.3.0**:
  - [Custom (dynamic) text](#dynamic-text--customtext)
  - Add [hyperlink](#custom-nodes--components) Custom component to bundle
  - Better indentation of collection nodes (property name lines up with non-collection nodes, not the collapse icon)
- **1.2.2**: Allow editing of Custom nodes
- **1.1.0**: Don't manage data state within component
- **1.0.0**:
  - [Custom nodes](#custom-nodes--components)
  - Allow editing of keys
  - Option to define restrictions on data type selection
  - Option to hide array/object item counts
  - Improve keyboard interaction
- **0.9.6**: Performance improvement by not processing child elements if not visible
- **0.9.4**:
  - Layout improvements
  - Better internal handling of functions in data
- **0.9.3**: Bundle as ES6 module
- **0.9.1**: Export more Types from the package
- **0.9.0**: Initial release

<div align="right"><a href="#contents"><img src="https://img.shields.io/badge/↑_Back_to_Contents-555?style=flat" alt="Back to Contents"></a></div>

