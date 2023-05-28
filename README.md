# json-edit-react

<img width="60" alt="screenshot" src="image/logo192.png" style="float:left; margin-right: 1em;">

A React component for editing<br/> or viewing JSON/object data


Features include:

 - edit individual values, or whole objects as JSON text
 - fine-grained control over which elements can be edited, deleted, or added to
 - customisable UI, through simple, pre-defined [themes](#theme-link), or specific CSS overrides
 - self-contained -- constructed with HTML/CSS, so no dependance on external UI libraries

**[Explore the Demo](https://carlosnz.github.io/fig-tree-evaluator/)**

<img width="392" alt="screenshot" src="image/screenshot.png">

## Installation

`npm i json-edit-react`

or 

`yarn add json-edit-react`

## Implementation

```js
import { JsonEditor } from 'json-edit-react'

// In your React components:
<JsonEditor data={ myObject } { ...props }>

```

## Usage

**(for end user)**

It's pretty self explanatory (click the "edit" icon to edit, etc.), but there are a few not-so-obvious ways of interacting with the editor:

- Double-click a value to edit it
- When editing a string, use `Cmd/Ctrl/Shift-Enter` to add a new line (`Enter` submits the value)
- It's the opposite when editing a full object/array node (which you do by clicking "edit" on an object or array value) -- `Enter` for new line, and `Cmd/Ctrl/Shift-Enter` for submit
- `Escape` to cancel editing
- When clicking the "clipboard" icon, holding down `Cmd/Ctrl` will copy the *path* to the selected node rather than its value

## Props overview

The only *required* value is `data`. 

| prop               | type                                | default     | description                                                                                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`             | `object`\|`array`                   | `{}`        | The data to be displayed / edited                                                                                                                                                                                                                                                             |
| `rootName`         | `string`                            | `"data"`    | The name for the base object to display in the editor                                                                                                                                                                                                                                         |
| `onUpdate`         | `Function`                          |             | A function to run every time a value is **updated** (edit, delete *or* add) in the editor. See [Update methods](#update-methods).                                                                                                                                                             |
| `onUpdate`         | `UpdateMethod`                      |             | A function to run every time a value is **edited**.                                                                                                                                                                                                                                           |
| `onDelete`         | `UpdateMethod`                      |             | A function to run every time a value is **deleted**.                                                                                                                                                                                                                                          |
| `onAdd`            | `UpdateMethod`                      |             | A function to run every time a new property is **added**.                                                                                                                                                                                                                                     |
| `enableClipboard`  | `boolean`\|`CopyMethod`             | `true`      | Whether or not to enable the "Copy to clipboard" button in the UI. If a Function is provided, `true` is assumed and this function will be run whenever an item is copied.                                                                                                                     |
| `theme`            | `string`\|`ThemeObject`             | `"default"` | Either the name of one of the built-in themes, or an object specifying some or all theme properties. See [Themes](#themes).                                                                                                                                                                   |
| `className`        | `string`                            |             | Name of a CSS class to apply to the component. In most cases, specifying `theme` properties will be more straightforward.                                                                                                                                                                     |
| `icons`            | `{[iconName]: JSX.Element, ... }`   | `{}`        | If you want to replace the built-in icons with your own, specify them here. See [Themes](#themes).                                                                                                                                                                                            |  |
| `indent`           | `number`                            | `4`         | Specify the amount of indentation for each level of nesting in the data object.                                                                                                                                                                                                               |
| `collapse`         | `boolean`\|`number`\|`FilterMethod` | `false`     | Defines which nodes of the JSON tree will be displayed open in the UI on load. If `boolean`, it'll be either all or none. If a `number` specifies a nesting depth after which nodes will be closed. For more fine control a function can be provided -- See [Filter methods](#filter-methods) |
| `restrictEdit`     | `boolean`\|`FilterMethod`           | `false`     | If `false`, no editing is permitted. A function can be provided for more specificity -- See [Filter methods](#filter-methods)                                                                                                                                                                 |
| `restrictDelete`   | `boolean`\|`FilterMethod`           | `false`     | As with `restrictEdit` but for deletion                                                                                                                                                                                                                                                       |
| `restrictAdd`      | `boolean`\|`FilterMethod`           | `false`     | As with `restrictEdit` but for adding new properties                                                                                                                                                                                                                                          |
| `keySort`          | `boolean`\|`CompareFunction`        | `false`     | If `true`, object keys will be ordered (using default JS `.sort()`). A [compare function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) can also be provided to define sorting behaviour.                                                      |
| `showArrayIndices` | `boolean`                           | `true`      | Whether or not to display numeric indices as keys of Array values.                                                                                                                                                                                                                            |
| `defaultValue`     | `any`                               | `null`      | When a new property is added, it is initialised with this value.                                                                                                                                                                                                                              |
| `minWidth`         | `number`\|`string` (CSS value)      | `250`       | Minimum width for the editor container.                                                                                                                                                                                                                                                       |
| `maxWidth`         | `number`\|`string` (CSS value)      | `600`       | Maximum width for the editor container.                                                                                                                                                                                                                                                       |
| `stringTruncate`   | `number`                            | `250`       | String values longer than this many characters will be displayed truncated (with `...`). The full string will always be visible when editing.                                                                                                                                                 |
| `translations`     | `LocalisedStrings` object           | {}          | UI strings (such as error messages) can be translated by passing an object containing localised string values (there are only a few). See [Localisation](#localisation)                                                                                                                       |

