import { useCallback, useState } from 'react'
import {
  JsonEditor,
  type JsonData,
  type OnEditEventFunction,
  type UpdateFunction,
} from '@json-edit-react'
import { useEditorDefaults, useToast } from '@example-resources'
import { statusForEvent, describeEvent } from './exampleHelpers'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const initialData = {
  name: 'Ada Lovelace',
  role: 'Engineer',
  active: true,
  score: 42,
  tags: ['alpha', 'beta'],
  address: { city: 'London', country: 'UK' },
}

export default function EventSignals() {
  const [data, setData] = useState<JsonData>(initialData)
  const toast = useToast()

  // Turn every lifecycle event into a toast. With the optimistic
  // `onUpdate` below, a single edit reads as a stream: startEdit →
  // submitEdit → commitEdit, then updateSuccess (or updateError)
  // once the async save settles.
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

  // Settle after a random 0.5–3 s, then fail 1 in 4 saves — so the
  // stream mixes updateSuccess (green) and updateError (red) at
  // unpredictable delays.
  const onUpdate = useCallback<UpdateFunction>(async () => {
    await wait(200 + Math.random() * 3000)
    if (Math.random() < 0.25) return { error: 'Random save failure (1 in 4)' }
  }, [])

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      showErrorMessages
      allowTypeSelection
      onUpdate={onUpdate}
      onEditEvent={onEditEvent}
    />
  )
}
