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

## License

MIT
