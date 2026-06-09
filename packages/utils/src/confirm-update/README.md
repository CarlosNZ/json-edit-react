# confirm-update

Hooks for gating `json-edit-react` edits on a confirmation dialog — or any async signal — by building on core's `onUpdate` contract and its `hold()` gate. Exported from `@json-edit-react/utils`.

Core commits optimistically by default, so to *gate* an edit on a dialog you call `control.hold()`: that keeps the edited node's editor open and blocks the rest of the tree until you `release()` (commit) or return `null` (silent cancel). `hold()` must run synchronously, before the first `await`. These hooks package that up and bridge the imperative "ask the user" to a render-driven modal — you declare *when* to confirm and wire up your own modal.

**No modal ships here** — you bring your own (any modal component, or a plain `<div>`) and drive it from the returned `dialog` object.

## `useConfirmOnUpdate` — the common case

Declare _when_ to confirm and _what_ to say; get back a ready-made `onUpdate` (it runs the `hold()` / `release()` gate for you) plus the `dialog` state for your modal.

```tsx
import { JsonEditor } from 'json-edit-react'
import { useConfirmOnUpdate } from '@json-edit-react/utils'

const { onUpdate, dialog } = useConfirmOnUpdate({
  confirmOn: ['delete', 'edit'], // event names, or a predicate: (input) => boolean
  title: 'Are you sure?',
  message: (input) => `${input.event} "${String(input.key)}"?`,
  // Optional: your own update logic, runs only after the user confirms
  // onUpdate: async (input) => { /* persist… */ },
})

return (
  <>
    <JsonEditor data={data} setData={setData} onUpdate={onUpdate} />
    <MyModal {...dialog} />
  </>
)
```

While the dialog is up, the edited node stays in its editor and the rest of the tree is blocked. On confirm the edit commits and the editor closes; on cancel it closes with the original value and no error. If you pass your own `onUpdate`, it runs *after* the confirm — return a `Promise` to persist in the background (the commit has already landed optimistically by then).

## `useJsonEditorConfirm` — the primitive

`useConfirmOnUpdate`'s `confirmOn` predicate already covers any _condition_, so reach for this lower-level hook for flows its single, synchronous confirm can't express: confirming based on `await`ed work, more than one confirmation in a single update, or reusing the dialog for actions outside `onUpdate`. You write the `onUpdate` yourself — including the `hold()` gate — and `confirm()` returns a `Promise<boolean>`. It's also the right tool for confirming things that aren't edits at all (a toolbar action, a custom-node button): it's just "ask via a declarative modal, await a boolean".

```tsx
const { confirm, dialog } = useJsonEditorConfirm()

<JsonEditor
  onUpdate={async (input, { hold }) => {
    if (input.event === 'delete') {
      // Open the gate FIRST, synchronously, so the editor stays open + the tree
      // blocks while we work.
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

## Showing a "saving…" state while a slow `onUpdate` settles

The gate (above) keeps the editor open during the *dialog*; once confirmed, the edit commits optimistically and your `onUpdate` (if any) settles in the *background*. To show that a node's save is still in flight, use core's `isPending` prop on a custom node — it's `true` for exactly that settlement window. Nothing from this package is needed for it; see the editor's CustomNodes docs (and the demo's "Pending overlay" example).

## Wiring your modal

`dialog` is the only contract: `isOpen` controls visibility, `onConfirm` / `onCancel` are the button handlers, and `title` / `message` (plus any extra keys you pass to `confirm()`) carry the content.
