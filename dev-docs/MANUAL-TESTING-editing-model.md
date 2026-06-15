# Manual testing — v2 optimistic editing model

A step-by-step walkthrough for exercising the new commit lifecycle in the live demo: optimistic-by-default commits, the `hold()` gate, the per-commit token (concurrency), and the full `onEditEvent` stream. Includes temporary instrumentation (a mode-switchable `onUpdate` + an event logger) so you can see every combination.

> **Temporary file** — delete it (and revert the demo edits, see §6) when you're done.

---

## 1. Setup

```sh
pnpm dev        # runs the demo against local src (VITE_JRE_SOURCE=local)
```

- Open the demo in a browser and **open the devtools Console** (you'll read the event/update log there).
- Pick a simple data set from the demo's selector — one with a few **string** values at the top level is ideal (you'll edit/rename/add/delete them). Avoid "Edit Theme" for these tests.
- These tests assume inline error messages are visible. If a rejected edit shows no red message, that data set set `showErrorMessages={false}` — switch data sets, or see the note in §3-C.

---

## 2. Instrument the demo (temporary)

All edits are in **[demo/src/App.tsx](../demo/src/App.tsx)**.

### 2a. Add a mode switch

Add these two constants just above the `function App()` (or anywhere module-scoped at the top of the file):

```tsx
// ─── TEMP: manual-test instrumentation ───────────────────────────────
// Flip TEST_MODE to switch onUpdate behaviour; save to hot-reload.
const TEST_MODE:
  | 'instant-ok'      // commit immediately (fast path)
  | 'slow-ok'         // optimistic: close now, succeed after DELAY
  | 'slow-fail'       // optimistic: close now, REVERT + error after DELAY
  | 'slow-mixed'      // succeed, but FAIL any value containing the letter "z"
  | 'override'        // commit, but replace the doc (adds a _editedAt stamp)
  | 'cancel-null'     // optimistic, then silently revert (no error) after DELAY
  | 'throw'           // optimistic, then throw after DELAY (#271 path)
  | 'gate-slow-ok'    // hold(): stay OPEN + block tree for DELAY, then commit
  | 'gate-confirm'    // hold(): stay open, ask window.confirm, commit or discard
  | 'gate-no-release' // hold() but never release(): resolution decides
  = 'slow-fail'
const DELAY = 3000
// ──────────────────────────────────────────────────────────────────────
```

### 2b. Replace the `onUpdate` prop

Find the current `onUpdate={async (nodeData) => { … }}` (around line 575) and replace the **whole** `onUpdate={…}` prop with:

```tsx
onUpdate={async (nodeData, { hold }) => {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const newValue = 'newValue' in nodeData ? nodeData.newValue : undefined
  console.log(
    `%c⏳ onUpdate[${TEST_MODE}]`,
    'color:#888',
    nodeData.event,
    JSON.stringify(nodeData.path),
    newValue !== undefined ? `→ ${JSON.stringify(newValue)}` : ''
  )

  switch (TEST_MODE) {
    case 'instant-ok':
      return
    case 'slow-ok':
      await wait(DELAY)
      return
    case 'slow-fail':
      await wait(DELAY)
      return false
    case 'slow-mixed':
      await wait(DELAY)
      return String(newValue ?? '').includes('z') ? { error: 'Contains a "z" — rejected' } : undefined
    case 'override':
      await wait(DELAY)
      return {
        value: { ...(nodeData.newData as Record<string, unknown>), _editedAt: new Date().toLocaleTimeString() },
      }
    case 'cancel-null':
      await wait(DELAY)
      return null
    case 'throw':
      await wait(DELAY)
      throw new Error('Simulated save failure')
    case 'gate-slow-ok': {
      const release = hold()
      await wait(DELAY)
      release()
      return
    }
    case 'gate-confirm': {
      const release = hold()
      await wait(300) // let React paint the held state before the (blocking) dialog
      const ok = window.confirm(`Commit ${nodeData.event} at "${nodeData.path.join('.') || 'root'}"?`)
      if (!ok) return null
      release()
      return
    }
    case 'gate-no-release': {
      hold()
      await wait(DELAY)
      return
    }
    default:
      return
  }
}}
```

### 2c. Replace the `onEditEvent` prop with a logger

Find `onEditEvent={(e) => { … }}` (around line 756) and replace it with:

```tsx
onEditEvent={(e) => {
  console.log(
    `%c🔔 ${e.event}`,
    'color:#268bd2;font-weight:bold',
    JSON.stringify(e.path),
    'operation' in e ? `op=${(e as { operation?: string }).operation}` : '',
    'error' in e ? `err=${JSON.stringify((e as { error?: unknown }).error)}` : ''
  )
  // Keep the demo's External-Control "is a node editing?" tracking correct:
  if (e.event.startsWith('start')) setIsEditing(true)
  else if (e.event.startsWith('commit') || e.event.startsWith('cancel')) setIsEditing(false)
}}
```

Save — Vite hot-reloads. You're ready.

---

## 3. The scenarios

For each group, set `TEST_MODE` (top of the file, save, reload), then follow the steps. **"value"** below means a top-level string field; substitute a real key from your data set.

### Group A — Event lifecycle (set `TEST_MODE = 'instant-ok'`)

This group is about the **event stream** (watch the 🔔 log), not timing.

| # | Action | Expected 🔔 stream | Notes |
|---|---|---|---|
| A1 | Double-click a string, change it, **Enter** | `startEdit` → `submitEdit` → `commitEdit` → `updateSuccess` | value updates; one ⏳ onUpdate |
| A2 | Double-click a string, **Enter without changing** | `startEdit` → `submitEdit` → `commitEdit` | **no** `updateSuccess`, and **no** ⏳ — a no-op skips `onUpdate` entirely |
| A3 | Double-click a string, type, **Esc** | `startEdit` → `cancelEdit` | value unchanged; no ⏳ |
| A4 | Double-click a **key**, rename it, **Enter** | `startRename` → `submitRename` → `commitRename` → `updateSuccess` | `commitRename` logs `oldKey`/`newKey` if you expand it |
| A5 | Click **＋** on an object, type a key, **Enter** | `startAdd` → `submitAdd` → `commitAdd` → `updateSuccess` | events fire at the **parent collection** path |
| A6 | Click **＋** on an **array** | `commitAdd` → `updateSuccess` | array adds are **instant** — no `startAdd`/`submitAdd` |
| A7 | Click the **🗑 delete** icon on a node | `delete` → `updateSuccess` | instant — single lifecycle event |
| A8 | Double-click value A, then (without confirming) double-click value B | `startEdit`(A) → `cancelEdit`(A) → `startEdit`(B) | the displaced session cancels cleanly |
| A9 | Double-click value A, change it, **Tab** | `startEdit`(A) → `submitEdit`(A) → `commitEdit`(A) → `startEdit`(B) … then `updateSuccess`(A) | the next field opens **synchronously**; the settlement event for A arrives just after (it's async — interleaving is normal) |

### Group B — Optimistic slow settle (set `TEST_MODE = 'slow-ok'`)

- **B1** Double-click a value, change it, **Enter**.
  - **Expected:** the editor **closes immediately** and the new value shows **immediately** — it does *not* wait for the 3 s. Console: `commitEdit` now, then `⏳ onUpdate` resolving, then `updateSuccess` ~3 s later.
- **B2** Edit a value, change it, **Tab**, change the next, **Tab** again — quickly.
  - **Expected:** Tab advances **instantly** each time (no 3 s stall), even though each commit is still settling in the background. This is the "slow save never blocks the editor" property.

### Group C — Optimistic revert (set `TEST_MODE = 'slow-fail'`) — the headline

- **C1** Double-click a value, change it to `CHANGED`, **Enter**.
  - **Expected:** editor closes, value shows `CHANGED` **immediately**. ~3 s later it **reverts** to the original, and an error appears (inline red message; a toast too if the data set defines `onError`). Console: `commitEdit` … (3 s) … `updateError`.
- **C2** Same, but press **Esc-ish recovery isn't needed** — just confirm the revert is automatic and you didn't have to do anything.

> If no red error message appears on the node, the data set has `showErrorMessages={false}`. Either switch data sets, or temporarily hard-code `showErrorMessages={true}` on the `<JsonEditor>`.

### Group D — Concurrency & the per-commit token (set `TEST_MODE = 'slow-mixed'`)

This proves a late failure reverts **only its own node** and never clobbers a concurrent success.

- **D1** Edit value A → `hello` (no "z" → will succeed), **Tab** to B → `buzz` (has "z" → will fail), **Enter**.
  - **Expected:** both A and B change **immediately** (optimistic). ~3 s later: **A stays `hello`**, **B reverts** with an error. The revert of B must not touch A. Console: two `commitEdit`s, then `updateSuccess`(A) + `updateError`(B).
- **D2** Reverse it: edit A → `buzz` (fail), Tab to B → `hello` (succeed). Same result — only the `z` node reverts, regardless of order.

### Group E — Re-edit during settlement (set `TEST_MODE = 'slow-fail'`)

Proves a stale failure can't clobber a node you've reopened.

- **E1** Edit value A → `attempt1`, **Enter** (closes; 3 s fail pending). **Immediately** double-click A again and type `attempt2` — leave the editor **open**.
  - **Expected:** when the 3 s elapses, the failed commit for `attempt1` reverts the *document* but **does not disturb your open input** — it still shows `attempt2`. Console shows `updateError` while your editor stays open on `attempt2`.
  - Now press **Enter** to commit `attempt2` — it settles as its own fresh commit (`updateError` again, since it still fails, and reverts — that's expected for this mode; the point is the earlier stale result didn't yank your buffer).

### Group F — The gate, non-interactive (set `TEST_MODE = 'gate-slow-ok'`)

- **F1** Double-click a value, change it, **Enter**.
  - **Expected:** the editor **stays open** for ~3 s (this is `hold()` keeping it open), then commits and closes. Console: `submitEdit` now, `commitEdit` only after 3 s.
- **F2** While that 3 s hold is active, try to double-click a *different* node.
  - **Expected:** **nothing happens** — the tree is blocked while a held op is in flight (one operation at a time). After the hold releases, editing works again.

### Group G — The gate, interactive (set `TEST_MODE = 'gate-confirm'`)

- **G1** Edit a value, **Enter** → a `window.confirm` appears. Click **OK**.
  - **Expected:** the edit commits (editor closes, value updates). Console: `submitEdit` → `commitEdit` → `updateSuccess`.
- **G2** Edit a value, **Enter** → confirm dialog → click **Cancel**.
  - **Expected:** the edit is **discarded** — value reverts, no error. Console: `submitEdit` → `cancelEdit` (no `commitEdit`, no `update*`).
- **G3** (optional) `gate-no-release`: same as F1 but the code never calls `release()` — the commit still lands when `onUpdate` resolves after the delay (held-until-resolve). Confirms a `hold()` with no `release()` is safe.

### Group H — Override / silent cancel / throw

- **H1 — Override** (`TEST_MODE = 'override'`): edit a value, **Enter**. After 3 s, the doc gains/updates a top-level **`_editedAt`** field (and your typed value is kept too) — the `{ value }` return replaced the whole document. Console: `commitEdit` → `updateSuccess`.
- **H2 — Silent cancel** (`TEST_MODE = 'cancel-null'`): edit a value, **Enter**. Value shows optimistically, then ~3 s later **reverts with NO error** (no red message, no toast). Console: `commitEdit` … (3 s) … *(no `update*` event)*.
- **H3 — Throw** (`TEST_MODE = 'throw'`): edit a value, **Enter**. After 3 s it reverts and surfaces **"Simulated save failure"** (the thrown message). Console: `commitEdit` → `updateError`.

### Group I — Type changes (set `TEST_MODE = 'instant-ok'`, then try `'slow-fail'`)

The type selector appears while editing a value (needs `allowTypeSelection` — most data sets allow it; if no selector shows, pick a node/data set that does).

- **I1 — Primitive → primitive** (e.g. `string` → `number`): double-click a string, change the **type** dropdown to `number`.
  - **Expected:** this is **local** — the value coerces in the still-open editor, **no ⏳ onUpdate fires, no event**. Only when you press **Enter/OK** does a single `edit` commit run.
- **I2 — → object / array / custom**: change the type to `object`.
  - **Expected:** **structural** — it commits immediately (the editor closes/remounts). Console: `commitEdit` → `updateSuccess` (or revert under `slow-fail`).
- **I3 — rejected to-enum** (if the data set has an enum type, `slow-fail`): selecting an enum coerces locally; pressing Enter commits and, on rejection, reverts — the type selector must return to the original type, not stay stuck on the enum.

### Group J — Per-operation under a slow reject (set `TEST_MODE = 'slow-fail'`)

Confirm every op reverts cleanly when the background save fails:

| Op | Action | Expected after 3 s |
|---|---|---|
| edit | change a value, Enter | value reverts + error |
| rename | rename a key, Enter | key reverts to original + error |
| add (object) | ＋, type key, Enter | the added entry is removed + error |
| add (array) | ＋ on an array | the appended item is removed + error |
| delete | 🗑 on a node | the deleted node **reappears** + error |
| move | drag a node onto a new spot | the node returns to its original position + error (drag-drop) |

---

## 4. Event-stream quick reference

```
value edit / key rename / object add (a session):
  startX → submitX → commitX        (committed)         + updateSuccess | updateError
  startX → cancelX                  (Esc / null gate)   (no update*)
  startX → submitX → commitX        (no-op: value unchanged — NO update*, onUpdate not run)

instant ops (no session):
  delete                            + updateSuccess | updateError
  move                              + updateSuccess | updateError
  array add  →  commitAdd           + updateSuccess | updateError

gate (hold):  submitX … (held, editor open, tree blocked) … commitX   [release() or resolve]
```

- `commit*` fires when the change is **applied** (editor closes). With no gate that's at submit time (optimistic); with `hold()` it's at `release()`.
- `updateSuccess` / `updateError` are the **background settlement** — they only fire when an `onUpdate` actually ran, and they can arrive *after* the next node's `startEdit` (they're async).
- `commitRename` carries `oldKey`/`newKey`; `updateError` carries `error`; both settlement events carry `operation`.

---

## 5. Things that should NEVER happen (regression smell-test)

- A `cancelEdit` **after** a `commitEdit` for the same session (would mean a stale revert clobbered a committed value).
- Two terminal events for one session (e.g. `commitEdit` **and** `cancelEdit`).
- Pressing **Esc** during a slow settle producing both a `cancelEdit` *and* a later `commitEdit`/`setData`.
- A background failure reverting a node **other** than its own (Group D), or yanking an input you've reopened (Group E).
- Tab stalling for the full `DELAY` in the no-gate modes (Group B-2) — it should be instant.

---

## 6. Cleanup

Revert all instrumentation and delete this file:

```sh
git checkout -- demo/src/App.tsx
rm MANUAL-TESTING-editing-model.md
```

(`git checkout` restores the real demo `onUpdate`/`onEditEvent`; nothing here touches `src/`.)
