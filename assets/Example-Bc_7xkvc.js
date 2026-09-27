const n=`import { useState } from 'react'
import {
  JsonEditor,
  type JsonData,
  type EnumDefinition,
  type TypeFilterFunction,
} from '@json-edit-react'
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
  numberFormatterDefinition,
} from '@json-edit-react/components'
import { ReactDatePicker } from '@json-edit-react/components/widgets'
import { byKey } from '@json-edit-react/utils/filters'
import { initialData, type CustomComponentLibraryData } from './data'
import { SearchBox, useEditorDefaults } from '@example-resources'

// Showcases every custom component in the Custom Component
// Library (\`@json-edit-react/components\`) — ready-to-go
// \`CustomNodeDefinition\`s for common data types and useful
// data structures, wired onto a single data set. Hyperlinks,
// an "enhanced" link, date/time editors, a UNIX-timestamp
// editor, Markdown, an image, a colour picker, the
// non-JSON types (\`undefined\`, \`NaN\`, \`Symbol\`, \`BigInt\`),
// and locale-aware number formatting.

export { initialData, type CustomComponentLibraryData }

// The "Number Formatting" block's \`locale\` node is locked
// to this enum. Picking a locale re-derives the
// definitions below (they read it from the data), so every
// number in the block reformats live.
const localeEnum: EnumDefinition = {
  enum: 'Locale',
  values: [
    'en-US',
    'en-GB',
    'de-DE',
    'fr-FR',
    'es-ES',
    'it-IT',
    'ja-JP',
    'zh-CN',
    'hi-IN',
    'ar-EG',
    'ru-RU',
    'pt-BR',
  ],
  // Recognise the stored string as this enum on load (the
  // node is locked to it, so it can't be switched to).
  matchPriority: 1,
}

// A representative currency per locale, so the \`currency\`
// demo also shows currency-specific rules (e.g. JPY has no
// decimal places).
const localeCurrency: Record<string, string> = {
  'en-US': 'USD',
  'en-GB': 'GBP',
  'de-DE': 'EUR',
  'fr-FR': 'EUR',
  'es-ES': 'EUR',
  'it-IT': 'EUR',
  'ja-JP': 'JPY',
  'zh-CN': 'CNY',
  'hi-IN': 'INR',
  'ar-EG': 'EGP',
  'ru-RU': 'RUB',
  'pt-BR': 'BRL',
}

// Lock \`locale\` to the enum dropdown; every other node
// keeps the standard type selector (\`true\` = all types,
// including the custom ones like BigInt/Symbol).
export const allowTypeSelection: TypeFilterFunction = (node) =>
  byKey('locale')(node) ? [localeEnum] : true

// Some definitions are configured by values in the data set
// itself (the "Image properties" and "Show Time in Date?"
// nodes), so the list is a function of the current data,
// rebuilt as it's edited.
export const customNodeDefinitions = (currentData: JsonData) => {
  const libraryData = currentData as CustomComponentLibraryData
  const locale = libraryData?.['Number Formatting']?.locale ?? 'en-US'
  const currency = localeCurrency[locale] ?? 'USD'
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
        // The \`unit\` defaults to 'auto', so the seconds
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
    // "Number Formatting": one NumberFormatter per field,
    // all sharing the \`locale\` picked above. It's
    // display-only, so editing any of them shows the raw
    // number (e.g. \`rounded\` is stored as 1.3333333).
    numberFormatterDefinition({
      condition: byKey('millions'),
      componentProps: { locale },
    }),
    numberFormatterDefinition({
      condition: byKey('currency'),
      componentProps: { locale, options: { style: 'currency', currency } },
    }),
    numberFormatterDefinition({
      condition: byKey('percent'),
      componentProps: {
        locale,
        options: { style: 'percent', maximumFractionDigits: 2 },
      },
    }),
    numberFormatterDefinition({
      condition: byKey('units'),
      componentProps: { locale, options: { style: 'unit', unit: 'kilometer' } },
    }),
    numberFormatterDefinition({
      condition: byKey('compact'),
      componentProps: { locale, options: { notation: 'compact' } },
    }),
    numberFormatterDefinition({
      condition: byKey('rounded'),
      componentProps: { locale, options: { maximumFractionDigits: 2 } },
    }),
    // The factory ANDs these conditions with the built-in
    // string guard, so a node switched to another type
    // (e.g. number) renders natively rather than as
    // markdown text
    markdownDefinition({ condition: byKey('Markdown') }),
    markdownDefinition({
      condition: byKey('Intro'),
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
        allowTypeSelection={allowTypeSelection}
        searchText={searchText}
      />
    </div>
  )
}
`;export{n as default};
