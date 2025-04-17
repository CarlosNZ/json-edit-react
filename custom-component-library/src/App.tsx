import {
  LinkCustomNodeDefinition,
  DateObjectDefinition,
  UndefinedDefinition,
  DatePickerDefinition,
  BooleanToggleDefinition,
  NanDefinition,
  SymbolDefinition,
  BigIntDefinition,
} from '@components'
import { testData } from '@components/data'
import { JsonData, JsonEditor } from '@json-edit-react'
import { useState } from 'react'

function App() {
  const [data, setData] = useState<JsonData>(testData)

  console.log('Current data', data)

  type TestData = typeof testData

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
            customNodeProps: { showTime: (data as TestData)['Show Time in Dates?'] },
          },
          UndefinedDefinition,
          {
            ...DatePickerDefinition,
            customNodeProps: { showTime: (data as TestData)['Show Time in Dates?'] },
          },
          BooleanToggleDefinition,
          NanDefinition,
          SymbolDefinition,
          BigIntDefinition,
        ]}
        rootName=""
      />
    </div>
  )
}

export default App
