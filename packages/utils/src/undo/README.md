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

## Loading a new dataset

Call `reset(newData)` — **not** `setData` — when you swap the underlying document (e.g. selecting a different dataset). The hook only sees changes that go through its own API, so a raw external change would leave stale snapshots; `reset` commits the new value and clears history in one step.

It deliberately does **not** auto-detect external changes by watching `data`: a reference comparison would wipe history every time an ancestor passed a fresh-but-equal `data` object, and a deep comparison is too costly for a zero-dep helper. `reset` is the explicit, churn-proof contract.

## Notes

The returned callbacks are recreated each render (they read the live `data`/stacks). That's harmless to the editor — core reads `setData` through a ref-to-latest, so a churning `set` never defeats node memoization. If you hand `undo`/`redo` to your own memoized children, wrap them as you would any handler.
