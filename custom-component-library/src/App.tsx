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
  EnhancedLinkCustomNodeDefinition,
} from '../components'
import { testData } from '../components/data'
import { JsonData, JsonEditor } from '@json-edit-react'

if (testData?.['Date & Time']) {
  // @ts-expect-error redefine after initialisation
  testData['Date & Time'].Date = STORE_DATE_AS_DATE_OBJECT ? new Date() : new Date().toISOString()

  testData['Date & Time'].info = STORE_DATE_AS_DATE_OBJECT
    ? 'Date is stored a JS Date object. To use ISO string, set STORE_DATE_AS_DATE_OBJECT to false in App.tsx.'
    : 'Date is stored as ISO string. To use JS Date objects, set STORE_DATE_AS_DATE_OBJECT to true in App.tsx.'
}

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
            customNodeProps: {
              showTime: (data as TestData)?.['Date & Time']?.['Show Time in Date?'] ?? false,
            },
          },
          EnhancedLinkCustomNodeDefinition,
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
            condition: ({ key }) => key === 'Intro',
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
