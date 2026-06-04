# @json-edit-react/utils

Utility hooks and helpers for [json-edit-react](https://github.com/CarlosNZ/json-edit-react).

> **Status: early/nascent.** This package is being assembled — the helpers below
> are planned, not all shipped yet. See the linked issues for current state.

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

- **Confirm-before-update hooks** — gate edits/deletes on a confirmation dialog
  without hand-rolling the deferred-promise dance. _Available now._
  ([#307](https://github.com/CarlosNZ/json-edit-react/issues/307))
- **JSON Schema → Filter Functions** — generate `allowEdit` / `allowDelete` /
  `allowAdd` (etc.) functions from a JSON Schema so the editor UI can't produce
  invalid data in the first place. _Planned._
  ([#285](https://github.com/CarlosNZ/json-edit-react/issues/285))
- **Search helpers** — ready-made `searchFilter` functions for common search
  patterns. _Planned._ ([#319](https://github.com/CarlosNZ/json-edit-react/issues/319))

## Confirm before update

`JsonEditor` `await`s your `onUpdate` before committing a change, and treats a
returned `null` as a silent cancel. These hooks build on that: they let you hold
an edit open until the user answers a confirmation dialog, then commit or revert
based on the answer. **No modal ships with the library** — you bring your own (any
modal component, or a plain `<div>`) and drive it from the returned `dialog`
object.

### `useConfirmOnUpdate` — the common case

Declare _when_ to confirm and _what_ to say; you get back a ready-made `onUpdate`
plus the `dialog` state for your modal:

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

When your gating is richer than "ask on these events," use the lower-level hook
and write the `onUpdate` yourself. `confirm()` returns a `Promise<boolean>`:

```tsx
const { confirm, dialog } = useJsonEditorConfirm()

<JsonEditor
  onUpdate={async (input) => {
    if (input.event === 'delete') {
      const ok = await confirm({ title: 'Delete?', message: `Delete "${String(input.key)}"?` })
      if (!ok) return null // null = silent cancel; the node reverts
    }
    // …any other custom logic, then fall through to commit
  }}
/>
<MyModal {...dialog} />
```

### Wiring your modal

`dialog` is the only contract. Render your modal from it — `isOpen` controls
visibility, `onConfirm` / `onCancel` are the button handlers, and `title` /
`message` (plus any extra keys you pass to `confirm()`) carry the content:

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

## License

MIT
