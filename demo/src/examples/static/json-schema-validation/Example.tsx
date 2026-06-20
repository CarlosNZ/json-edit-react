import { useState } from 'react'
import {
  JsonEditor,
  standardDataTypes,
  type DefaultValueFunction,
  type JsonData,
  type NewKeyOptionsFunction,
  type TypeFilterFunction,
  type UpdateFunction,
} from '@json-edit-react'
import Ajv from 'ajv'
import schema from './schema.json'
import { SearchBox, useEditorDefaults, useToast } from '@example-resources'

// Full JSON Schema validation via a 3rd-party validator. A
// compiled Ajv validator runs inside `onUpdate`: a
// non-compliant edit is rejected (the inline "JSON Schema
// error") while the detailed Ajv messages go to a toast. The
// schema also shapes the editor — `category` is locked to its
// enum, and adding keys to the root or `address` offers only
// the schema's own properties, each seeded with a default.
//
// Try: clear `name` (it's required), set `age` below 0
// (minimum: 0), or add a key the schema doesn't allow
// (additionalProperties: false).

// Compile once, outside the component.
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

// The schema's `category` enum, surfaced as a type option.
export const allowTypeSelection: TypeFilterFunction = ({ key }) => {
  if (key === 'category')
    return [
      ...standardDataTypes,
      {
        enum: 'Category',
        values: ['human', 'enhanced human', 'extra-terrestrial'],
        matchPriority: 1,
      },
    ]
  return true
}

// Restrict new keys to the schema's known properties, so the
// "+" control offers a dropdown instead of free text.
export const newKeyOptions: NewKeyOptionsFunction = ({ key }) => {
  if (key === 'data') return ['name', 'age', 'address', 'hobbies', 'category', 'isAlive']
  if (key === 'address') return ['street', 'suburb', 'city', 'state', 'postalCode', 'country']
}

// Seed each newly-added key with a schema-valid starting value.
export const defaultValue: DefaultValueFunction = ({ key }, newKey) => {
  if (key === 'hobbies') return 'Enter a hobby'
  if (newKey === 'country') return 'United States'
  if (newKey === 'suburb') return 'Enter a suburb'
  if (newKey === 'category') return 'human'
  if (newKey === 'isAlive') return true
  if (newKey === 'hobbies') return ['avenging', '...add more']
  if (newKey === 'address')
    return { street: 'Enter street address', city: 'City', state: 'CA', postalCode: '12345' }
}

export const initialData = {
  name: 'Tony Stark',
  age: 42,
  address: {
    street: '10880 Malibu Point',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90265',
  },
  hobbies: ['partying', 'building stuff', 'avenging'],
  category: 'human',
}

export default function JsonSchemaValidation() {
  const toast = useToast()
  const [data, setData] = useState<JsonData>(initialData)
  const [searchText, setSearchText] = useState('')

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

  return (
    <div style={{ position: 'relative' }}>
      <SearchBox value={searchText} onChange={setSearchText} placeholder="Search" />
      <JsonEditor
        data={data}
        setData={setData}
        {...useEditorDefaults()}
        rootName="data"
        collapse={2}
        onUpdate={onUpdate}
        allowTypeSelection={allowTypeSelection}
        newKeyOptions={newKeyOptions}
        defaultValue={defaultValue}
        searchText={searchText}
      />
    </div>
  )
}
