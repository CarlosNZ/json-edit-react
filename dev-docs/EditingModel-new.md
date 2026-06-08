# Editing model — v2 design (the target)

The agreed API and behaviour for the reworked editing/commit lifecycle. Companion to [EditingModel-current.md](EditingModel-current.md) (the current-behaviour baseline). Both are temporary working docs; fold into the README / migration guide and delete when the model lands.

> **Status:** API + behaviour **locked** (§1–§7). Architecture + vocabulary **agreed** (§8 + Terminology below). State shape + transitions drafted (§10), being walked against the current-model §12 table.

---

## Terminology

Layers are kept distinct by name; `editorRef.*` methods are always written in full form.

- **Provider transitions** (store methods the nodes call): `open` · `submit` · `cancel` (+ bookkeeping `setTabDirection`, `recordPreviouslyEdited`). Plain verbs — never the same string as an event.
- **Events** (`onEditEvent` strings — pure outputs): `startEdit`/`submitEdit`/`commitEdit`/`cancelEdit` (+ `…Rename`/`…Add` families) · `delete` · `move` · `updateSuccessful` · `updateError`.
- **`editorRef` methods** (consumer, imperative): always written in full — `editorRef.startEdit` / `editorRef.cancel` / `editorRef.confirm` / `editorRef.collapse`.
- **Consumer callbacks** (passed into `onUpdate`): `hold()` → returns `release()`.
- **Provider internals** (never called by nodes): `apply` (apply value + close + register `settling` + fire `commit*`) · `reconcile` (token-gated settlement) · `buildInput` · `emit`/`fire`.
- **JsonEditor-supplied primitives** (refs the Provider calls): `runUpdate` (= `onUpdate`) · `applyValue(path,value)` · `getLatestData` · `buildNodeData`.
- **State:** `active {path,op,phase,force} | null` · `phase: editing|held` · `settling: Record<PathString,Token>` · `token` · `cancelOp` · `tabDirection` · `previouslyEdited` · node-local **buffer**.
- **Selectors:** `isEditing` / `isEditingKey` / `isAddingHere` / `isHeld` / `isSettling`.

Transition → the event it fires: `open → startEdit` · `submit → submitEdit` · `apply → commitEdit` · `cancel → cancelEdit`.

---

## 1. Core concept

A commit is **optimistic by default**: on submit the editor closes and the UI updates immediately; the consumer's `onUpdate` runs and only matters if it **fails** (revert + signal). Two independent, optional twists ride on top:

- **The gate (decide):** an optional pre-commit decision — a confirmation dialog, async validation — during which the originating UI stays **open** and the rest of the tree is **blocked**. A falsy/`null` decision cancels the operation (nothing was applied).
- **Settlement timing:** the durable write (`onUpdate`) may resolve instantly or after a slow round-trip. Either way the UI already updated optimistically; a *delayed* failure just means the revert lands later.

The unifying idea: there is exactly **one "apply + close" moment** per commit. By default it is at **submit**. A gate moves that moment to **after the gate passes**. Everything after it is optimistic and reconciled in the background.

---

## 2. The `onUpdate` API (locked)

A single `onUpdate` prop — no separate gate prop. The model passes a control object whose `hold()` opts that one commit out of the default optimistic close.

```ts
type UpdateResult =
  | void | undefined | true            // commit
  | { value: JsonData }                // commit, overriding the committed value
  | null                               // silent cancel — revert (if already applied), no error
  | false                              // reject — revert + default error message
  | { error: string | JerError } // reject — revert + this message

interface UpdateControl {
  /** Keep the editor open ("gate"); blocks the tree. Returns `release`.
   *  MUST be called synchronously, before the first `await`. */
  hold: () => () => void  // returns `release`
}

onUpdate?: (input: NodeData & { newData, newValue, event }, control: UpdateControl)
  => UpdateResult | Promise<UpdateResult>
```

### `hold()` / `release()`

- **No `hold()`** → optimistic: the value applies and the editor closes at submit; `onUpdate` settles in the background.
- **`hold()` then `release()`** → editor stays open through the gate, then applies + closes at `release()`; `onUpdate` settles in the background after that.
- **`hold()` without `release()`** → editor stays open until `onUpdate` settles, then applies/closes on the result (a fully **pessimistic** path, for free).

**`hold()` must be synchronous** (before the first `await`). The model decides "apply+close now vs stay open" the instant `onUpdate` returns its promise, so it can only observe a `hold()` that ran in the synchronous prefix. A late call is too late (already applied). A dev-time warning should catch a late call. In practice `hold()` is the first line, and `useConfirmOnUpdate` calls it for you, so consumers rarely touch it.

`release()` = apply the value optimistically + close the editor + unblock the tree, now. From that point the edit **session** is over; the `return` value is purely the **settlement** outcome.

**Instant operations** (delete, array-add, move) have no editor, but `hold()` still works — it gates the *commit*: defer the optimistic apply and block the tree until `release()`. This is the confirm-before-delete case (the node stays visible until confirmed). `release()` then applies (e.g. removes the node).

### The four scenarios

| # | Gate? | Settle | `onUpdate` body | Editor behaviour |
|---|---|---|---|---|
| 1 | no | instant | *(omit `onUpdate`)* | closes + applies at submit |
| 2 | yes | instant | `const r=hold(); if(!await confirm()) return null; r(); return true` | open during confirm → applies when confirmed |
| 3 | no | slow | `return await save(input)` | applies at submit; reverts + errors if the write later fails |
| 4 | yes | slow | `const r=hold(); if(!await confirm()) return null; r(); return await save(input)` | open during confirm → applies when confirmed → reverts + errors if it later fails |

---

## 3. Blocking & concurrency

- **Gate window only** (held, before `release`/commit): the tree is **blocked** — no other node can start editing; the held node + the consumer's dialog are the only interactive surface. Exactly one held operation at a time.
- **Settlement window** (after commit, background): **not** blocked. The editor is closed and the user is free to edit/Tab elsewhere, so **multiple settlements can be in flight concurrently.**
- Concurrency therefore requires a **per-commit token / version** so that: a late failure reverts the *right* node, and for the same node, **latest edit wins** — a newer commit makes an older in-flight settlement stale, so its result is ignored. (The held regime needs no token: the tree is locked → only ever one pending commit.)
- **Cancellation of a held op flows through the gate:** since the tree is blocked, the only way a held op resolves is `onUpdate` settling, so "user cancelled the dialog" is just `onUpdate → null`. No promise-aborting, no Esc-out-of-pending.

---

## 4. Type changes

Changing a node's type is special: today it runs `setData` mid-edit and can remount a structurally different node. It's reclassified by **whether the target requires a different node**, so it slots into the locked lifecycle instead of being a "commit that stays open":

- **Stays a value node** (`string` ↔ `number` ↔ `boolean` ↔ `enum`): **local only.** Adjust the node's local `dataType` + coerce the local buffer. **No `onUpdate`, no settlement, no token, no event.** The editor stays open rendering the new type's input. The single commit happens on the *real* submit, carrying the final type + value together.
- **Becomes a collection or custom node** (`→ object` / `array` / custom component): a **normal commit that closes the session** — `commitEdit` + remount as the new node + settlement (+ gate if `hold()`). Because the editor closes on this path, a settlement failure just remounts the old node in the background — no open editor to disturb.

This is cleaner than today: the `previousValue` snapshot machinery (which exists purely to revert committed mid-edit type changes) largely disappears — primitives revert by dropping the local buffer; collections revert via the settlement's token'd revert-value.

**Behaviour change (accepted):** a primitive type-change no longer fires `onUpdate` the instant it changes — it defers to submit. More correct (the type isn't final until submit), but a contract change to note in the migration guide. **To verify when building:** `enum` coercion (pick a valid option, render `<select>`) stays in the local bucket; custom-node targets are in the commit-and-close bucket.

---

## 5. Event model (`onEditEvent`)

### Session operations (have an editor / key-entry UI)

| Operation | open | submit | cancel (no commit) | commit (applied) |
|---|---|---|---|---|
| value edit | `startEdit` | `submitEdit` | `cancelEdit` | `commitEdit` |
| key rename | `startRename` | `submitRename` | `cancelRename` | `commitRename` |
| object add | `startAdd` | `submitAdd` | `cancelAdd` | `commitAdd` |

### Instant operations (no session)

| Operation | event |
|---|---|
| delete | `delete` |
| array add | `commitAdd` |
| move (drag) | `move` |

Instant ops have **no** `start*`/`submit*`/`cancel*` — they emit their one event **at the commit moment** (at click if no hold, at `release()` if held), then `updateSuccessful`/`updateError`. A gated-then-**cancelled** instant op (`onUpdate → null`) fires **nothing** (nothing committed; no `start*` to balance). Its held/pending state is observable via a **selector**, not an event (where the pending-overlay reattaches).

### Shared settlement (fires after any committed op whose `onUpdate` was called)

- `updateSuccessful`
- `updateError` (carries the error)

### State machine (per session operation)

```
startX ──▶ [submitX] ──▶ commitX ──▶ [ updateSuccessful | updateError ]
       └────────────────▶ cancelX
```

- Every `startX` is terminated by **exactly one** of `cancelX` / `commitX`.
- `cancelX` *before* `submitX` = bailed before committing (Esc/✗). `cancelX` *after* `submitX` = the gate returned `null`.
- `commitX` fires **at submit** when there's no hold (`submitX`→`commitX` adjacent) and **at `release()`** when held. The `submitX`→`commitX` gap *is* the gate/pending window.
- `commitX` → then optionally `updateSuccessful` / `updateError` when `onUpdate` resolves. `updateError` can follow `commitX` (the optimistic "closed, then the save failed, value reverted" path).

### Return value → events

| `onUpdate` returns | events after `commitX` |
|---|---|
| `void`/`true`/`{ value }` | `updateSuccessful` |
| `false`/`{ error }`/throws | `updateError` (+ revert) |
| `null` | none — a **cancel**: fires `cancelX` instead of `commitX` (when held); a `null` *after* an optimistic commit reverts silently |

### Payload

`NodeData<T> & { event } & extras`:
- `path` is **always present** (never `null`, unlike v1's close events).
- `updateError` adds the `error`.
- `commitRename` / its settlement add `{ oldKey, newKey }`.
- `updateSuccessful` / `updateError` identify which commit they settle (`path` + originating operation / commit id) so a consumer can correlate **interleaved** background settlements.

### Edge cases (decided)

- **No-op edit** (submitted an unchanged value): `startEdit` → `submitEdit` → `commitEdit`, and **no** `update*` (`onUpdate` is never called). (Replaces v1's "no-op reports as cancel".)
- **`null` after an optimistic commit** (silent cancel arriving once already applied): revert silently. (Whether that emits a silent `updateError` or its own event — TBD with the mechanisms.)

---

## 6. What this fixes (vs the current model / the #325 patch)

"Submitted-but-unresolved" becomes a first-class, single-source-of-truth state with a per-commit identity, instead of the out-of-band `committingPaths` set bolted onto a binary. That structurally removes: commit-after-cancel + double terminal events, mode-blind close, stale suppression, double-submit, and the value/collection/rename/type-change/add inconsistency (one uniform lifecycle).

---

## 7. Naming notes

- `commitEdit`/`commitRename`/`commitAdd` chosen over `closeEdit` etc. — "commit" reads as "closed *with* a commit", distinct from `cancelEdit` (closed *without*). Shares a word with the internal `closeEdit` store action but lives in a different namespace (event string vs store method).
- `submitX` = the user-action "committed" marker; brackets the gate window with `commitX`.

---

## 8. Architecture (agreed)

Three layers. The Provider is the **control center / commit engine**, but `JsonEditor` stays the **data owner** and supplies the mutation primitives via stable refs (the same ref-to-latest pattern the store already uses for `onEditEvent`/`buildNodeData`, so the store keeps its stable identity — no store rewrite, PERF §16 intact).

```
JsonEditor ── owns data/setData + the onUpdate prop
   │  supplies (stable refs): runUpdate(=onUpdate), applyValue(path,val), getLatestData, buildNodeData
   ▼
EditingProvider ── THE control center / commit engine
   • state: the active/held operation + the settlements registry (token→path)
   • transitions (nodes call): open · submit · cancel       (internals: apply · reconcile)
   • runs the whole optimistic → settle → reconcile cycle (calls runUpdate + applyValue)
   • fires ALL onEditEvent events (single source)
   • exposes primitive selectors: isEditing / isEditingKey / isAddingHere / isHeld / isSettling
   ▲
Nodes (ValueNodeWrapper, CollectionNode) ── thin
   • own the local buffer (typed value / stringifiedValue / dataType) — decoupled from data while editing
   • subscribe to primitive selectors (their own path)
   • call Provider transitions; render the editor + wire keyboard/buttons
```

**Deliberate change from today:** the commit pipeline + **all** event emission move *out of the nodes and into the Provider*. Today event-firing is split — the Provider fires `start*`/displacement-`cancel*` while the nodes fire the terminal `confirm*`/`cancel*` (via `useCommon.emitEditEvent`) and run half the commit (`onEdit().then(...)`). Consolidating makes "exactly one terminal per session" and "only the current token reverts" *structural invariants* rather than conventions spread across files. A node calls one thing — `submit(value)` — and the Provider owns the rest.

**The single slot generalises** from "editing session" to **the active/held operation**: `{ path, op, phase: 'editing' | 'held' }`. Editor ops can be `editing` (UI open) or `held`; instant ops can only be `held` (and only when `hold()` is called). "One editor at a time" becomes "one held/active op at a time" — which is what blocks the tree.

**Stays node-local** (can't move to the single Provider): the per-input buffer (N nodes, one Provider); rendering + keyboard/button wiring; and the **filtered-node Tab redirect** (depends on node-render facts `isVisible`/`canEdit` the Provider can't see — the one node↔Provider collaboration, not pure-Provider).

---

## 9. Settled mechanism invariants

1. **Buffer ⊥ data while a session is open.** The editor's buffer is the user's; a settlement's data revert (or any external `data` change) never resyncs an open editor. (This deletes the current `useEffect([data]) → revertToData` clobber — review bug #5 — on purpose.)
2. **Every settlement effect is token-gated.** On resolve, a settlement reverts / emits `updateError` / drops **only if it is still the current token for its path**; otherwise it's silently superseded (a newer commit won). This makes the same-node re-edit case (Q2) correct in both orderings: failure-while-re-editing reverts data + `updateError` (buffer untouched, per #1); failure-after-re-commit is ignored.
3. **Same-node failure reverts to last-optimistic, not last-confirmed** (documented behaviour) — simpler, consistent with optimistic UI; true rollback-to-confirmed is a possible later refinement.
4. **All `onEditEvent` emission + the commit pipeline live in the Provider** (see §8).

---

## 10. State shape & transitions

### Store state

```ts
// NOTIFIED bundle — drives primitive selectors; replaced on every change.
interface EditingState {
  active: {
    path: CollectionKey[]                 // always present when active ≠ null
    op: 'edit' | 'rename' | 'add' | 'delete' | 'move'
    phase: 'editing' | 'held'             // 'held' = gate running, tree blocked
    force?: boolean                       // opened via editorRef — overrides allowEdit + redirect-bounce
  } | null
  settling: Record<PathString, Token>     // in-flight optimistic commits → isSettling selector + token gate
  tabDirection: 'next' | 'prev'
  previouslyEdited: CollectionKey[] | null
}

type Token = number                        // module-level monotonic counter (++nextToken)
type PathString = string                   // toPathString(path) — an array can't be a value-key
```

Selectors stay primitive: `isEditing` / `isEditingKey` / `isAddingHere` read `active`; `isHeld` = `active?.phase === 'held'` (the tree-block signal); `isSettling(path)` = `path in settling`.

Out-of-band (closure vars, read at event-time only, never re-render): `nextToken`, `cancelOp` (editing-phase buffer cleanup for a plain switch/Esc), and the refs-to-latest `JsonEditor` supplies — `runUpdate`, `applyValue`, `getLatestData`, `buildNodeData` (+ the existing `onEditEvent`). Each commit's **revert-value is captured in its own `submit` closure**; the store keeps only the token.

### `submit({ path, op, newValue, onCommit? })` — the one entry point

A node calls this when the user commits / triggers an op (it owns the buffer, so it passes `newValue`). The load-bearing trick: decide optimistic-vs-held **after `onUpdate`'s synchronous prefix runs**.

```
submit({ path, op, newValue, onCommit? }):
  token = ++nextToken
  input = buildInput(path, op, newValue)
  fire(submitEventFor(op))                       // submitEdit / submitRename / submitAdd (session ops)

  applied = false ; held = false ; prev = undefined
  apply = ():                                    // the single "apply + close" moment
    if applied: return
    applied = true
    prev = applyValue(path, newValue, op)        // setData; returns the pre-value for revert
    clearActiveIf(path) ; unblockTree()          // close editor
    if hasOnUpdate: settling[path] = token       // register (new bundle → emit; isSettling on)
    fire(commitEventFor(op))                      // commitEdit / … / delete / move

  control.hold = ():
    held = true ; setActiveHeld(path)            // phase 'held' → blocks tree
    return release = (): apply()                 // release() ⇒ apply now

  promise = runUpdate?.(input, control)           // runs the sync prefix → may call hold()

  if not held: apply()                            // ── default optimistic ──
  if not hasOnUpdate: return                       // no settlement, no update* (also the no-op edit path)

  promise.then(result => reconcile({ path, token, op, result, apply, getPrev: () => prev }))
```

`onCommit` (optional) runs inside `apply()` immediately after `commit*` fires. Tab passes `open(next)`, so the next field opens **at the commit moment** — instantly if no hold, at `release()` if held, and not at all if the gate cancels.

### `reconcile()`

```
reconcile({ path, token, op, result, apply, getPrev }):
  // held-without-release: the resolve IS the apply/close moment (pessimistic)
  if not applied:
    if result is null  : fire(cancelEventFor(op)) ; clearActive(path) ; unblockTree() ; return
    if result is error : fire(cancelEventFor(op)) ; clearActive(path) ; unblockTree() ; return
    else               : apply()

  if settling[path] !== token: return             // superseded by a newer commit → ignore silently
  delete settling[path]                            // (new bundle → emit; isSettling off)

  match result:
    void | true   → fire('updateSuccessful')
    { value }     → applyValue(path, value) ; fire('updateSuccessful')
    false|{error} → applyValue(path, getPrev()) ; fire('updateError', {error})   // buffer untouched (§9.1)
    null          → applyValue(path, getPrev())                                   // silent revert
```

### Next

Walk `submit()` / `reconcile()` against every row of the §12 transition table in [EditingModel-current.md](EditingModel-current.md) — Tab, node-switch displacement, filtered-redirect, search-reset, `editorRef`, type-change, delete/add/move — to prove no regression, then implement.
