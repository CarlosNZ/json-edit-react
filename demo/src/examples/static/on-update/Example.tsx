import { useState } from 'react'
import { JsonEditor, type UpdateFunction } from '@json-edit-react'
import { useEditorDefaults } from '@example-resources'

// `onUpdate` runs on every change. Branch on `event`, and
// return a value to accept / transform / reject / cancel it.
// Try these — each shows one of the return types:
//
//   - edit `username` → it's lower-cased ({ value })
//   - remove the "@" from `email` → rejected ({ error })
//   - set `age` below zero → reverted (false)
//   - delete `id` → reverted with no message (null)
//   - anything else → commits as normal (return nothing)
interface Account {
  id: string
  username: string
  email: string
  age: number
}

const initialData: Account = {
  id: 'usr_001',
  username: 'Ada',
  email: 'ada@example.com',
  age: 36,
}

const onUpdate: UpdateFunction<Account> = (props) => {
  switch (props.event) {
    case 'edit': {
      const { key, newValue, newData } = props
      // TRANSFORM the committed value. NOTE: `{ value }` is
      // currently a WHOLE-DOCUMENT override, so we return the
      // full `newData` with just `username` lower-cased.
      // TODO(#375): when `{ value }` becomes node-level this is
      // just `{ value: newValue.toLowerCase() }`, and we'll add
      // a `{ data }` branch to demo the whole-document override.
      if (key === 'username' && typeof newValue === 'string')
        return { value: { ...newData, username: newValue.toLowerCase() } }
      // CUSTOM ERROR: reject with your own message.
      if (key === 'email' && typeof newValue === 'string' && !newValue.includes('@'))
        return { error: 'Not a valid email address' }
      // GENERIC ERROR: reject, revert, show the default message.
      if (key === 'age' && typeof newValue === 'number' && newValue < 0) return false
      return // accept the change
    }
    case 'delete':
      // SILENT CANCEL: revert, but show no error at all.
      if (props.key === 'id') return null
      return
    case 'add':
    case 'rename':
    case 'move':
      return // accept
  }
}

export default function OnUpdateBasics() {
  const [data, setData] = useState<Account>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="account"
      onUpdate={onUpdate}
    />
  )
}
