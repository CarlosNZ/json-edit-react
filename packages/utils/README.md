# @json-edit-react/utils

A collection of hooks and helpers for **[json-edit-react](https://github.com/CarlosNZ/json-edit-react)** to make utilising more advanced features of **json-edit-react** easier, but without polluting the core with excess functionality. Undo/redo, confirmation dialogs, reactive validation, composable filter builders, and more — each one is optional, tree-shakeable, and brings no runtime dependencies of its own.

> [!IMPORTANT]
> Requires **json-edit-react** version 2.x

## Install

```sh
npm install @json-edit-react/utils
# or
yarn add @json-edit-react/utils
# or
pnpm add @json-edit-react/utils
```

`json-edit-react` and `react` are peer dependencies.

## Undo / redo

Add **undo**/**redo** to the editor in a couple of lines. `useUndo` wraps your `data`/`setData`, tracks changes, and returns ready-to-wire `undo` / `redo` / `canUndo` / `canRedo` 

Try it out in the [Demo](https://carlosnz.github.io/json-edit-react-v2/).

[Read more →](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/utils/src/undo/README.md)

## Confirm before update

Gate edits, deletions, or any change behind a confirmation dialog —— this solves the common problem of `await`-ing a modal result, when a React modal is fundamentally declarative.

 `useConfirmOnUpdate` hands you a ready-made `onUpdate` and the dialog state to drive your own modal — You provide the modal UI, we handle the data flow. `useJsonEditorConfirm` is the lower-level primitive for flows a single synchronous confirm can't express (confirming on `await`ed work, multiple confirmations in one update, or actions outside `onUpdate`).

[![▶ Live example: Modal confirmation](https://img.shields.io/badge/▶_Live_example-Modal_confirmation-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/confirm-and-settle)

[Read more →](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/utils/src/confirm-update/README.md)

## Reactive validation

You can already validate your data against a JSON Schema or some other rule set, but if you want the validation state to be reflected in the UI (styled nodes, custom icons, etc), reach for this utility, particularly if you have cross-node validation (i.e. changes in one value affect the )

Run your own validator over the whole document and flag invalid nodes — in styles, a custom-node glyph, or `allow*` gates — with the right answer even for cross-branch validity effects that fine-grained re-rendering would otherwise leave stale. `useValidationState` returns an O(1), identity-stable error index; `validationStyles` turns it into theme sugar and `ajvAdapter` bridges a compiled AJV validator. It's built on `useStableValue`, an identity-stabilizer exported in its own right for any other cross-branch derived value. Zero runtime dependencies — you bring the validator.

[Read more →](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/utils/src/validation/README.md)

## Filter-function toolkit

Compose the `allow*` props and `searchFilter` from small, named, readable pieces instead of hand-rolled callbacks — `and(not(byKey('id')), byLevel({ min: 2 }))`. Property builders (`byKey`, `byPath`, `byLevel`, `byType`, …), position constants (`root`, `collections`, `primitives`, …), `and` / `or` / `not` combinators, and search bridges, every one inline-safe: each result is interned, so you write them straight on a prop with no `useMemo`.

[![▶ Live example: Filter toolkit](https://img.shields.io/badge/▶_Live_example-Filter_toolkit-2ea44f?style=for-the-badge)](https://carlosnz.github.io/json-edit-react-v2/examples/filter-toolkit)

[Read more →](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/utils/src/filters/README.md)

## Icon definitions from SVG

Drop a copied SVG straight into a theme's `icons`. `iconFromSvg` turns raw SVG markup (or a React `<svg>` element) into the `IconDefinition` core expects — stripping the outer tag and lifting `viewBox` and presentation attributes into the right fields — so the glyph picks up your theme's icon colour and sizing automatically. Zero runtime dependencies.

[Read more →](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/utils/src/icon/README.md)

## Planned utilities

### JSON Schema → Filter Functions

Generate `allowEdit` / `allowDelete` / `allowAdd` (and friends) directly from a JSON Schema, so the editor UI can't produce invalid data in the first place — the preventive complement to reactive validation. ([#285](https://github.com/CarlosNZ/json-edit-react/issues/285))

### Search helpers

Ready-made `searchFilter` functions for common search patterns, plus a helper to auto-expand the collapsed ancestors of search matches. ([#319](https://github.com/CarlosNZ/json-edit-react/issues/319))

Have an idea, or built something useful yourself? Create an [issue](https://github.com/CarlosNZ/json-edit-react/issues) or a [PR](https://github.com/CarlosNZ/json-edit-react/pulls).

## License

MIT
