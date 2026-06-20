import { useState } from 'react'
import { JsonEditor, type DefaultValueFunction, type OnChangeFunction } from '@json-edit-react'
import { and, byKey, byLevel, matchRecord, not } from '@json-edit-react/utils/filters'
import { initialData } from './data'
import { SearchBox, useEditorDefaults } from '@example-resources'

export { initialData }

// An array of user records, taken from
// https://jsonplaceholder.typicode.com/users.
//
// Several props combine to model a real "client list":
//
//   - The `id` field can't be edited (it'd be the
//     database key), and the top-level "Person" objects
//     can't have fields added or deleted — only their
//     nested values are editable. This is done with the
//     `allowEdit` / `allowAdd` / `allowDelete` filter
//     functions, composed from the filter toolkit.
//   - Adding an item to the root array seeds a correctly
//     structured "Person" object, while adding elsewhere
//     seeds a simple string — see `defaultValue`.
//   - "Search" matches whole people on `name` /
//     `username` (and shows all their fields) via a
//     `searchFilter` built with `matchRecord`.
//   - `onChange` restricts `name` to letters/spaces and
//     strips line breaks from a few text fields.

// Search matches a person on their `name` or `username`,
// then reveals all of that person's fields. `matchRecord`
// is the filter toolkit's shorthand for this hand-written
// equivalent:
//
// ({ path, fullData }, searchText) => {
//   if (path?.length >= 2) {
//     const index = path?.[0]
//     return (
//     matchNode({ value: fullData[index].name }, searchText) ||
//     matchNode({ value: fullData[index].username }, searchText)
//     )
//   } else return false
// }
export const searchFilter = matchRecord({ fields: ['name', 'username'] })

// `id` is never editable, and only values at level 2 or
// deeper can be edited (so the root array and the Person
// objects themselves stay locked).
export const allowEdit = and(not(byKey('id')), byLevel({ min: 2 }))

// New fields can be added anywhere EXCEPT the Person
// objects (level 1) — keeping their shape fixed.
export const allowAdd = not(byLevel(1))

// Only whole Person objects (level 1) can be deleted.
export const allowDelete = byLevel(1)

// Adding to the root array (level 0) seeds a full Person
// object; adding anywhere else seeds a plain string.
export const defaultValue: DefaultValueFunction = ({ level }) => {
  if (level === 0)
    return {
      id: Math.floor(Math.random() * 1000) + 10,
      name: 'New User',
      username: 'user',
      email: 'info@test.com',
      address: {
        street: '',
        suite: '',
        city: '',
        zipcode: '',
        geo: {
          lat: 0,
          lng: 0,
        },
      },
      phone: '1234',
      website: '',
      company: {
        name: '',
        catchPhrase: '',
        bs: '',
      },
    }
  return 'New Value'
}

// Live input constraints: `name` keeps only letters and
// spaces; a few text fields just drop line breaks.
export const onChange: OnChangeFunction = ({ newValue, key }) => {
  if (key === 'name') return (newValue as string).replace(/[^a-zA-Z\s]|\n|\r/gm, '')
  if (['username', 'email', 'phone', 'website'].includes(key as string))
    return (newValue as string).replace(/\n|\r/gm, '')
  return newValue
}

export default function JsonPlaceholder() {
  const [data, setData] = useState(initialData)
  // The editor filters on `searchText`; wire it to a search
  // box — `searchFilter` above does the matching. The wrapping
  // div is the positioning context for `SearchBox`, which
  // floats over the editor's top-right corner.
  const [searchText, setSearchText] = useState('')

  return (
    <div style={{ position: 'relative' }}>
      <SearchBox
        value={searchText}
        onChange={setSearchText}
        placeholder="Search by name or username"
      />
      <JsonEditor
        data={data}
        setData={setData}
        {...useEditorDefaults()}
        rootName="Clients"
        collapse={2}
        allowEdit={allowEdit}
        allowAdd={allowAdd}
        allowDelete={allowDelete}
        searchFilter={searchFilter}
        searchText={searchText}
        defaultValue={defaultValue}
        onChange={onChange}
      />
    </div>
  )
}
