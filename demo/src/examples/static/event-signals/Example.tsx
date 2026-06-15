import { useCallback, useState } from 'react'
import {
  JsonEditor,
  type EditEvent,
  type JsonData,
  type OnEditEventFunction,
  type UpdateFunction,
} from '@json-edit-react'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type ToastStatus = 'info' | 'success' | 'warning' | 'error'

// A minimal notifier — a title, a description and a colour `status` is all
// this example needs. `toast` is passed in as a prop (here the demo uses
// Chakra's `useToast()`, but any function of this shape works); the point is
// the `onEditEvent` mapping below, not the toast library.
type Toast = (options: {
  title: string
  description: string
  status: ToastStatus
  duration?: number
  isClosable?: boolean
  position?: 'top-right'
  variant?: string
}) => void

// Group the lifecycle into four colour-coded signals: a session opening or
// being committed (info), a change landing or a save confirming (success), an
// edit discarded or a node removed (warning), and a save rejecting (error).
const statusForEvent = (event: EditEvent['event']): ToastStatus => {
  if (event === 'updateError') return 'error'
  if (event.startsWith('cancel') || event === 'delete') return 'warning'
  if (event.startsWith('commit') || event === 'updateSuccess' || event === 'move')
    return 'success'
  return 'info' // start* / submit*
}

// A one-line summary of where the event landed, plus the bit of payload unique
// to that event (the rename keys, the settlement operation, the error message).
const describeEvent = (e: EditEvent): string => {
  const where = e.path.length ? e.path.join(' › ') : '(root)'
  switch (e.event) {
    case 'commitRename':
      return `${where}  "${e.oldKey}" → "${e.newKey}"`
    case 'updateError':
      return `${where}  ${e.error.message}`
    case 'updateSuccess':
      return `${where}  (${e.operation})`
    default:
      return where
  }
}

const initialData = {
  name: 'Ada Lovelace',
  role: 'Engineer',
  active: true,
  score: 42,
  tags: ['alpha', 'beta'],
  address: { city: 'London', country: 'UK' },
}

export default function EventSignals({ toast }: { toast: Toast }) {
  const [data, setData] = useState<JsonData>(initialData)

  // Turn every lifecycle event into a toast. With the optimistic `onUpdate`
  // below, a single edit reads as a stream: startEdit → submitEdit → commitEdit,
  // then updateSuccess (or updateError) once the async save settles.
  const onEditEvent = useCallback<OnEditEventFunction>(
    (e) => {
      toast({
        title: e.event,
        description: describeEvent(e),
        status: statusForEvent(e.event),
        duration: 2500,
        isClosable: true,
        position: 'top-right',
        variant: 'left-accent',
      })
    },
    [toast]
  )

  // Settle after a random 0.5–3 s, then fail 1 in 4 saves — so the stream mixes
  // updateSuccess (green) and updateError (red) at unpredictable delays.
  const onUpdate = useCallback<UpdateFunction>(async () => {
    await wait(500 + Math.random() * 2500)
    if (Math.random() < 0.25) return { error: 'Random save failure (1 in 4)' }
  }, [])

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      showErrorMessages
      allowTypeSelection
      onUpdate={onUpdate}
      onEditEvent={onEditEvent}
    />
  )
}
