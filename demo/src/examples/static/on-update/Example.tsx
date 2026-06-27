import { useState } from 'react'
import { JsonEditor, type UpdateFunction } from '@json-edit-react'
import { useEditorDefaults } from '@example-resources'

// `onUpdate` runs on every change. Branch on `event`, and
// return a value to accept / transform / reject / cancel it.
// Try these — each shows one of the return types:
//
//   - edit `username` → lower-cased in place ({ value })
//   - edit `email` (valid) → stamps `lastEdited` ({ data })
//   - remove the "@" from `email` → rejected ({ error })
//   - set `age` below zero → reverted (false)
//   - delete `id` → reverted with no message (null)
//   - anything else → commits as normal (return nothing)
interface Account {
  id: string
  username: string
  email: string
  age: number
  lastEdited?: string
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
      // NODE-LEVEL `{ value }`: transform just the edited node's
      // value — applied at its own path, the rest of the doc
      // untouched.
      if (key === 'username' && typeof newValue === 'string')
        return { value: newValue.toLowerCase() }
      if (key === 'email' && typeof newValue === 'string') {
        // CUSTOM ERROR: reject with your own message.
        if (!newValue.includes('@')) return { error: 'Not a valid email address' }
        // WHOLE-DOCUMENT `{ data }`: rewrite the whole document —
        // here, stamp a top-level `lastEdited` alongside the edit.
        return { data: { ...newData, lastEdited: new Date().toLocaleTimeString() } }
      }
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
