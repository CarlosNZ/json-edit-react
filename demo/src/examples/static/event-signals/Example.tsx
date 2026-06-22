import { useCallback, useState } from 'react'
import { JsonEditor, type JsonData, type OnEditEventFunction } from '@json-edit-react'
import { booleanToggleDefinition } from '@json-edit-react/components'
import { useEditorDefaults, useToast } from '@example-resources'
import { statusForEvent, describeEvent, saveToRemoteServer } from './exampleHelpers'

const initialData = {
  'Use delayed settlement': false,
  name: 'Alan Turing',
  role: 'Mathematician',
  active: true,
  score: 42,
  tags: ['alpha', 'beta'],
  address: { city: 'London', country: 'UK' },
}

// "Use delayed settlement" rendered as a switch.
const customNodeDefinitions = [
  booleanToggleDefinition({
    condition: ({ key }) => key === 'Use delayed settlement',
  }),
]

export default function EventSignals() {
  const [data, setData] = useState<JsonData>(initialData)
  const toast = useToast()

  const useDelayed =
    (data as { 'Use delayed settlement'?: boolean })['Use delayed settlement'] ?? false

  // Turn every lifecycle event into a toast. Each edit streams
  // startEdit → submitEdit → commitEdit; with delayed settlement
  // on, updateSuccess (or updateError) joins the tail once the
  // async save resolves.
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

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      showErrorMessages
      allowTypeSelection
      customNodeDefinitions={customNodeDefinitions}
      // Off → no onUpdate (edits commit immediately); on → the
      // delayed saveToRemoteServer.
      onUpdate={useDelayed ? saveToRemoteServer : undefined}
      onEditEvent={onEditEvent}
    />
  )
}
