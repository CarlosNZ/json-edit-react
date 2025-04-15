import {
  LinkCustomNodeDefinition,
  DateObjectDefinition,
  UndefinedDefinition,
  DatePickerDefinition,
} from '@components'
import { testData } from '@components/data'
import { JsonData, JsonEditor } from 'json-edit-react'
import { useState } from 'react'

function App() {
  const [data, setData] = useState<JsonData>(testData)

  console.log('Current data', data)

  return (
    <div id="container">
      <h1>json-edit-react</h1>
      <h2>Custom component library</h2>
      <JsonEditor
        data={data}
        setData={setData}
        customNodeDefinitions={[
          LinkCustomNodeDefinition,
          {
            ...DateObjectDefinition,
            customNodeProps: { showTime: (data as Record<string, unknown>)['Show Time in Dates?'] },
          },
          UndefinedDefinition,
          {
            ...DatePickerDefinition,
            customNodeProps: { showTime: (data as Record<string, unknown>)['Show Time in Dates?'] },
          },
        ]}
        rootName=""
      />
    </div>
  )
}

export default App
