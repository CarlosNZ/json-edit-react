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
  ImageNodeDefinition,
  ColorPickerNodeDefinition,
} from '../components'
import { testData } from './data'
import { JsonEditor } from '@json-edit-react'

if (testData?.['Date & Time']) {
  // @ts-expect-error redefine after initialisation
  testData['Date & Time'].Date = STORE_DATE_AS_DATE_OBJECT ? new Date() : new Date().toISOString()

  // @ts-expect-error adding property
  testData['Date & Time'].info = STORE_DATE_AS_DATE_OBJECT
    ? 'Date is stored a JS Date object. To use ISO string, set STORE_DATE_AS_DATE_OBJECT to false in App.tsx.'
    : 'Date is stored as ISO string. To use JS Date objects, set STORE_DATE_AS_DATE_OBJECT to true in App.tsx.'

  // @ts-expect-error only used in Demo app
  delete testData['Date & Time']['Date Object']
}

type TestData = typeof testData

function App() {
  const [data, setData] = useState<TestData>(testData)

  console.log('Current data', data)

  // Properties that are conditional on some data property:

  // Display the time depending on whether or not the "Show time" toggle is
  // checked
  const showTime = data?.['Date & Time']?.['Show Time in Date?'] ?? false

  // Image sizing
  const maxWidth = data?.Images?.['Image properties']?.maxWidth
  const maxHeight = data?.Images?.['Image properties']?.maxHeight

  return (
    <div id="container">
      <JsonEditor
        // restrictEdit={true}
        data={data}
        setData={setData as (data: unknown) => void}
        customNodeDefinitions={[
          { ...ImageNodeDefinition, customNodeProps: { imageStyles: { maxWidth, maxHeight } } },
          ColorPickerNodeDefinition,
          LinkCustomNodeDefinition,
          {
            ...(STORE_DATE_AS_DATE_OBJECT ? DateObjectDefinition : DatePickerDefinition),
            customNodeProps: {
              // Display the time depending on whether or not the "Show time"
              // toggle is checked
              showTime,
            },
          },
          EnhancedLinkCustomNodeDefinition,
          UndefinedDefinition,
          BooleanToggleDefinition,
          NanDefinition,
          SymbolDefinition,
          BigIntDefinition,
          // Can override specific definition properties when using the
          // components
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
