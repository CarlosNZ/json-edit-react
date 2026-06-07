# Editing model — current behaviour (baseline for redesign)

A complete inventory of the editing/commit lifecycle as it exists today, so we can design the replacement against the full surface rather than the value-edit happy path. Temporary working doc (like `ThemeModel.md`) — delete once the new model lands.

Source of truth: [src/contexts/EditingProvider.tsx](src/contexts/EditingProvider.tsx) (the store), [src/hooks/useCommon.ts](src/hooks/useCommon.ts) (`handleMutationResult`, rename), [src/ValueNodeWrapper.tsx](src/ValueNodeWrapper.tsx), [src/CollectionNode.tsx](src/CollectionNode.tsx), [src/KeyDisplay.tsx](src/KeyDisplay.tsx), [src/ButtonPanels.tsx](src/ButtonPanels.tsx), [src/JsonEditor.tsx](src/JsonEditor.tsx), [src/utils/keyboard.ts](src/utils/keyboard.ts).

---

## 1. What the store holds

The store is a single mutable bundle + a listener `Set`, exposed via `useSyncExternalStore`. Nodes subscribe to **primitive** slices only (so a transition re-renders just the involved nodes).

**Notified state** (`EditingStateBundle` — changing it calls `emit()` → re-renders subscribers):

| Field | Type | Meaning |
| --- | --- | --- |
| `currentlyEditingElement` | `{ path, mode: 'value'\|'key'\|'add', force? } \| null` | The one open session. `null` = nothing editing. **This is the only "is something editing" signal.** |
| `previouslyEditedElement` | `CollectionKey[] \| null` | Tab-redirect fallback target |
| `tabDirection` | `'next' \| 'prev'` | Direction the redirect effect should search |
| `previousValue` | `JsonData \| null` | Type-change revert snapshot (see §10.4) |

**Out-of-band closure vars** (mutated directly, **never** notify subscribers):

| Var | Type | Meaning |
| --- | --- | --- |
| `cancelOp` | `(() => void) \| null` | The outgoing session's UI cleanup (see §8) |
| `cancelling` | `boolean` | Re-entrancy guard for `cancelEdit` |
| `committingPaths` | `Set<string>` | #325 "mid-commit" marker (see §9) — the contested addition |

**Per-node subscriptions (primitive selectors):**

- `isEditing` = `mode==='value' && pathsEqual(path)` — [useCommon.ts:60](src/hooks/useCommon.ts#L60)
- `isEditingKey` = `mode==='key' && pathsEqual(path)`
- `isAddingHere` = `mode==='add' && pathsEqual(path)` — [ButtonPanels.tsx:79](src/ButtonPanels.tsx#L79)
- `childrenEditing` / `areChildrenBeingEdited` = `isDescendantOf(editing.path, path)` — keeps ancestors expanded

> **Key fact:** there is no representation of "a session that has been submitted but not yet resolved." `currentlyEditingElement` is binary (editing / not). #325 tried to add the third state out-of-band in `committingPaths`. This is the root of the redesign.

---

## 2. Two separate event vocabularies

Don't conflate these:

- **Store transitions** (internal): `startEdit`, `cancelEdit`, `closeEdit`, `beginCommit`, `endCommit`, plus `setTabDirection` / `recordPreviousEdit` / `setPreviousValue`. These mutate state; only some fire a public event.
- **`onEditEvent` lifecycle** (public, §17 contract): the `EditEvent` stream a consumer observes.

---

## 3. The public `onEditEvent` lifecycle (the contract)

`EditEvent` union ([types.ts:294](src/types.ts#L294)):

| Session kind | Start | Commit | Close-without-commit |
| --- | --- | --- | --- |
| value edit | `startEdit` | `confirmEdit` | `cancelEdit` |
| key rename | `startRename` | `confirmRename` (+`{oldKey,newKey}`) | `cancelRename` |
| add | `startAdd` | `confirmAdd` | `cancelAdd` |
| delete | — | `delete` (instant, one event) | — |
| move (drag) | — | `move` (instant, one event) | — |

**Intended invariant:** each `start*` is balanced by exactly one terminal `confirm*` **or** `cancel*`. A no-op confirm (unchanged value) and a rejected/aborted change both report as `cancel*`. *This invariant is currently maintained by convention, not enforced by the model — and the async window breaks it (see §14).*

---

## 4. The `onUpdate` result protocol

Every commit funnels through one `onUpdate` ([JsonEditor.tsx:236](src/JsonEditor.tsx#L236)). The node's internal `onEdit`/`onAdd`/`onDelete`/`onRename` promise resolves to `string | void | false`, which `handleMutationResult` ([useCommon.ts:130](src/hooks/useCommon.ts#L130)) interprets:

| `onUpdate` returns | `onEdit` resolves to | `handleMutationResult` branch | Effect |
| --- | --- | --- | --- |
| `true` / `void` / `undefined` | `void` | else → confirm | commit (setData already ran), fire `confirm*` |
| `{ value }` | `void` | else → confirm | commit override, fire `confirm*` |
| `null` (silent cancel) | `false` | `result===false` | `onRevert?.()`, fire `cancel*`, **no error** |
| `false` (reject) | error **string** | `typeof result==='string'` | `onError` + `onRevert?.()`, fire `cancel*` |
| `{ error }` | error string | `typeof result==='string'` | same as reject |
| (thrown / rejected promise) | error string | string branch | caught in `handleEdit`, treated as reject |

Also: a no-op value edit (`currentValue === newValue`) short-circuits in `onEdit` ([JsonEditor.tsx:295](src/JsonEditor.tsx#L295)) and returns `false` **before `onUpdate` is ever called** — so a no-op never opens an async window.

> Testing note: `onUpdate` returning `false` hits the **error** branch, not the silent-cancel branch. Only `null` exercises the `result===false` revert path.

---

## 5. Store transitions (precise)

### `startEdit(path, { mode='value', cancelOp?, force? })` — [L157](src/contexts/EditingProvider.tsx#L157)
1. `next = { path, mode, force }`; `prev = currentlyEditingElement`; `isSwitch = prev!==null && !equal(prev,next)`.
2. **Run the outgoing session's cleanup:** `op = cancelOp; cancelOp = null; if (op) op()`. *(This is the previous session's `cancelOp`, e.g. revert its buffer.)*
3. **Install the new session's cleanup:** `cancelOp = options.cancelOp ?? null`.
4. **Displacement event:** if `isSwitch` **and** `currentlyEditingElement` still `===prev` (op didn't already tear it down) **and** `!committingPaths.has(prev.path)` → fire `prev.mode==='key' ? 'cancelRename' : 'cancelEdit'`.
5. If `currentlyEditingElement !== next` → `commit({ currentlyEditingElement: next })`.
6. **Always** fire `eventForMode(mode,'start')` (`startEdit`/`startRename`/`startAdd`).

### `cancelEdit()` — [L200](src/contexts/EditingProvider.tsx#L200)
1. Re-entrancy guard (`cancelling`).
2. `op = cancelOp; cancelOp = null; if (op) op()`.
3. If `prev!==null`: clear session (`commit(null)`), then fire `eventForMode(prev.mode,'cancel')` — uses the **correct** mode (`cancelEdit`/`cancelRename`/`cancelAdd`).
4. **Does not touch `committingPaths`.**

### `closeEdit()` — [L223](src/contexts/EditingProvider.tsx#L223)
- `cancelOp = null`; clear session. Fires **no** event (the node fires the terminal event itself from the commit outcome). **Does not touch `committingPaths`.**

### `beginCommit()` (#325) — [L236](src/contexts/EditingProvider.tsx#L236)
- `cancelOp = null`; if a session is open, `committingPaths.add(toPathString(cur.path))`. **Leaves `currentlyEditingElement`** (editor stays open). No event.

### `endCommit(path)` (#325) — [L247](src/contexts/EditingProvider.tsx#L247)
- `committingPaths.delete(toPathString(path))`; if `currentlyEditingElement` still `pathsEqual(path)` → clear session. **Matches by path only — ignores mode.** No event.

### Support
- `setTabDirection(dir)`, `recordPreviousEdit(path)`, `setPreviousValue(v)` — guarded commits (skip if unchanged).
- `areChildrenBeingEdited(path)` — read-only.

---

## 6. The `cancelOp` mechanism (who cleans up the displaced session)

`cancelOp` is the outgoing session's local UI cleanup, run by `startEdit` (on switch) and `cancelEdit`. It is registered **per open session** by whoever calls `startEdit`:

| Session opened by | `cancelOp` registered | What it reverts |
| --- | --- | --- |
| Value node click (`setIsEditing`) | `revertSession` = `revertPreviousValue() \|\| revertToData()` | type-change snapshot, else local `value` buffer |
| Collection JSON click (`setIsEditing`) | `clearEditBuffer` = `setStringifiedValue(null)` | the typed-JSON buffer |
| Key rename (`startEdit(path,{mode:'key'})`) | **none** | (key input is uncontrolled `defaultValue` — nothing to revert) |
| Add (`startEditSession(path,{mode:'add'})`) | **none** | (ButtonPanels' local key state reset by an effect on `isAddingHere→false`) |
| **Tab arrival** (`startEdit(next)`) | **none** | — |

> **Asymmetry to note:** a value/collection node's local-buffer revert on a *direct user cancel* (Esc/✗) is run **directly** in `handleCancel` (`revertSession()` then `cancelEdit()`), not via `cancelOp`. The `cancelOp` only matters when the session is displaced by *something else* (another node, search reset, `editorRef`). A **Tab-arrived** session therefore has no `cancelOp` — if it's then displaced by an external cancel after the user typed into it, its buffer is not reverted by the store.

---

## 7. The `committingPaths` set (#325) — the contested mechanism

Added by #325 to stop `startEdit`'s displacement logic (§5 step 4) from firing a spurious `cancelEdit` over a session whose commit is still in flight. Properties:

- Added **only** by `beginCommit`; removed **only** by `endCommit`.
- Consulted **only** by `startEdit`'s displacement check.
- **Not** consulted by `cancelEdit` / `closeEdit`, and **not** cleared by them.
- Keyed by path string, **mode-agnostic**.

This is the parallel source of truth that makes the patch brittle (see §14).

---

## 8. Edit-kind flows

Conventions below: **trigger** → handler → `store calls` → *onEditEvent*.

### 8.1 Value edit
- **Open:** click Edit icon, or double-click the value (`setIsEditing`) → `startEdit(path, {cancelOp: revertSession})` → *startEdit*. Local `value` buffer mirrors `data`; typing sets `value` (via `updateValue`).
- **Commit:** OK button (`onOk={handleEdit}`, [L517](src/ValueNodeWrapper.tsx#L517)), or Enter (`stringConfirm`/`numberConfirm`/`booleanConfirm` → `handleEdit`). `handleEdit` → `beginCommit()` → `setPreviousValue(null)` → `onEdit(newValue,path).then(...)` → `handleMutationResult({onRevert: revertToData})` then `endCommit(path)`. → *confirmEdit* (commit) or *cancelEdit* (no-op/reject).
- **Cancel:** Esc (`cancel`) or ✗ (`onCancel`) → `handleCancel` → `revertSession()` (direct local revert) + `cancelEdit()` → *cancelEdit*.
- **Tab:** `tabForward`/`tabBack` → `setTabDirection` + `recordPreviousEdit(path)` + `handleEdit()` + `startEdit(nextOrPrev)` (no cancelOp) → *confirmEdit(this)* then *startEdit(next)*.
- **`data` sync:** `useEffect([data])` calls `revertToData()` whenever `data` changes (external setData, undo, commit) — **no `isEditing` guard**.

### 8.2 Collection (raw-JSON) edit
- **Open:** click Edit on a collection → `startEdit(path, {cancelOp: clearEditBuffer})` → *startEdit*. Textarea shows `editBufferValue = stringifiedValue ?? jsonStringify(data)`; typing sets `stringifiedValue`.
- **Commit:** Ctrl/Cmd/Shift+Enter (`objectConfirm` → `handleEdit`). Parse first; **parse failure** → `onError`, leave open, **no event**. Else `beginCommit()` → no-op check (`jsonStringify(value)===currentDataString` → *cancelEdit* + `clearEditBuffer()` + `endCommit(path)`) → else `onEdit(value,path).then(handleMutationResult → clearEditBuffer() → endCommit(path))`. → *confirmEdit*/*cancelEdit*. (No `onRevert` passed; `clearEditBuffer` re-derives from `data`.)
- **Cancel:** Esc / ✗ → `handleCancel` → `clearEditBuffer` happens via the registered `cancelOp` (through `cancelEdit`) → *cancelEdit*.
- **Tab inside textarea:** plain Tab inserts a literal `\t` (no commit) — [CollectionNode.tsx:233](src/CollectionNode.tsx#L233).

### 8.3 Key rename
- **Open:** double-click the key (`canEditKey`) → `startEdit(path, {mode:'key'})` (**no cancelOp**) → *startRename*. Key `<input>` is uncontrolled (`defaultValue`).
- **Commit:** Enter (`stringConfirm`) → `handleEditKey(value)`. `handleEditKey` → **`closeEdit()` (synchronous!)** → no-op (`name===newKey`) → *cancelRename* → else duplicate-key check (`onError` + *cancelRename*) → else `onRename(path,newKey).then(handleMutationResult)` → *confirmRename*(+keys)/*cancelRename*.
- **Cancel:** Esc / ✗ → `handleCancel` → `cancelEdit()` → *cancelRename*.
- **Tab:** `handleEditKey(value)` (commits the rename, synchronous `closeEdit`) then `startEdit(firstChild | next | prev | path)` → *confirmRename* then *startEdit/startRename*.

> Note: rename commits via **synchronous `closeEdit`**, not `beginCommit`/`endCommit`. Not converted by #325.

### 8.4 Type change
- **Trigger:** the type `<select>` while a value is being edited → `handleChangeDataType(type)` ([L233](src/ValueNodeWrapper.tsx#L233)). Snapshots `previousValue` (once per session) so a later cancel reverts.
- **Custom-node / enum / non-primitive target:** `onEdit(...).then(handleMutationResult)` **+ synchronous `closeEdit()`** ([L256](src/ValueNodeWrapper.tsx#L256), [L298](src/ValueNodeWrapper.tsx#L298)). → *confirmEdit*/*cancelEdit*.
- **string/number/boolean target:** **no `closeEdit`** — the session stays open so the user keeps editing the new primitive type.
- Cancelling later restores `previousValue` via `revertPreviousValue` (inside `revertSession`).

> Note: type change commits via **synchronous `closeEdit`** (when it closes at all). Not converted by #325.

### 8.5 Add
- **Object add:** click Add → `openAdd()` → `startEditSession(path,{mode:'add'})` (**no cancelOp**) → *startAdd*. ButtonPanels shows a key `<input>` or a key-options `<select>` (local `addingKeyState`, synced by an effect on `isAddingHere`).
  - **Commit:** OK / Enter (`commitAdd`) or selecting an option → **`closeEdit()` (synchronous!)** → `handleAdd(key)` → `onAdd(...).then(handleMutationResult)` → *confirmAdd* / error.
  - **Cancel:** Esc / ✗ → `cancelEdit()` → *cancelAdd*. Local key state reset by the `isAddingHere→false` effect.
- **Array add:** click Add → `handleAdd('')` immediately — **no session, no `start/cancel`**, just `onAdd` → *confirmAdd* (one-shot).

> Note: add commits via **synchronous `closeEdit`**. Not converted by #325.

### 8.6 Delete (no session)
- Value: delete icon → `handleDelete` → `onDelete(value,path).then(handleMutationResult({confirmEvent:'delete'}))` → *delete* (no `cancelEvent`, no session).
- Collection: same shape, plus `clearEditBuffer()` ([CollectionNode.tsx:393](src/CollectionNode.tsx#L393)). → *delete*.

---

## 9. Tab navigation details
- Target picked by `getNextOrPrevious(liveData, path, dir, sort)` ([keyboard.ts:152](src/utils/keyboard.ts#L152)) — walks the **rendered/sorted** tree, descends into non-empty collections, recurses to the parent at edges; returns `null` past the ends.
- Sequence per Tab (value): `setTabDirection` → `recordPreviousEdit(path)` → `handleEdit()` (commit, async) → `startEdit(target)` (sync, **no cancelOp**). The commit's `endCommit(path)` resolves later; the `startEdit(target)` already moved the session.
- If `getNextOrPrevious` returns `null`: value Tab simply doesn't move (the `if (next)` guard); key Tab calls `cancelEdit()`.

---

## 10. Filtered-node redirect — [ValueNodeWrapper.tsx:206](src/ValueNodeWrapper.tsx#L206)
A `useLayoutEffect` keyed on `[isEditing, isVisible, canEdit, startEdit, cancelEdit]`: if this node becomes `isEditing` but is search-filtered-out or uneditable (and not `force`), it re-targets: `startEdit(getNextOrPrevious(tabDirection))`, else `startEdit(previouslyEditedElement)`, else `cancelEdit()`. This is how Tab skips hidden/locked nodes. Runs synchronously pre-paint to avoid a flicker.

---

## 11. External / imperative entry points
- **`editorRef.startEdit({path, overrideRestrictions})`** — restriction pre-check → `startEditAction(path,{force:true})`. Returns `'PATH_NOT_FOUND'` / `'RESTRICTED'` / `true`.
- **`editorRef.confirm()`** — clicks the live `editConfirmRef` OK button, then `cancelEdit()` (the click already committed; cancel tidies any residue — but note it fires `cancel*` if a session is still open).
- **`editorRef.cancel()`** — `cancelEdit()`.
- **Search input change** — `useEffect([searchText, searchDebounceTime])` calls `cancelEdit()` unconditionally ([JsonEditor.tsx:171](src/JsonEditor.tsx#L171)) → *cancel\** for any open session.
- **Root keyboard handler** ([JsonEditor.tsx:575](src/JsonEditor.tsx#L575)) — `cancel: () => cancelEdit()`.

---

## 12. Master action → effect table

| User action | Handler | Store calls | onEditEvent |
| --- | --- | --- | --- |
| Open value edit | `setIsEditing` | `startEdit(path,{cancelOp})` | startEdit |
| Confirm value (OK/Enter) | `handleEdit` | `beginCommit` → … → `endCommit` | confirmEdit / cancelEdit |
| Cancel value (Esc/✗) | `handleCancel` | `revertSession` + `cancelEdit` | cancelEdit |
| Tab from value | `tabForward/Back` | `setTabDirection`+`recordPreviousEdit`+`beginCommit`(via handleEdit)+`startEdit(next)`+`endCommit` | confirmEdit, startEdit |
| Open collection edit | `setIsEditing` | `startEdit(path,{cancelOp:clearEditBuffer})` | startEdit |
| Confirm collection (⌘↵) | `handleEdit` | `beginCommit` → … `clearEditBuffer` → `endCommit` | confirmEdit / cancelEdit |
| Open rename | dbl-click key | `startEdit(path,{mode:'key'})` | startRename |
| Confirm rename | `handleEditKey` | **`closeEdit`** → `onRename.then` | confirmRename / cancelRename |
| Change type (→obj/custom/enum) | `handleChangeDataType` | **`closeEdit`** + `onEdit.then` | confirmEdit / cancelEdit |
| Change type (→string/num/bool) | `handleChangeDataType` | (no close) + `onEdit.then` | confirmEdit / cancelEdit |
| Open object add | Add icon | `startEdit(path,{mode:'add'})` | startAdd |
| Confirm add | `commitAdd` | **`closeEdit`** → `onAdd.then` | confirmAdd |
| Cancel add | Esc/✗ | `cancelEdit` | cancelAdd |
| Array add | Add icon | (none) `onAdd.then` | confirmAdd |
| Delete | delete icon | (none) `onDelete.then` | delete |
| Search change | effect | `cancelEdit` | cancel\* (open session) |
| `editorRef.startEdit` | imperative | `startEdit(path,{force})` | startEdit |
| `editorRef.cancel` | imperative | `cancelEdit` | cancel\* |

---

## 13. Known asymmetries / quirks in the *current* model (design-relevant)

These exist independent of the async window and any new model should resolve or deliberately keep them:

1. **Commit path is inconsistent across kinds.** Value + collection use `beginCommit`/`endCommit` (deferred close, #325). Rename, type-change, and add use **synchronous `closeEdit`** before their own async `onUpdate`. So the "editor stays open during pending" behaviour applies to only 2 of 5 kinds.
2. **`startEdit` always fires a `start*` event** (step 6 is unconditional), even when re-issued on the already-editing node — the redirect effect and re-clicks can emit duplicate `start*`.
3. **Displaced `add` fires the wrong event.** `startEdit`'s displacement uses `prev.mode==='key' ? 'cancelRename' : 'cancelEdit'` — a displaced **add** session emits `cancelEdit`, not `cancelAdd`. (`cancelEdit`'s own path uses the correct mode.)
4. **Two cleanup channels.** Direct cancel reverts the buffer in `handleCancel` *directly*; external displacement relies on the registered `cancelOp`. Tab-arrived and rename/add sessions register **no** `cancelOp`.
5. **`previousValue` (type-change snapshot) lives in notified state** but is only read at event time — a candidate for the out-of-band tier (or the session object) in the new model.
6. **`committingPaths` is mode-agnostic, consulted by only one transition, and pruned by only one** (`endCommit`) — every other session-ending path leaves it stale.
7. **The one-session invariant** (`currentlyEditingElement` is a single slot) means "only one node edits at a time." The async window is the first place where a *second* commit could be in flight while a new session opens — the model has no per-commit identity to tell them apart.

---

## 14. Where the async/pending window breaks it (the motivation)

Because "submitted-but-unresolved" isn't a state, the editor (and its OK/✗/Esc/type-select handlers) stays fully live during a slow `onUpdate`, while the in-flight `onEdit` promise will still `setData` + fire `confirm*` when it lands. Nothing ties the resolving commit back to the specific session that started it. Observed failures (all reproducible only with a deferred `onUpdate`):

- **Cancel doesn't cancel + double terminal event:** Esc/✗ during pending fires `cancelEdit` *and* the commit later fires `confirmEdit` and writes the value. (`cancelEdit` has no `committingPaths` guard and can't abort the promise.)
- **Wrong-session close:** `endCommit(path)` matches by path only, so a value commit closes a key-rename opened on the same node during the window.
- **Stale suppression:** `cancelEdit`/`closeEdit` don't prune `committingPaths`, so a later legitimate `cancelEdit` for that path is suppressed until the original promise resolves.
- **Double-submit:** the OK button stays live, so a second Enter/click during pending fires a second commit + `confirmEdit`.
- **Buffer clobber:** `useEffect([data])` reverts the open value buffer if `data` changes during the window.
- **Inconsistency:** value/collection stay open during pending; rename/type-change/add close immediately and flash the settled state.

All collapse to: **the session needs an explicit lifecycle (a `committing` phase) and a per-commit identity (token), as a single source of truth, with every transition defined against it.**
