import { useState } from 'react'
import { JsonEditor, type JsonData } from '@json-edit-react'
import { and, byKey, byValue, not, primitives } from '@json-edit-react/utils/filters'
import { useEditorDefaults } from '@example-resources'

// Exercises every drag-and-drop permission rule. A drop inserts the
// dragged item as a sibling of whatever you drop it ONTO, into that
// item's list — so to move an item INTO a list, drop it onto an
// item already in that list (not onto the list's header).
//
// Item types (by value):
//   🟢 free     draggable + deletable → can reorder AND move out
//   🟡 no-exit  draggable, not delete → can reorder, can't leave
//   🔴 pinned   not draggable         → can't be picked up at all
//
// List types (by key) — (reorder within / accepts drops):
//   open         edit ✓  add ✓
//   reorderOnly  edit ✓  add ✗
//   dropZone     edit ✗  add ✓
//   locked       edit ✗  add ✗
//
// The four rules, built from the filter toolkit:
//   pick up  → allowDrag   any item except 🔴 pinned
//   reorder  → allowEdit   the list (open / reorderOnly)
//   move out → allowDelete only 🟢 free may leave its list
//   move in  → allowAdd    the destination list (open / dropZone)
//
// Things to try: reorder a 🟢/🟡 inside open (works) vs inside
// locked (blocked); move a 🟢 from open onto an item in dropZone
// (works) vs onto reorderOnly (blocked — no add) vs move a 🟡
// anywhere (blocked — no delete); drag a 🔴 (nothing happens).

const FREE = '🟢 free'
const NO_EXIT = '🟡 no-exit'
const PINNED = '🔴 pinned'

const items = () => [FREE, NO_EXIT, PINNED]

const initialData = {
  open: items(), // edit ✓  add ✓
  reorderOnly: items(), // edit ✓  add ✗
  dropZone: items(), // edit ✗  add ✓
  locked: items(), // edit ✗  add ✗
}

// Pick up: any item except a pinned one (`primitives` = leaf items,
// so whole lists are never draggable).
const allowDrag = and(primitives, not(byValue(PINNED)))

// Move out (relocate to another list): only 🟢 free may leave.
const allowDelete = byValue(FREE)

// Reorder within a list: only these lists are editable.
const allowEdit = byKey('open', 'reorderOnly')

// Move in (relocate target): only these lists accept drops.
const allowAdd = byKey('open', 'dropZone')

export default function DragDropRules() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="lists"
      allowDrag={allowDrag}
      allowEdit={allowEdit}
      allowDelete={allowDelete}
      allowAdd={allowAdd}
    />
  )
}
