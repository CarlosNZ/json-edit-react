---
'@json-edit-react/utils': minor
---

Add `useUndo` — an undo/redo hook for `@json-edit-react/utils`.

`useUndo(data, setData)` wraps a consumer-owned `data`/`setData` pair with undo/redo. It's **controlled**: the hook never holds its own copy of the data — you keep owning it (your own `useState`), and the hook holds only the snapshot stacks, committing each change through your `setData`. Pass the returned `set` as the editor's `setData`.

Returns `data` (passthrough), `set` (record a snapshot then commit; accepts a value or a React-style updater), `undo` / `redo` (step through history; no-ops at the ends), `replace` (commit without a snapshot), `reset` (commit a new baseline and clear history), and `canUndo` / `canRedo` for your buttons.

To load a new dataset, call `reset(newData)` rather than `setData` — the hook only sees changes that go through its own API. It deliberately doesn't auto-detect external `data` changes (a reference compare would wipe history on a fresh-but-equal `data`; a deep compare is too costly for a zero-dep helper). No third-party runtime dependencies.
