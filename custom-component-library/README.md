A collection of [Custom Components](https://github.com/CarlosNZ/json-edit-react#custom-nodes) for **json-edit-react**. 

Eventually, I'd like to publish these in a separate package so you can easily import them. But for now just copy the code out of this repo.

Contains a [Vite](https://vite.dev/) web-app for previewing and developing components.

The individual components are in the `/components` folder, along with demo data (in `data.ts`).

> [!NOTE]
> If you create a custom component that you think would be useful to others, please [create a PR](https://github.com/CarlosNZ/json-edit-react/pulls) for it.

## Components

These are the ones currently available:

- [x] Hyperlink/URL
- [x] Undefined
- [x] Date Object
- [x] Date/Time Picker (with ISO string)
- [x] Boolean Toggle
- [x] `NaN`
- [x] BigInt

## Development

From within this folder: `/custom-component-library`:

Install dependencies:

```js
yarn install
```

Launch app:

```js
yarn dev
```

## Guidelines for development:

Custom components should consider the following:

- Must respect editing restrictions
- If including CSS classes, please prefix with `jer-`
- Handle keyboard input if possible
- Provide customisation options, particularly styles

