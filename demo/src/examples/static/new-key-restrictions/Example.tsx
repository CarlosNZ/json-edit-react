import { useState } from 'react'
import {
  JsonEditor,
  type DefaultValueFunction,
  type NewKeyOptionsFunction,
} from '@json-edit-react'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Two ways to shape how NEW keys get added to a collection:
//
//   - `newKeyOptions` returns a fixed list → the "new key"
//     text input becomes a dropdown of just those choices
//   - `defaultValue` seeds a freshly-added key's value (its
//     2nd argument is the key being added)
//
// Click "+" on `contact` to add from a fixed field list (each
// with its own default); click "+" on `tags` to type any key
// freely. Returning nothing from either falls back to the
// defaults: free-text key, `null` value.
const initialData = {
  name: 'Ada Lovelace',
  contact: {
    email: 'ada@example.com',
  },
  tags: {
    vip: true,
  },
}

const CONTACT_FIELDS = ['email', 'phone', 'website', 'address']

const newKeyOptions: NewKeyOptionsFunction = ({ key }) => {
  // Only `contact` is restricted to a fixed set of keys;
  // returning nothing elsewhere keeps the free-text input.
  if (key === 'contact') return CONTACT_FIELDS
}

const defaultValue: DefaultValueFunction = (_, newKey) => {
  // Seed each new contact field with a sensible placeholder.
  switch (newKey) {
    case 'email':
      return 'name@example.com'
    case 'phone':
      return '+1 555 0100'
    case 'website':
      return 'https://example.com'
    case 'address':
      return 'Street, City'
    // No match → returns undefined → falls back to `null`.
  }
}

export default function NewKeyRestrictions() {
  const [data, setData] = useState(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="profile"
      newKeyOptions={newKeyOptions}
      defaultValue={defaultValue}
    />
  )
}
