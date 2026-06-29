# Undo / redo — `useUndo`

Wraps a consumer-owned `data`/`setData` pair with undo/redo. **Controlled**: the hook never holds its own copy of the data — you own it (your own `useState`), and the hook keeps only the snapshot stacks, committing each change through your `setData`. One source of truth, nothing to keep in sync, zero runtime dependencies.

## Quick start

Pass the returned `set` as the editor's `setData`, and wire `undo`/`redo` (gated by `canUndo`/`canRedo`) to your own buttons:

```tsx
import { useState } from 'react'
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

## API

`useUndo(data, setData)` returns:

| Member | Type | Behaviour |
| --- | --- | --- |
| `data` | `T` | Passthrough of the value you pass in (so you can destructure everything from one call). |
| `set` | `(data) => void` | React-`setState`-shaped (value or updater). Records a snapshot, clears the redo stack, commits via `setData`. Pass this as the editor's `setData`. |
| `undo` | `() => void` | Step back to the previous snapshot. No-op when `canUndo` is false. |
| `redo` | `() => void` | Step forward again. No-op when `canRedo` is false. |
| `replace` | `(data) => void` | Commit a value **without** recording a snapshot — a change you don't want in history. |
| `reset` | `(data) => void` | Commit a new baseline and clear all history. |
| `canUndo` / `canRedo` | `boolean` | Whether there's anything to undo / redo. |
| `onEditEvent` | `(e) => void` | **Optional.** Pass as the editor's `onEditEvent` *only* if you validate with an async `onUpdate` that can reject — see [Async validation](#async-validation-optional). Leave it off otherwise. |

## Loading a new dataset

Call `reset(newData)` — **not** `setData` — when you swap the underlying document (e.g. selecting a different dataset). The hook only sees changes that go through its own API, so a raw external change would leave stale snapshots; `reset` commits the new value and clears history in one step.

It deliberately does **not** auto-detect external changes by watching `data`: a reference comparison would wipe history every time an ancestor passed a fresh-but-equal `data` object, and a deep comparison is too costly for a zero-dep helper. `reset` is the explicit, churn-proof contract.

## Async validation (optional)

You only need this for one specific case: an **asynchronous** `onUpdate` that can *reject* (e.g. a server-side check). Everything else is already clean — a synchronous reject is resolved in place by the editor and never reaches `set`, so it leaves no history behind.

Async is different because the editor commits **optimistically**: it applies the edit immediately, then reverts it if your async `onUpdate` rejects. Both the apply and the revert go through `set`, so without help the reverted (invalid) value would sit in the undo stack and one "Undo" would step back to it. Wiring the returned `onEditEvent` lets the hook recognise that reverted commit and drop it:

```tsx
const { set, undo, redo, onEditEvent } = useUndo(data, setData)

return <JsonEditor data={data} setData={set} onEditEvent={onEditEvent} />
```

It's purely additive — `set` behaves identically whether or not you wire `onEditEvent`, so leave it off until you actually have async validation that rejects.

> **Scope:** this corrects a single in-flight edit, which is the realistic case. It does not unwind two genuinely-concurrent async rejections, nor an async-rejected delete or move (those apply without an open editor session to anchor the correction to). Both are rare — if you need watertight history under heavy concurrent async validation, gate those edits with the editor's `hold()` instead, so they never commit optimistically in the first place.

## Notes

The returned callbacks are recreated each render (they read the live `data`/stacks). That's harmless to the editor — core reads `setData` through a ref-to-latest, so a churning `set` never defeats node memoization. If you hand `undo`/`redo` to your own memoized children, wrap them as you would any handler.
