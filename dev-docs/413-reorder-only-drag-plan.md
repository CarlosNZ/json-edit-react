# Plan: `allowDrag` can return `'reorder'` (#413, low-impact slice)

## Context

Issue #413: drag-and-drop permissions are derived entirely from the edit / add / delete filters. `dropAllowed` in [src/hooks/useDragNDrop.tsx:56-60](../src/hooks/useDragNDrop.tsx#L56-L60) decides:

- same collection → **reorder**, needs `allowEdit` on the parent (`canDragOnto`)
- different collection → **relocate**, needs `allowDelete` on the source (stashed as `dragSource.canDelete` at pickup) AND `allowAdd` on the destination (`canAddHere`)

`allowDrag` (a `FilterFunction` receiving only the source's own `NodeData`, evaluated at render in [useCommon.ts:88](../src/hooks/useCommon.ts#L88)) only gates pickup, so a consumer can't say "this item may be reordered but not moved out" while still letting users add to / delete from those collections. For objects the only workaround (disable `allowAdd`/`allowDelete`) also kills key renaming, since `canEditKey = … canDelete && canAddHere` ([useCommon.ts:177](../src/hooks/useCommon.ts#L177)). `onUpdate` rejection is the only other option, and the drop highlights as allowed first.

Motivating consumer: fig-tree-editor-react v3 wants reorder-only DnD, and a non-reorderable positional argument list.

**Outcome:** `allowDrag` (value or filter return) may be `'reorder'`: the node can be picked up but only dropped within its own collection. Implemented by folding it into the relocate permission already stashed at pickup, so `dropAllowed`'s logic, the highlight/drop parity, and the render-path invariants are untouched. Non-breaking; existing boolean / filter values behave identically.

**Out of scope** (stay on #413 / separate issue):
- Target-aware `allowDrop(source, target)` (gap 3 — e.g. mixed fixed/free positional lists). Can layer on later, AND-ed with these rules.
- Object key-collision highlight: a relocate that will hit `KEY_EXISTS` highlights as allowed, then errors in `handleDrop` ([useDragNDrop.tsx:189-199](../src/hooks/useDragNDrop.tsx#L189-L199)). File as its own issue.

## Changes

### 1. Types — [src/types.ts](../src/types.ts)
- New exported type beside `FilterFunction` (~L285):
  `export type DragFilterFunction<T = JsonData> = (input: NodeData<T>) => boolean | 'reorder'`
- `JsonEditorProps.allowDrag?: boolean | 'reorder' | DragFilterFunction<T>` (L27). A plain `FilterFunction` (and the utils `FilterPredicate`, which takes an optional 2nd arg) stays assignable.
- Internal node props: `allowDragFilter: DragFilterFunction` (L450).
- Re-export `DragFilterFunction` from [src/index.ts](../src/index.ts) next to `FilterFunction` (L34).

### 2. Normalise — [src/JsonEditor.tsx](../src/JsonEditor.tsx)
- `allowDragFilter` (L549) uses a small `getDragFilter` beside `getFilterFunction` (L868): boolean or `'reorder'` → constant function; function → as-is. Keep `getFilterFunction` untouched (it also serves `collapse`'s number form).

### 3. Derive — [src/hooks/useCommon.ts](../src/hooks/useCommon.ts)
- `const dragMode = allowDragFilter(nodeData)`; `canDrag = dragMode !== false`; new `canRelocate = canDelete && dragMode !== 'reorder'`. Return `canRelocate`. Update the comment at L82-87 (present tense, 80-col wrap).
- `canDelete` is unchanged, so the delete button and `canEditKey` are unaffected — reorder-only items stay deletable and renamable.

### 4. Thread — [src/CollectionNode.tsx:101](../src/CollectionNode.tsx#L101), [src/ValueNodeWrapper.tsx:90](../src/ValueNodeWrapper.tsx#L90)
- Pass `canRelocate` to `useDragNDrop` in place of `canDelete`.

### 5. DnD hook — [src/hooks/useDragNDrop.tsx](../src/hooks/useDragNDrop.tsx) + [src/hooks/DragSourceProvider.tsx](../src/hooks/DragSourceProvider.tsx)
- Rename the stashed field `canDelete` → `canRelocate` (`DnDProps`, `DragSource` interface, initial state, the three `setDragSource(...)` calls, `dragSourceProps` memo deps).
- `dropAllowed` becomes `sameCollection ? canDragOnto : dragSource.canRelocate && canAddHere` — same shape. Update its comment and the field comments to describe "relocate permission = deletable and not reorder-only".
- No new node prop and no memo-comparator change: `canRelocate` is computed inside `useCommon` from an existing referentially-stable filter (PERF-ARCHITECTURE invariants hold).

### 6. Tests — [test/dragAndDrop.test.tsx](../test/dragAndDrop.test.tsx) (+ helper in [test/dndHelper.ts](../test/dndHelper.ts))
New `describe('Drag-and-drop: allowDrag="reorder"')`:
- `allowDrag="reorder"` (plain value): reorder within an array works; relocate to a sibling array (default add/delete = true) is refused — `setData` not called.
- Same for object properties, plus the key is still renamable and the delete button still present (asserts `canDelete` not collateral-damaged).
- Filter returning `'reorder'` for some nodes, `true` for others, `false` for pinned: each behaves per its mode.
- Positional-list case: filter returns `false` for one array's items and `'reorder'` elsewhere → that array can't be reordered, nothing relocates into it, and it's still editable.
- **Highlight parity:** add a `startDrag(source)` / `dragOverTarget(el)` helper (mouseDown + dragStart, then dragEnter + dragOver without drop) and assert, for an allowed and a refused target, that `.jer-drag-n-drop-padding` appears iff allowed, `.jer-drop-target-bottom` mounts iff allowed, and the `dragOver` event's `defaultPrevented` matches. Finish with `dragEnd` to reset state.
- Existing tests stay green unchanged (contract preserved).

### 7. Docs
- [README.md](../README.md) "Drag-and-drop reordering" (~L472-490): add a line after the source-filter bullet that `allowDrag` (or its filter) may return `'reorder'` — picked up, but only dropped within its own collection, independent of add/delete. Add a row/footnote to the permission table (relocate additionally requires the source's `allowDrag` not be `'reorder'`). Present tense, no hard wraps, wrapped code examples.
- README props table (L175): type becomes `boolean\|'reorder'\|DragFilterFunction`. Types table (~L335): add `DragFilterFunction` row.
- [CHANGELOG.md](../CHANGELOG.md): one-line announce + link to the README section, under the next unreleased heading (a new feature — likely a new `2.1.0` heading rather than `2.0.1`; confirm at release time). Reference #413.
- No migration-guide entry (nothing a v1 user must act on).

### 8. Demo example — [demo/src/examples/static/drag-drop-rules/Example.tsx](../demo/src/examples/static/drag-drop-rules/Example.tsx)
- Add a `🔵 reorder` item type: draggable with `'reorder'`, deletable. Contrast with `🟡 no-exit` (stays put because it can't be deleted at all) in the header comment.
- `allowDrag` becomes a small filter: `(node) => byValue(REORDER)(node) ? 'reorder' : baseDrag(node)` using the existing `and/not/byValue/primitives` toolkit. `allowDelete = byValue(FREE, REORDER)`.
- Comments wrap at 65 chars; keep import/usage visibility consistent.

## Verification

1. `pnpm test` — new tests fail first against current `main` behaviour (write them before steps 3-5; the plain-value `allowDrag="reorder"` case won't even type-check/behave pre-change), then pass.
2. `pnpm lint` and `pnpm compile` (tsc + ts-prune — confirms `DragFilterFunction` export is consumed/exported cleanly).
3. `SKIP_TESTS=1 pnpm build` then `pnpm -r build` so sub-packages typecheck against the new core `build/` (utils filters must still assign to `allowDrag`).
4. `pnpm dev` → drag-drop-rules example in Chrome (Playwright `channel: 'chrome'`): 🔵 reorders within its list, shows the no-drop cursor / no highlight over other lists, can still be deleted. Firefox check stays manual (arm-on-grab guards untouched, but worth one manual pass).
5. After landing: comment on #413 that the `'reorder'` slice covers gaps 1 and 2; keep it open (or retitle) for `allowDrop`. Open the KEY_EXISTS highlight issue.
