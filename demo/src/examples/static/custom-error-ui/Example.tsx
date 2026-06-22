import { useState } from 'react'
import {
  JsonEditor,
  type JerErrorCode,
  type JsonData,
  type OnErrorFunction,
  type UpdateFunction,
} from '@json-edit-react'
import { useEditorDefaults, useToast } from '@example-resources'

// Bring your own error UI. Here the "server" is read-only:
// `onUpdate` rejects every change, `showErrorMessages` is off
// so no inline messages appear, and `onError` turns each
// failure into a toast — carrying the error CODE, the PATH it
// happened at, and a readable message.
//
// Every field is editable, but nothing sticks. Try:
//   - edit / delete / add any field → rejected, each with its
//     own code (UPDATE_ERROR, DELETE_ERROR, ADD_ERROR…)
//   - rename a key onto a sibling that already exists (e.g.
//     `port` → `host`) → a KEY_EXISTS error, raised by the
//     editor itself before `onUpdate` even runs

const initialData = {
  host: 'api.example.com',
  port: 8080,
  enabled: true,
  region: 'us-east-1',
  tags: ['prod', 'critical'],
}

// Reject everything. A string `error` is wrapped into a
// JerError whose `code` matches the operation (edit →
// UPDATE_ERROR, delete → DELETE_ERROR, and so on).
const onUpdate: UpdateFunction = () => ({
  error: 'This config is locked on the server',
})

// A friendly label for each error code we expect to see.
const LABELS: Partial<Record<JerErrorCode, string>> = {
  UPDATE_ERROR: 'Edit rejected',
  ADD_ERROR: 'Add rejected',
  DELETE_ERROR: 'Delete rejected',
  RENAME_ERROR: 'Rename rejected',
  KEY_EXISTS: 'Duplicate key',
}

export default function CustomErrorUi() {
  const toast = useToast()
  const [data, setData] = useState<JsonData>(initialData)

  // The custom error UI: every error becomes a toast spelling
  // out WHAT failed (the code), WHERE (the path), and why.
  const onError: OnErrorFunction = ({ error, path }) => {
    const where = path.length ? path.join(' › ') : '(root)'
    toast({
      title: error.code,
      description: `${LABELS[error.code] ?? error.code} at "${where}" — ${error.message}`,
      status: 'error',
      duration: 4000,
      isClosable: true,
      position: 'bottom-left',
    })
  }

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="config"
      showErrorMessages={false}
      onUpdate={onUpdate}
      onError={onError}
    />
  )
}
