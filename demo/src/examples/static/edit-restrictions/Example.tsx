import { useState } from 'react'
import { JsonEditor, type JsonData } from '@json-edit-react'
import { byKey, byValue, or } from '@json-edit-react/utils/filters'
import { useEditorDefaults } from '@example-resources'

// Every permission that governs *editing* in one place
// (drag-and-drop has its own page). Each rule is a filter
// function: it runs per node and returns a boolean.
//
// Three boxes, differing in what they allow:
//   addable  → allowAdd ✓ (shows a + button)
//   sealed   → allowAdd ✗ (no + button)
//   editable → the whole box edits as raw JSON
//
// `addable` and `sealed` hold the same four leaves, labelled
// by the two powers the node itself controls — editing its
// value and deleting it:
//   🟢 edit ✓ · delete ✓
//   🟡 edit ✗ · delete ✓
//   🟠 edit ✓ · delete ✗
//   🔴 edit ✗ · delete ✗
//
// Renaming a key is NOT its own permission: it's a delete of
// the old key + an add of the new one to the PARENT box. So a
// key is renamable only when the node is deletable AND its
// box is `addable`:
//   • in addable → 🟢 and 🟡 rename; 🟠 and 🔴 don't
//   • in sealed  → nothing renames (the box takes no adds)
// Note 🟡: its value can't be edited, yet its key still
// renames — a rename never consults allowEdit.
//
// `editable` holds the same four leaves, but the box itself
// is editable as JSON. A per-leaf edit/delete rule only
// governs editing that leaf IN PLACE — rewriting the box as
// raw JSON sidesteps the lot, so even 🔴 can be changed.

const ED = '🟢 edit ✓ · delete ✓'
const D = '🟡 edit ✗ · delete ✓'
const E = '🟠 edit ✓ · delete ✗'
const NONE = '🔴 edit ✗ · delete ✗'

const leaves = () => ({ alpha: ED, beta: D, gamma: E, delta: NONE })

const initialData = {
  addable: leaves(), //  allowAdd ✓ — deletable keys here rename
  sealed: leaves(), //   allowAdd ✗ — no keys here rename
  editable: leaves(), // the whole box edits as raw JSON
}

// Edit a value inline: the 🟢 / 🟠 leaves. Plus the whole
// `editable` box edits as raw JSON — which overrides every
// per-leaf rule inside it (the classic back door).
const allowEdit = or(byValue(ED, E), byKey('editable'))

// Delete a node: the 🟢 / 🟡 leaves.
const allowDelete = byValue(ED, D)

// Add to a collection — only `addable`. This is also the
// parent-side half of the key-rename rule.
const allowAdd = byKey('addable')

export default function EditRestrictions() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="data"
      allowEdit={allowEdit}
      allowDelete={allowDelete}
      allowAdd={allowAdd}
    />
  )
}
