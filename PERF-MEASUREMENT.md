# Perf measurement guide (V2 §16 fine-grained re-rendering)

Working scratch-doc for measuring re-render cost before/after each stage of the
[issue #255](https://github.com/CarlosNZ/json-edit-react/issues/255) perf work.
Not shipped — delete before the work lands, or keep as a maintenance note.

## One-time setup

1. `pnpm dev`, then paste in **`data/medium-test-data.json5`** (~19k nodes) and
   **fully expand** the tree (Option/Alt-click the root chevron, or set the
   collapse level high). Use the **same** expansion state for every before/after
   run so the mounted-node count is identical.
2. Browser DevTools → **Components** tab → gear icon → tick
   **"Highlight updates when components render."**
3. The **⚡ Render Profiler** overlay sits bottom-right (Commits / Last commit /
   Total, with a Reset button).

> Size ladder (all reproducible from `scripts/generate-test-data.mjs`):
> `medium` ≈ 19k (workhorse) · `very-large` ≈ 82k (stress) · `massive` ≈ 135k (extreme).

## The four interactions

Pick one **deep leaf string value** (e.g. a `name` deep inside a province) and
use the **same** one every time. For each interaction: **click Reset first**, do
the action, wait for it to settle, then read the overlay.

| # | Interaction | Exact steps |
|---|---|---|
| **1. Enter edit** | open the editor on a leaf | Reset → double-click the value → wait |
| **2. Keystroke** | type one char while editing | (from step 1, still editing) Reset → type one character → wait |
| **3. Commit** | save the edit | (still editing) Reset → press **Enter** → wait to settle |
| **4. Tab-move** | move edit to next field | double-click a leaf → Reset → press **Tab** → wait |

## What to record

For each interaction, three numbers + one qualitative note:

- **Commits** — count after it settles (overlay)
- **Last commit** — ms (overlay; React render phase only — excludes effects & paint)
- **settle** — wall-clock seconds until the UI is responsive again (eyeballed).
  Captures the post-commit `jsonStringify` effects + browser paint that
  `Last commit` can't see.
- **flash** — how much of the tree lit up in Highlight-updates: `whole tree` /
  `most` / `a couple of nodes`. (Glitches out on multi-second commits — drop to
  a smaller dataset just to observe the flash pattern.)

Template (one block per measurement run):

```
Stage: __________   Dataset: medium (~19k), fully expanded

1. Enter edit:  commits=__  last=__ ms  settle=__s  flash=__________
2. Keystroke:   commits=__  last=__ ms  settle=__s  flash=__________
3. Commit:      commits=__  last=__ ms  settle=__s  flash=__________
4. Tab-move:    commits=__  last=__ ms  settle=__s  flash=__________
```

## What each stage should change

- **Baseline (now):** everything fans out — every interaction flashes most/all of
  the tree; Commit is the heavy one (~8s on fully-expanded medium).
- **After Stage B (lazy jsonStringify):** *Commit* and initial load get cheaper
  (no more serializing every collection up the spine). Editing fan-out unchanged.
- **After Stage C (selectable editing store):** *Enter edit* and *Tab-move* stop
  flashing the whole tree — only the leaving/entering node should light up.
  (One whole-tree flash still expected on the *very first* edit-start and the
  *final* edit-end — the `canDrag` global flip.)
- **After Stage D (React.memo boundary):** *Commit* only re-renders the edited
  node + its ancestor spine — sibling subtrees stay dark.

---

## Results log

### Baseline
```
Stage: baseline   Dataset: medium (~19k), fully expanded

1. Enter edit:  commits=1  last=3126 ms  settle=~8-10s  flash=whole tree
2. Keystroke:   commits=1  last=3 ms     settle=instant flash=(glitch; ~nothing — 3ms)
3. Commit:      commits=2  last=2312 ms  settle=~8-10s  flash=whole tree
4. Tab-move:    commits=1  last=2197 ms  settle=~8-10s  flash=whole tree
```
Read: every interaction except the keystroke fans out across the whole tree.
`Last commit` (React render) is 2–3s; total felt settle is 8–10s — the gap is
the post-commit jsonStringify-spine effect (Stage B) + paint (add-on). Keystroke
is already free (local state).

### After Stage B
```
1. Enter edit:  commits=__  last=__ ms  settle=__s  flash=__________
2. Keystroke:   commits=__  last=__ ms  settle=__s  flash=__________
3. Commit:      commits=__  last=__ ms  settle=__s  flash=__________
4. Tab-move:    commits=__  last=__ ms  settle=__s  flash=__________
```

### After Stage C
```
1. Enter edit:  commits=__  last=__ ms  settle=__s  flash=__________
2. Keystroke:   commits=__  last=__ ms  settle=__s  flash=__________
3. Commit:      commits=__  last=__ ms  settle=__s  flash=__________
4. Tab-move:    commits=__  last=__ ms  settle=__s  flash=__________
```

### After Stage D
```
1. Enter edit:  commits=__  last=__ ms  settle=__s  flash=__________
2. Keystroke:   commits=__  last=__ ms  settle=__s  flash=__________
3. Commit:      commits=__  last=__ ms  settle=__s  flash=__________
4. Tab-move:    commits=__  last=__ ms  settle=__s  flash=__________
```
