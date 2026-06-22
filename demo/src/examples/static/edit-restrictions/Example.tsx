import { useState } from 'react'
import { JsonEditor, type FilterFunction } from '@json-edit-react'
import { useEditorDefaults } from '@example-resources'

// A user record with a different rule on almost every node,
// all driven by `allowEdit` / `allowDelete` / `allowAdd`
// filter functions — each runs once per node and returns a
// boolean. Try to edit, rename, delete or add anywhere:
//
//   - the root object and `id` are read-only (allowEdit)
//   - only leaf values can be deleted, never whole
//     collections (allowDelete)
//   - only the `roles` array accepts new items (allowAdd)
//   - `id` is fully locked, and `profile` / top-level keys
//     can be renamed, but the `settings` keys are locked
//     while their values stay editable — a key-rename
//     restriction. Renaming a key needs allowEdit +
//     allowDelete + allowAdd all true on that node (a rename
//     = delete + re-add).
const initialData = {
  id: 'usr_8a3f9c',
  username: 'ada',
  profile: {
    displayName: 'Ada Lovelace',
    title: 'Countess of Lovelace',
    yearOfBirth: 1815,
  },
  roles: ['admin', 'author'],
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  },
}

// The root can't be edited as JSON, `id` is read-only, and
// `settings` can't be edited as raw JSON (which would be a
// back door to renaming its keys).
const allowEdit: FilterFunction = ({ level, key }) =>
  level !== 0 && key !== 'id' && key !== 'settings'

// Only leaf values can be deleted — never a whole
// object/array. `id` is locked, and so is every entry under
// `settings` (`path[length - 2]` is the parent key).
// Blocking delete on the settings entries — while `allowEdit`
// still permits their values — is what locks their KEYS but
// leaves their values editable.
const allowDelete: FilterFunction = ({ size, key, path }) =>
  size === null && key !== 'id' && path[path.length - 2] !== 'settings'

// `allowAdd` puts an "add" button on a collection — and,
// because a rename is a delete + re-add, it also gates KEY
// RENAMING on every node. So among collections only `roles`
// accepts new items; leaves return `true` (no add button, but
// it's what keeps their keys renamable, with allowEdit +
// allowDelete).
const allowAdd: FilterFunction = ({ size, key }) => (size !== null ? key === 'roles' : true)

export default function EditRestrictions() {
  const [data, setData] = useState(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="user"
      allowEdit={allowEdit}
      allowDelete={allowDelete}
      allowAdd={allowAdd}
    />
  )
}
