# json-edit-react

<img width="60" alt="screenshot" src="image/logo192.png" style="float:left; margin-right: 1em;">

A [React](https://github.com/facebook/react) component for editing or viewing JSON/object data

Features include:

 - edit individual values, or whole objects as JSON text
 - fine-grained control over which elements can be edited, deleted, or added to
 - customisable UI, through simple, pre-defined [themes](#themes), or specific CSS overrides
 - self-contained — rendered with plain HTML/CSS, so no dependance on external UI libraries

**[Explore the Demo](https://carlosnz.github.io/json-edit-react/)**

<img width="392" alt="screenshot" src="image/screenshot.png">

- [Installation](#installation)
- [Implementation](#implementation)
- [Usage](#usage)
- [Props overview](#props-overview)
- [Update functions](#update-functions)
  - [Copy function](#copy-function)
- [Filter functions](#filter-functions)
  - [Examples](#examples)
- [Themes](#themes)
  - [Fragments](#fragments)
  - [A note about sizing and scaling](#a-note-about-sizing-and-scaling)
  - [Icons](#icons)
- [Localisation](#localisation)
- [Undo functionality](#undo-functionality)
- [Issues, bugs, suggestions?](#issues-bugs-suggestions)
- [Roadmap](#roadmap)
- [Inspiration](#inspiration)
- [Changelog](#changelog)


## Installation

`npm i json-edit-react`

or 

`yarn add json-edit-react`

## Implementation

```js
import { JsonEditor } from 'json-edit-react'

// In your React components:
<JsonEditor data={ myDataObject } { ...props }>

```

## Usage

**(for end user)**

It's pretty self explanatory (click the "edit" icon to edit, etc.), but there are a few not-so-obvious ways of interacting with the editor:

- Double-click a value to edit it
- When editing a string, use `Cmd/Ctrl/Shift-Enter` to add a new line (`Enter` submits the value)
- It's the opposite when editing a full object/array node (which you do by clicking "edit" on an object or array value) — `Enter` for new line, and `Cmd/Ctrl/Shift-Enter` for submit
- `Escape` to cancel editing
- When clicking the "clipboard" icon, holding down `Cmd/Ctrl` will copy the *path* to the selected node rather than its value

## Props overview

The only *required* value is `data`. 

| prop               | type                                         | default     | description                                                                                                                                                                                                                                                                                        |
| ------------------ | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`             | `object\|array`                              |             | The data to be displayed / edited                                                                                                                                                                                                                                                                  |
| `rootName`         | `string`                                     | `"data"`    | A name to display in the editor as the root of the data object.                                                                                                                                                                                                                                    |
| `onUpdate`         | `UpdateFunction`                             |             | A function to run whenever a value is **updated** (edit, delete *or* add) in the editor. See [Update functions](#update-functions).                                                                                                                                                                |
| `onUpdate`         | `UpdateFunction`                             |             | A function to run whenever a value is **edited**.                                                                                                                                                                                                                                                  |
| `onDelete`         | `UpdateFunction`                             |             | A function to run whenever a value is **deleted**.                                                                                                                                                                                                                                                 |
| `onAdd`            | `UpdateFunction`                             |             | A function to run whenever a new property is **added**.                                                                                                                                                                                                                                            |
| `enableClipboard`  | `boolean\|CopyFunction`                      | `true`      | Whether or not to enable the "Copy to clipboard" button in the UI. If a function is provided, `true` is assumed and this function will be run whenever an item is copied.                                                                                                                          |
| `indent`           | `number`                                     | `4`         | Specify the amount of indentation for each level of nesting in the displayed data.                                                                                                                                                                                                                 |
| `collapse`         | `boolean\|number\|FilterFunction`            | `false`     | Defines which nodes of the JSON tree will be displayed "opened" in the UI on load. If `boolean`, it'll be either all or none. A `number` specifies a nesting depth after which nodes will be closed. For more fine control a function can be provided — see [Filter functions](#filter-functions). |
| `restrictEdit`     | `boolean\|FilterFunction`                    | `false`     | If `false`, no editing is permitted. A function can be provided for more specificity — see [Filter functions](#filter-functions)                                                                                                                                                                   |
| `restrictDelete`   | `boolean\|FilterFunction`                    | `false`     | As with `restrictEdit` but for deletion                                                                                                                                                                                                                                                            |
| `restrictAdd`      | `boolean\|FilterFunction`                    | `false`     | As with `restrictEdit` but for adding new properties                                                                                                                                                                                                                                               |
| `keySort`          | `boolean\|CompareFunction`                   | `false`     | If `true`, object keys will be ordered (using default JS `.sort()`). A [compare function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) can also be provided to define sorting behaviour.                                                           |
| `showArrayIndices` | `boolean`                                    | `true`      | Whether or not to display the index (as a property key) for array elements.                                                                                                                                                                                                                        |
| `defaultValue`     | `any`                                        | `null`      | When a new property is added, it is initialised with this value.                                                                                                                                                                                                                                   |
| `stringTruncate`   | `number`                                     | `250`       | String values longer than this many characters will be displayed truncated (with `...`). The full string will always be visible when editing.                                                                                                                                                      |
| `translations`     | `LocalisedStrings` object                    | `{ }`       | UI strings (such as error messages) can be translated by passing an object containing localised string values (there are only a few). See [Localisation](#localisation)                                                                                                                            |
| `theme`            | `string\|ThemeObject\|[string, ThemeObject]` | `"default"` | Either the name of one of the built-in themes, or an object specifying some or all theme properties. See [Themes](#themes).                                                                                                                                                                        |
| `className`        | `string`                                     |             | Name of a CSS class to apply to the component. In most cases, specifying `theme` properties will be more straightforward.                                                                                                                                                                          |
| `icons`            | `{[iconName]: JSX.Element, ... }`            | `{ }`       | Replace the built-in icons by specifying them here. See [Themes](#themes).                                                                                                                                                                                                                         |  |
| `minWidth`         | `number\|string` (CSS value)                 | `250`       | Minimum width for the editor container.                                                                                                                                                                                                                                                            |
| `maxWidth`         | `number\|string` (CSS value)                 | `600`       | Maximum width for the editor container.                                                                                                                                                                                                                                                            |

## Update functions

A callback to be executed whenever a data update (edit, delete or add) occurs can be provided. You might wish to use this to update some state, or make an API call, for example. If you want the same function for all updates, then just the `onUpdate` prop is sufficient. However, should you require something different for editing, deletion and addition, then you can provide separate Update functions via the `onEdit`, `onDelete` and `onAdd` props.

The function will receive the following object as a parameter:

```js
{
    newData,      // data state after update
    currentData,  // data state before update 
    newValue,     // the new value of the property being updated
    currentValue, // the current value of the property being updated
    name,         // name of the property being updated
    path          // full path to the property being updated, as an array of property keys
                  // (e.g. [ "user", "friends", 1, "name" ] ) (equivalent to "user.friends[1].name")
}
```

The function needn't return anything, but if it returns `false`, it will be considered an error, in which case an error message will displayed in the UI and the internal data state won't actually be updated. If the return value is a `string`, this will be the error message displayed (i.e. you can define your own error messages for updates).

### Copy function

A similar callback is executed whenever an item is copied to the clipboard (if passed to the `enableClipboard` prop), but with a different input parameter:

```js
    key         // name of the property being copied  
    path        // path to the property
    value       // the value copied to the clipboard
    type        // Either "path" or "value" depending on whether "Cmd/Ctrl" was pressed 
    stringValue // A nicely stringified version of `value`  
                // (i.e. what the clipboard actually receives)
```

Since there is very little user feedback when clicking "Copy", a good idea would be to present some kind of notification in this callback.

## Filter functions

You can control which nodes of the data structure can be edited, deleted, or added to by passing Filter functions. These will be called on each property in the data and the attribute will be enforced depending on whether the function returns `true` or `false` (`true` means *cannot* be edited).

The function receives the following object:
```js
{
    key,   // name of the property
    path,  // path to the property (as an array of property keys)
    level, // depth of the property (with 0 being the root)
    value, // value of the property
    size   // if a collection (object, array), the number of items (null for non-collections)
}
```

A Filter function is available for the `collapse` prop as well, so you can have your data appear with deeply-nested collections opened up, while collapsing everything else, for example.

### Examples

- A good case would be ensure your root node is not directly editable:

```js
// in <JsonEditor /> props
restrictEdit = { ({ level }) => level === 0 }
```

- Don't let the `id` field be edited:

```js
restrictEdit = { ({ key }) => key === "id" }
// You'd probably want to include this in `restrictDelete` as well
```

- Only individual properties can be deleted, not objects or arrays:

```js
restrictDelete = { ({ size }) => size !== null }
```

- The only collections that can have new items added are the "address" object and the "users" array:
```js
restrictAdd = { ({ key }) => key !== "address" && key !== "users" }
// "Adding" is irrelevant for non-collection nodes
```

## Themes

There is a small selection of built-in themes (as seen in the [Demo app](https://carlosnz.github.io/json-edit-react/)). In order to use one of these, just pass the name into the `theme` prop (although realistically, these exist more to showcase the capabilities  — I'm open to better built-in themes, so feel free to [create an issue](https://github.com/CarlosNZ/json-edit-react/issues) with suggestions). The available themes are:
- `default`
- `githubDark`
- `githubLight`
- `monoDark`
- `monoLight`
- `candyWrapper`
- `psychedelic`

However, you can pass in your own theme object, or part thereof. The theme structure is as follows (this is the "default" theme definition):

```js
{
  displayName: 'Default',
  fragments: { edit: 'rgb(42, 161, 152)' },
  styles: {
    container: {
      backgroundColor: '#f6f6f6',
      fontFamily: 'monospace',
    },
    property: '#292929',
    bracket: { color: 'rgb(0, 43, 54)', fontWeight: 'bold' },
    itemCount: { color: 'rgba(0, 0, 0, 0.3)', fontStyle: 'italic' },
    string: 'rgb(203, 75, 22)',
    number: 'rgb(38, 139, 210)',
    boolean: 'green',
    null: { color: 'rgb(220, 50, 47)', fontVariant: 'small-caps', fontWeight: 'bold' },
    input: ['#292929', { fontSize: '90%' }],
    inputHighlight: '#b3d8ff',
    error: { fontSize: '0.8em', color: 'red', fontWeight: 'bold' },
    iconCollection: 'rgb(0, 43, 54)',
    iconEdit: 'edit',
    iconDelete: 'rgb(203, 75, 22)',
    iconAdd: 'edit',
    iconCopy: 'rgb(38, 139, 210)',
    iconOk: 'green',
    iconCancel: 'rgb(203, 75, 22)',
  },
}

```

The `styles` property is the main one to focus on. Each key (`property`, `bracket`, `itemCount`) refers to a part of the UI. The value for each key is *either* a `string`, in which case it is interpreted as the colour (or background colour in the case of `container` and `inputHighlight`), *or* a full CSS style object for fine-grained definition. You only need to provide properties you wish to override — all unspecified ones will fallback to either the default theme, or another theme that you specify as the "base".

For example, if you want to use the "githubDark" theme, but just change a couple of small things, you'd specify something like this:

```js
// in <JsonEditor /> props
theme={[
        'githubDark',
        {
            iconEdit: 'grey',
            boolean: { color: 'red', fontStyle: 'italic', fontWeight: 'bold', fontSize: '80%' },
        },
      ]}
```

Which would change the "Edit" icon and boolean values from this:  
<img width="218" alt="Github Dark theme original" src="image/theme_edit_before.png">  
into this:  
<img width="218" alt="Github Dark theme modified" src="image/theme_edit_after.png">

Or you could create your own theme from scratch and overwrite the whole theme object.

So, to summarise, the `theme` prop can take *either*:

- a theme name e.g. `"candyWrapper"`
- a theme object:
  - can be structured as above with `fragments`, `styles`, `displayName` etc., or just the `styles` part (at the root level)
- a theme name *and* an override object in an array, i.e. `[ "<themeName>, {...overrides } ]`

You can play round with live editing of the themes in the [Demo app](https://carlosnz.github.io/json-edit-react/) by selecting "Edit this theme!" from the "Demo data" selector.

### Fragments

The `fragments` property above is just a convenience to allow repeated style "fragments" to be defined once and referred to using an alias. For example, if you wanted all your icons to be blue and slightly larger and spaced out, you might define a fragment like so:
```js
fragments: { iconAdjust: { color: "blue", fontSize: "110%", marginRight: "0.6em" }}
```

Then in the theme object, just use:
```js
{
    ...,
    iconEdit: "iconAdjust",
    iconDelete: "iconAdjust",
    iconAdd: "iconAdjust",
    iconCopy: "iconAdjust",
}
```

Then, when you want to tweak it later, you only need to update it in one place!

Fragments can also be mixed with additional properties, and even other fragments, like so:
```js
iconEdit: [ "iconAdjust", "anotherFragment", { marginLeft: "1em" } ]
```

### A note about sizing and scaling

Internally, all sizing and spacing is done in `em`s, never `px`. This makes scaling a lot easier — just change the font-size of the main container (either via the `className` prop or in the `container` prop of the theme) (or its parent), and watch the *whole* component scale accordingly.

### Icons

The default icons can be replaced, but you need to provide them as React/HTML elements. Just define any or all of them within the `icons` prop, keyed as follows:

```js
 icons={{
  add: <YourIcon /> 
  edit: <YourIcon /> 
  delete: <YourIcon />
  copy: <YourIcon />
  ok: <YourIcon />
  cancel: <YourIcon />
  chevron: <YourIcon />
}}
```

The Icon components will need to have their own styles defined, as the theme styles *won't* be added to the custom elements.

## Localisation

Localise your implementation by passing in a `translations` object to replace the default strings. The keys and default (English) values are as follows:
```js
{
  ITEM_SINGLE: '{{count}} item',
  ITEMS_MULTIPLE: '{{count}} items',
  KEY_NEW: 'Enter new key',
  ERROR_KEY_EXISTS: 'Key already exists',
  ERROR_INVALID_JSON: 'Invalid JSON',
  ERROR_UPDATE: 'Update unsuccessful',
  ERROR_DELETE: 'Delete unsuccessful',
  ERROR_ADD: 'Adding node unsuccessful',
}

```

## Undo functionality

Even though Undo/Redo functionality is probably desirable in most cases, this is not built in to the component, for two main reasons:
1. It would involve too much additional UI and I didn't want this component becoming opinionated about the look and feel beyond the essentials (which are mostly customisable/style-able anyway)
2. It is quite straightforward to implement using existing libraries. I've used **[use-undo](https://github.com/homerchen19/use-undo)** in the [Demo](https://carlosnz.github.io/json-edit-react/), which is working well.

## Issues, bugs, suggestions?

Please open an issue: https://github.com/CarlosNZ/json-edit-react/issues

## Roadmap

The main features I'd like to introduce are:

1. **JSON Schema validation**. We can currently specify a reasonable degree of control over what can be edited using [Filter functions](#filter-functions) with the restriction props, but I'd like to go a step further and be able to pass in a [JSON Schema](https://json-schema.org/) and have the data be automatically validated against it, with the results reflected in the UI. This would allow control over data types and prevent missing properties, something that is not currently possible.
2. **Visibility filter function** — *hide* properties from the UI completely based on a Filter function. This should arguably be done outside the component though (filter the data upstream), so would be less of a priority (though it would be fairly simple to implement, so 🤷‍♂️)
3. **Search** — allow the user to narrow the list of visible keys with a simple search input. This would be useful for very large data objects, but is possibly getting a bit too much in terms of opinionated UI, so would need to ensure it can be styled easily. Perhaps it would be better if the "Search" input was handled outside this package, and we just accepted a "search" string prop?

## Inspiration

This component is heavily inspired by [react-json-view](https://github.com/mac-s-g/react-json-view), a great package that I've used in my own projects. However, it seems to have been abandoned now, and requires a few critical fixes, so I decided to create my own from scratch and extend the functionality while I was at it.

## Changelog

- **0.9.6**: Performance improvement by not processing child elements if not visible
- **0.9.4**:
  - Layout improvements
  - Better internal handling of functions in data
- **0.9.3**: Bundle as ES6 module
- **0.9.1**: Export more Types from the package
- **0.9.0**: Initial release

