import { useState } from 'react'
import {
  JsonEditor,
  type CustomNodeDefinition,
  type CustomTextDefinitions,
  type FilterFunction,
  type JsonData,
  type OnErrorFunction,
  type SearchFilterFunction,
  type ThemeStyles,
  type UpdateFunction,
} from '@json-edit-react'
import { datePickerDefinition } from '@json-edit-react/components'
import { matchRecord, root } from '@json-edit-react/utils/filters'
import Ajv from 'ajv'
import schema from './schema.json'
import { initialData } from './data'
import { useExampleTheme } from '../../kit/exampleProps'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Custom Nodes let you supply your own components to present
// specialised data in a unique way. Compare the raw JSON (edit
// the data root) with what's rendered here: a `logo` becomes an
// image, the `publisher` becomes a badge, and `dateOfBirth`
// uses a date picker. Dynamic Custom Text drives the property
// counts, and a conditional Theme function makes each `name`
// bold and a little larger.
//
// A custom `onError` surfaces a toast (rather than the inline
// error) when an edit produces invalid JSON or violates the
// JSON Schema. Try editing the data root and deleting a
// required field, or removing all items.

export { initialData }

// Compile the JSON Schema validator once, outside the
// component.
const ajv = new Ajv()
const validateSchema = ajv.compile(schema)

// Validate `data`, returning a printable error message (one
// line per Ajv error) or `null` when it's compliant.
export const validate = (data: unknown): string | null => {
  if (validateSchema(data)) return null
  return (
    validateSchema.errors
      ?.map((e) => `${e.instancePath}${e.instancePath ? ': ' : ''}${e.message}`)
      .join('\n') ?? 'Invalid data'
  )
}

// Edits are only allowed on the data root, where you can paste
// raw JSON; the structured nodes themselves are read-only.
export const allowEdit: FilterFunction = root
export const allowAdd = false
export const allowDelete = false

// Search matches against each record's `name` field.
export const searchFilter: SearchFilterFunction = matchRecord({ fields: ['name'] })

// The `<Record<string, any>>` lets the specialised date-picker
// definition sit in the same array as the inline ones.
// eslint-disable-next-line -- any is correct here
export const customNodeDefinitions: CustomNodeDefinition<Record<string, any>>[] = [
  // Render a `logo` URL as an image with a truncated caption.
  {
    condition: ({ key, value }) =>
      key === 'logo' &&
      typeof value === 'string' &&
      value.startsWith('http') &&
      value.endsWith('.png'),
    component: ({ value }) => {
      const truncate = (string: string, length = 50) =>
        string.length < length ? string : `${string.slice(0, length - 2).trim()}...`
      return (
        <div style={{ maxWidth: 250 }}>
          <a href={value as string} target="_blank" rel="noreferrer">
            <img src={value as string} style={{ maxHeight: 75 }} alt="logo" />
            <p style={{ fontSize: '0.75em' }}>{truncate(value as string)}</p>{' '}
          </a>
        </div>
      )
    },
  },
  // Render the `publisher` as a styled badge, hiding the key.
  {
    condition: ({ key }) => key === 'publisher',
    component: ({ value }) => {
      return (
        <p
          style={{
            padding: '0.5em 1em',
            border: '2px solid red',
            borderRadius: '1.5em',
            backgroundColor: 'yellow',
            marginTop: '0.5em',
            marginRight: '1em',
            fontFamily: 'sans-serif',
            color: 'black',
          }}
        >
          Presented by: <strong>{String(value)}</strong>
        </p>
      )
    },
    showKey: false,
  },
  // A date picker for ISO date strings (date only, no time).
  datePickerDefinition({
    componentProps: {
      showTime: false,
    },
  }),
]

// Dynamic Custom Text: drive the property-count labels from the
// data being summarised.
export const customTextDefinitions: CustomTextDefinitions = {
  ITEM_SINGLE: ({ key, value }) => {
    if (value instanceof Object && 'name' in value)
      // @ts-expect-error TO-DO
      return `${value.name} (${value?.publisher ?? ''})`
    if (key === 'aliases' && Array.isArray(value)) return `One name`
    if (key === 'portrayedBy' && Array.isArray(value)) return `One actor`
    return null
  },
  ITEMS_MULTIPLE: ({ key, value, size }) => {
    if (value instanceof Object && 'name' in value)
      // @ts-expect-error TO-DO
      return `${value.name} (${value?.publisher ?? ''})`
    if (key === 'aliases' && Array.isArray(value)) return `${size} names`
    if (key === 'portrayedBy' && Array.isArray(value)) return `${size} actors`
    return null
  },
}

// A conditional Theme function: render each `name` string bold
// and slightly larger.
export const styles: ThemeStyles = {
  string: ({ key }) => (key === 'name' ? { fontWeight: 'bold', fontSize: '120%' } : null),
}

type Toast = (options: {
  title: string
  description?: string
  status: 'error'
  duration?: number
  isClosable?: boolean
}) => void

export default function CustomNodes({ toast }: { toast: Toast }) {
  const [data, setData] = useState<JsonData>(initialData)
  const theme = useExampleTheme()

  const onUpdate: UpdateFunction = ({ newData }) => {
    const error = validate(newData)
    if (error === null) return // compliant → accept the change
    toast({
      title: 'Not compliant with JSON Schema',
      description: error,
      status: 'error',
      duration: 5000,
      isClosable: true,
    })
    return { error: 'JSON Schema error' }
  }

  const onError: OnErrorFunction = (errorData) =>
    toast({
      title: 'Error',
      description: errorData.error.message,
      status: 'error',
      duration: 5000,
      isClosable: true,
    })

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="Superheroes"
      collapse={2}
      onUpdate={onUpdate}
      onError={onError}
      showErrorMessages={false}
      allowEdit={allowEdit}
      allowAdd={allowAdd}
      allowDelete={allowDelete}
      searchFilter={searchFilter}
      customNodeDefinitions={customNodeDefinitions}
      customText={customTextDefinitions}
      // The conditional `styles` (above) merge with the
      // selected theme and override it where they overlap.
      theme={[theme, styles]}
    />
  )
}
