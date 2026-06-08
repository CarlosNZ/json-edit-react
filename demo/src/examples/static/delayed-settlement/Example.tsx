import { useState } from 'react'
import { JsonEditor } from '@json-edit-react'
import { useExampleTheme } from '../../kit/exampleThemeContext' // ---cut---

const initialData = {
  name: 'Project Phoenix',
  status: 'draft',
  priority: 3,
  tags: ['internal', 'q3'],
}

export default function DelayedSettlement() {
  const [data, setData] = useState(initialData)
  const theme = useExampleTheme() // ---cut---

  return (
    <JsonEditor
      data={data}
      setData={setData}
      theme={theme} // ---cut---
      rootName="project"
      onUpdate={async ({ newData }) => {
        // Simulate persisting the change to a server. The edit is shown
        // immediately; this promise resolving is what "settles" it. Throwing (or
        // returning an error string) here would roll the optimistic edit back.
        await new Promise((resolve) => setTimeout(resolve, 1200))
        console.log('Saved to server:', newData)
      }}
    />
  )
}
