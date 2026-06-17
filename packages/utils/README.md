# @json-edit-react/utils

Utility hooks and helpers for [json-edit-react](https://github.com/CarlosNZ/json-edit-react).

> **Status: early/nascent.** This package is being assembled — the helpers below are planned, not all shipped yet. See the linked issues for current state.

## Install

```sh
npm install @json-edit-react/utils
# or
yarn add @json-edit-react/utils
# or
pnpm add @json-edit-react/utils
```

`json-edit-react` and `react` are peer dependencies.

## What's here

- **Confirm-before-update hooks** — gate edits/deletes on a confirmation dialog without hand-rolling the deferred-promise dance. _Available now._ ([#307](https://github.com/CarlosNZ/json-edit-react/issues/307))
- **Undo / redo** — wrap a consumer-owned `data`/`setData` pair with undo/redo (snapshot stacks plus `canUndo` / `canRedo`), zero-dep. _Available now._
- **Reactive validation** — `useValidationState` runs your validator over the whole document and exposes an O(1), identity-stable error index, so styles / filters / conditions reflect validity correctly even for cross-branch effects. Ships `validationStyles` (theme sugar), `ajvAdapter`, and the `useStableValue` primitive it's built on. Zero-dep (you bring your own validator). _Available now._ ([#357](https://github.com/CarlosNZ/json-edit-react/issues/357))
- **Filter-function toolkit** — composable predicate builders (`byKey`, `byPath`, `byLevel`, `byType`, …), `and` / `or` / `not` combinators, and search bridges for the `allow*` props and `searchFilter`. Zero-dep. _Available now._ ([#343](https://github.com/CarlosNZ/json-edit-react/issues/343))
- **Icon definitions from SVG** — `iconFromSvg` turns raw SVG markup (or a React `<svg>`) into the `IconDefinition` a theme's `icons` expects, so a copied icon drops straight into a theme. Zero-dep. _Available now._ ([#369](https://github.com/CarlosNZ/json-edit-react/issues/369))
- **JSON Schema → Filter Functions** — generate `allowEdit` / `allowDelete` / `allowAdd` (etc.) functions from a JSON Schema so the editor UI can't produce invalid data in the first place. _Planned._ ([#285](https://github.com/CarlosNZ/json-edit-react/issues/285))
- **Search helpers** — ready-made `searchFilter` functions for common search patterns. _Planned._ ([#319](https://github.com/CarlosNZ/json-edit-react/issues/319))

## Confirm before update

Core commits optimistically by default, so to *gate* an edit on a dialog you call `control.hold()`: it keeps the edited node's editor open and blocks the rest of the tree until you `release()` (commit) or return `null` (silent cancel). `hold()` must run synchronously, before the first `await`. These hooks package that up — they hold the edit open until the user answers a confirmation dialog, then commit or revert based on the answer. **No modal ships with the library** — you bring your own (any modal component, or a plain `<div>`) and drive it from the returned `dialog` object.

### `useConfirmOnUpdate` — the common case

Declare _when_ to confirm and _what_ to say; you get back a ready-made `onUpdate` plus the `dialog` state for your modal:

```tsx
import { JsonEditor } from 'json-edit-react'
import { useConfirmOnUpdate } from '@json-edit-react/utils'

const MyEditor = () => {
  const [data, setData] = useState(initialData)

  const { onUpdate, dialog } = useConfirmOnUpdate({
    confirmOn: ['delete', 'edit'], // event names, or a predicate: (input) => boolean
    title: 'Please confirm',
    message: (input) => `${input.event} "${String(input.key)}"?`,
    // Optional: your own update logic, runs only after the user confirms
    // onUpdate: async (input) => { /* … */ },
  })

  return (
    <>
      <JsonEditor data={data} setData={setData} onUpdate={onUpdate} />
      <MyModal {...dialog} />
    </>
  )
}
```

### `useJsonEditorConfirm` — the primitive

`useConfirmOnUpdate`'s `confirmOn` predicate already covers any _condition_, so reach for this lower-level hook for flows its single, synchronous confirm can't express: confirming based on `await`ed work, more than one confirmation in a single update, or reusing the dialog for actions outside `onUpdate`. You write the `onUpdate` yourself — including the `hold()` gate — and `confirm()` returns a `Promise<boolean>`:

```tsx
const { confirm, dialog } = useJsonEditorConfirm()

<JsonEditor
  onUpdate={async (input, { hold }) => {
    if (input.event === 'delete') {
      // Open the gate FIRST, synchronously, so the editor stays open while we work.
      const release = hold()
      // The decision to confirm — and the message — come from async work, which
      // `useConfirmOnUpdate`'s synchronous `confirmOn`/`message` can't do.
      const { inUse, usedBy } = await checkReferences(input.path)
      if (inUse) {
        const ok = await confirm({
          title: 'Still in use',
          message: `Referenced by ${usedBy.join(', ')}. Delete anyway?`,
        })
        if (!ok) return null // null = silent cancel; nothing is applied
      }
      release() // commit + close now
    }
  }}
/>
<MyModal {...dialog} />
```

### Showing a "saving…" state while a slow `onUpdate` settles

The gate keeps the editor open during the *dialog*; once confirmed, the edit commits optimistically and your `onUpdate` (if any) settles in the *background*. To show that a node's save is still in flight, use core's `isPending` prop on a custom node — it's `true` for exactly that settlement window. Nothing from this package is needed for it; see the editor's CustomNodes docs.

### Wiring your modal

`dialog` is the only contract. Render your modal from it — `isOpen` controls visibility, `onConfirm` / `onCancel` are the button handlers, and `title` / `message` (plus any extra keys you pass to `confirm()`) carry the content:

```tsx
const MyModal = (dialog) =>
  dialog.isOpen ? (
    <div className="backdrop" onClick={dialog.onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{dialog.title}</h2>
        <p>{dialog.message}</p>
        <button onClick={dialog.onCancel}>Cancel</button>
        <button onClick={dialog.onConfirm}>Confirm</button>
      </div>
    </div>
  ) : null
```

## Undo / redo

`useUndo` wraps your `data`/`setData` pair with undo/redo. It's **controlled** — you keep owning the data (your own `useState`); the hook holds only the snapshot stacks and commits through your `setData`. Pass the returned `set` as the editor's `setData`:

```tsx
import { JsonEditor } from 'json-edit-react'
import { useUndo } from '@json-edit-react/utils'

const MyEditor = () => {
  const [data, setData] = useState(initialData)
  const { set, undo, redo, canUndo, canRedo } = useUndo(data, setData)

  return (
    <>
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
      <JsonEditor data={data} setData={set} />
    </>
  )
}
```

`set` records a snapshot then commits; `undo` / `redo` step through history (no-ops at the ends); `replace` commits without a snapshot; `reset` commits a new baseline and clears history; `canUndo` / `canRedo` drive your buttons.

**Loading a new dataset:** call `reset(newData)`, not `setData` — the hook only sees changes that go through its own API, so `reset` is how you swap the document and clear stale history in one step. See [src/undo/README.md](src/undo/README.md) for the full rationale.

## Reactive validation

`useValidationState` runs a validator over the whole document and returns a queryable, identity-stable error index (`isValid`, `errors`, `hasErrorAt`, `errorsAt`, `hasErrorWithin`). It's designed for json-edit-react's fine-grained re-rendering: validating inline in a style function goes stale when an edit on one node changes the validity of a node on *another* branch (which doesn't re-render). This hook ties the result's identity to the error set, so memoizing a `theme` / `customNodeDefinitions` / `allow*` value on it re-renders the tree exactly when validity changes — and never on a valid→valid commit.

```tsx
import { useMemo, useState } from 'react'
import { JsonEditor } from 'json-edit-react'
import { useValidationState, validationStyles, ajvAdapter } from '@json-edit-react/utils'
import Ajv from 'ajv'

const validate = ajvAdapter(new Ajv({ allErrors: true }).compile(schema))

const MyEditor = () => {
  const [data, setData] = useState(initialData)
  const validation = useValidationState(data, validate)
  const theme = useMemo(() => [myTheme, validationStyles(validation)], [validation])

  return <JsonEditor data={data} setData={setData} theme={theme} />
}
```

You bring your own validator (`ajvAdapter` wraps a compiled AJV function; or pass any `(data) => ValidationIssue[]`), so the package stays zero-dependency. See [src/validation/README.md](src/validation/README.md) for the consumption recipes (styles, a glyph via a custom node, `allow*` gating) and [src/stable-value/README.md](src/stable-value/README.md) for `useStableValue`, the identity-stabilizer it's built on.

## Filter-function toolkit

The `allow*` props and `searchFilter` all take a function of a node; hand-writing them — destructure `key` / `path` / `level` / `value`, compare, combine — is repetitive. This kit gives you small, named, composable pieces instead: property builders (`byKey`, `byPath`, `byLevel`, `bySize`, `byType`, `byValue`), position constants (`root`, `collections`, `primitives`, `inArray`, `inObject`), `and` / `or` / `not` combinators, and the search bridges `matchesSearch` / `matchRecord`. Every piece is the same `FilterPredicate` shape, so it works on any of those props, and each builder interns its result — so you can write them inline without a `useMemo` or churning the editor's memoization.

The toolkit ships under its own subpath — **`@json-edit-react/utils/filters`** — to keep its generic builder names off the package root.

```tsx
import { JsonEditor } from 'json-edit-react'
import { and, byKey, byLevel, byType, matchRecord, not, primitives } from '@json-edit-react/utils/filters'

<JsonEditor
  data={data}
  setData={setData}
  allowEdit={and(not(byKey('id')), byLevel({ min: 2 }))} // editable below level 1, except `id`
  allowAdd={byType('array')} // only arrays accept new children
  searchFilter={matchRecord({ fields: ['name', 'username'] })} // keep a whole record when it matches
/>
```

See [src/filters/README.md](src/filters/README.md) for the full reference — every builder, the glob path syntax, and the composition / referential-stability rules.

## Icon definitions from SVG

A theme can supply its own icon glyphs through `Theme.icons`, where each glyph is an `IconDefinition` — `content` (the inner SVG markup) plus an optional `viewBox` / `svgProps` / `scale`. `iconFromSvg` builds that shape for you so a copied icon drops straight in: it strips the outer `<svg>` tag, lifts `viewBox` and the presentation attributes (`fill`, `stroke`, `stroke-width`, …) into the right fields, and puts the inner markup in `content`. Core still renders the wrapping `<svg>`, so the glyph picks up the theme's icon colour (via `currentColor`) and standard sizing automatically.

```tsx
import { JsonEditor } from 'json-edit-react'
import { iconFromSvg } from '@json-edit-react/utils'

// Defined at module scope → built once, stable across renders.
const myTheme = {
  icons: {
    add: iconFromSvg('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 7h-2v4H7…"/></svg>'),
  },
  styles: { iconAdd: '#2aa198' },
}

const MyEditor = () => <JsonEditor data={data} setData={setData} theme={myTheme} />
```

It accepts three forms:

- **A raw SVG string** — a full `<svg>…</svg>`, or just the inner markup (`<path>`s) on their own.
- **A React `<svg>` element** — unwrapped via its props/children (natural in `.tsx`). Routing the element through `iconFromSvg` is the right way to use JSX here: putting a full `<svg>` directly in an `IconDefinition`'s `content` would nest it inside the one core renders.
- **An existing `IconDefinition`** — returned unchanged, so `iconFromSvg` is a single front door whatever the source.

**Inline stability.** Pass a **string** for inline use — string inputs are interned, so `icons={{ add: iconFromSvg('<svg…>') }}` keeps a stable reference across renders. A React **element** or a pre-built **`IconDefinition`** (and likewise a React node placed directly in `theme.icons`) is a fresh object every render and is **not** interned: define it outside the component or wrap it in `useMemo`, exactly as you would any inline `theme` value — otherwise it churns the editor's re-render memoization. A stable `theme` reference is the general rule; the string form of `iconFromSvg` is the one case that's safe to write inline.

## License

MIT
