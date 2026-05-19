// Set to true to store date as Date object, false to store as ISO string
const STORE_DATE_AS_DATE_OBJECT = true

import React, { useState } from 'react'
import SearchHighlightDemo from './SearchHighlightDemo'
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
  ErrorKeyDefinition,
  PrivateKeyDefinition,
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

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 18px',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  color: active ? '#3f5e7a' : '#666',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #3f5e7a' : '2px solid transparent',
  fontSize: '1em',
})

function App() {
  const [tab, setTab] = useState<'components' | 'search'>('components')
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
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5em', borderBottom: '1px solid #ccc' }}>
        <button style={tabStyle(tab === 'components')} onClick={() => setTab('components')}>
          Custom Components
        </button>
        <button style={tabStyle(tab === 'search')} onClick={() => setTab('search')}>
          Search &amp; Highlight
        </button>
      </div>

      {tab === 'search' && <SearchHighlightDemo />}

      {tab === 'components' && <JsonEditor
        customKeyDefinitions={[ErrorKeyDefinition, PrivateKeyDefinition]}
        // restrictEdit={true}
        data={data}
        setData={setData as (data: unknown) => void}
        customNodeDefinitions={[
          { ...ImageNodeDefinition, customNodeProps: { imageStyles: { maxWidth, maxHeight } } },
          LinkCustomNodeDefinition,
          ColorPickerNodeDefinition,
          {
            ...(STORE_DATE_AS_DATE_OBJECT ? DateObjectDefinition : DatePickerDefinition),
            customNodeProps: { showTime },
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
      />}
    </div>
  )
}

export default App
