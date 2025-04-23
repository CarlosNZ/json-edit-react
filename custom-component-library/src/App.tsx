// Set to true to store date as Date object, false to store as ISO string
const STORE_DATE_AS_DATE_OBJECT = true

import { useState } from 'react'
import {
  LinkCustomNodeDefinition,
  DateObjectDefinition,
  UndefinedDefinition,
  DatePickerDefinition,
  BooleanToggleDefinition,
  NanDefinition,
  SymbolDefinition,
  BigIntDefinition,
  MarkdownNodeDefinition,
} from '../components'
import { testData } from '../components/data'
import { JsonData, JsonEditor } from '@json-edit-react'

// @ts-expect-error redefine after initialisation
testData['Date & Time'].Date = STORE_DATE_AS_DATE_OBJECT ? new Date() : new Date().toISOString()

type TestData = typeof testData

function App() {
  const [data, setData] = useState<JsonData>(testData)

  console.log('Current data', data)

  return (
    <div id="container">
      <JsonEditor
        // restrictEdit={true}
        data={data}
        setData={setData}
        customNodeDefinitions={[
          LinkCustomNodeDefinition,
          {
            ...(STORE_DATE_AS_DATE_OBJECT ? DateObjectDefinition : DatePickerDefinition),
            customNodeProps: { showTime: (data as TestData)['Date & Time']['Show Time in Date?'] },
          },
          UndefinedDefinition,
          BooleanToggleDefinition,
          NanDefinition,
          SymbolDefinition,
          BigIntDefinition,
          {
            ...MarkdownNodeDefinition,
            condition: ({ key }) => key === 'Markdown',
          },
          {
            ...MarkdownNodeDefinition,
            condition: ({ key }) => key === 'intro',
            hideKey: true,
          },
        ]}
        rootName=""
        showCollectionCount="when-closed"
      />
    </div>
  )
}

export default App
