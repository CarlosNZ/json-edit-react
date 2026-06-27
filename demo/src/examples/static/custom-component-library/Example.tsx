import { useState } from 'react'
import { JsonEditor, type JsonData } from '@json-edit-react'
import {
  dateObjectDefinition,
  datePickerDefinition,
  unixTimestampDefinition,
  imageDefinition,
  hyperlinkDefinition,
  enhancedLinkDefinition,
  undefinedDefinition,
  booleanToggleDefinition,
  nanDefinition,
  symbolDefinition,
  bigIntDefinition,
  colorPickerDefinition,
  markdownDefinition,
} from '@json-edit-react/components'
import { ReactDatePicker } from '@json-edit-react/components/widgets'
import { initialData, type CustomComponentLibraryData } from './data'
import { SearchBox, useEditorDefaults } from '@example-resources'

// Showcases every custom component in the Custom Component
// Library (`@json-edit-react/components`) — ready-to-go
// `CustomNodeDefinition`s for common data types and useful
// data structures, wired onto a single data set. Hyperlinks,
// an "enhanced" link, date/time editors, a UNIX-timestamp
// editor, Markdown, an image, a colour picker, and the
// non-JSON types (`undefined`, `NaN`, `Symbol`, `BigInt`).

export { initialData, type CustomComponentLibraryData }

// Some definitions are configured by values in the data set
// itself (the "Image properties" and "Show Time in Date?"
// nodes), so the list is a function of the current data,
// rebuilt as it's edited.
export const customNodeDefinitions = (currentData: JsonData) => {
  const libraryData = currentData as CustomComponentLibraryData
  return [
    dateObjectDefinition({
      componentProps: {
        showTime: libraryData?.['Date & Time']?.['Show Time in Date?'] ?? false,
      },
    }),
    datePickerDefinition({
      componentProps: {
        showTime: libraryData?.['Date & Time']?.['Show Time in Date?'] ?? false,
        DatePicker: ReactDatePicker,
      },
    }),
    unixTimestampDefinition({
      componentProps: {
        DatePicker: ReactDatePicker,
        showTime: libraryData?.['Date & Time']?.['Show Time in Date?'] ?? false,
        // The `unit` defaults to 'auto', so the seconds
        // and millisecond fields are each detected by
        // magnitude.
        displayAs:
          (libraryData?.['Date & Time']?.['Show Unix as raw number?'] ?? true) ? 'number' : 'date',
      },
    }),
    imageDefinition({
      componentProps: {
        imageStyles: {
          maxHeight: libraryData?.Images?.['Image properties']?.maxHeight,
          maxWidth: libraryData?.Images?.['Image properties']?.maxWidth,
        },
      },
    }),
    hyperlinkDefinition(),
    enhancedLinkDefinition(),
    undefinedDefinition(),
    booleanToggleDefinition(),
    nanDefinition(),
    symbolDefinition(),
    bigIntDefinition(),
    colorPickerDefinition(),
    // The factory ANDs these conditions with the built-in
    // string guard, so a node switched to another type
    // (e.g. number) renders natively rather than as
    // markdown text
    markdownDefinition({ condition: ({ key }) => key === 'Markdown' }),
    markdownDefinition({
      condition: ({ key }) => key === 'Intro',
      showKey: false,
      componentProps: {
        components: {
          // @ts-expect-error Ignore _ var
          a: ({ _, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        },
      },
    }),
  ]
}

export default function CustomComponentLibrary() {
  const [data, setData] = useState<JsonData>(initialData)
  const [searchText, setSearchText] = useState('')

  return (
    <div style={{ position: 'relative' }}>
      <SearchBox value={searchText} onChange={setSearchText} placeholder="Search" />
      <JsonEditor
        data={data}
        setData={setData}
        {...useEditorDefaults()}
        rootName="components"
        collapse={3}
        customNodeDefinitions={customNodeDefinitions(data)}
        searchText={searchText}
      />
    </div>
  )
}
