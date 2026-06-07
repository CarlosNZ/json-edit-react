# confirm-update

Hooks (and an optional UI helper) for gating `json-edit-react` edits on a confirmation dialog — or any async signal — by building on core's async `onUpdate` contract. Exported from `@json-edit-react/utils`.

`JsonEditor` `await`s `onUpdate` before committing and treats a returned `null` as a silent cancel, so an `onUpdate` that resolves only when the user answers a modal holds the edit open until they do. These helpers package that pattern.

**No modal ships here** — you bring your own (any modal component, or a plain `<div>`) and drive it from the returned `dialog` object.

## `useConfirmOnUpdate` — the common case

Declare _when_ to confirm and _what_ to say; get back a ready-made `onUpdate` plus the `dialog` state for your modal.

```tsx
import { JsonEditor } from 'json-edit-react'
import { useConfirmOnUpdate } from '@json-edit-react/utils'

const { onUpdate, dialog } = useConfirmOnUpdate({
  confirmOn: ['delete', 'edit'], // event names, or a predicate: (input) => boolean
  title: 'Are you sure?',
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
```

## `useJsonEditorConfirm` — the primitive

`useConfirmOnUpdate`'s `confirmOn` predicate already covers any _condition_, so reach for this lower-level hook for flows its single, synchronous confirm can't express: confirming based on `await`ed work, more than one confirmation in a single update, or reusing the dialog for actions outside `onUpdate`. You write the `onUpdate` yourself; `confirm()` returns a `Promise<boolean>`.

```tsx
const { confirm, dialog } = useJsonEditorConfirm()

<JsonEditor
  onUpdate={async (input) => {
    if (input.event === 'delete') {
      // The decision to confirm — and the message — come from async work, which
      // `useConfirmOnUpdate`'s synchronous `confirmOn`/`message` can't do.
      const { inUse, usedBy } = await checkReferences(input.path)
      if (inUse) {
        const ok = await confirm({
          title: 'Still in use',
          message: `Referenced by ${usedBy.join(', ')}. Delete anyway?`,
        })
        if (!ok) return null // null = silent cancel; the node reverts
      }
    }
  }}
/>
<MyModal {...dialog} />
```

## Pending-node overlay (opt-in)

**You usually don't need this.** For the common _delete_-confirm, the node already sits there showing the item until you confirm — nothing misleading to mask. It's only worth it when you confirm _edits_ (whose node would otherwise show the new value as if already applied) or run a slow async `onUpdate`.

When you do want it: **the library ships no UI** — supply your own custom-node component as `pendingComponent`, and the hook hands back a ready `pendingNodeDefinition` to merge into `customNodeDefinitions`.

```tsx
const { onUpdate, dialog, pendingNodeDefinition } = useConfirmOnUpdate({
  confirmOn: ['delete', 'edit'],
  message,
  pendingComponent: MyPendingNode, // your custom-node component (renders the in-flight node)
})

// Guard the undefined case, and keep the array referentially stable (see the
// CustomNodes docs) — that's what lets the editor re-render the right node.
const customNodeDefinitions = useMemo(
  () => (pendingNodeDefinition ? [pendingNodeDefinition, ...myDefinitions] : myDefinitions),
  [pendingNodeDefinition, myDefinitions]
)

<JsonEditor onUpdate={onUpdate} customNodeDefinitions={customNodeDefinitions} />
```

Omit `pendingComponent` and `pendingNodeDefinition` is `undefined` — behaviour is unchanged (the node renders as it normally would). For full control, the hook also returns the raw `pending` (`{ path, event } | null`), and `createPendingCommitDefinition(pending, component)` builds the definition directly.

## Wiring your modal

`dialog` is the only contract: `isOpen` controls visibility, `onConfirm` / `onCancel` are the button handlers, and `title` / `message` (plus any extra keys you pass to `confirm()`) carry the content.
