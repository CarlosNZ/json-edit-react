import { useState } from 'react'
import {
  JsonEditor,
  type CustomComponentProps,
  type CustomNodeDefinition,
  type EnumDefinition,
  type TypeFilterFunction,
} from '@json-edit-react'
import { useEditorDefaults } from '@example-resources'

// A task card where each field restricts which TYPES it can
// become, via an `allowTypeSelection` filter function. Open
// the "Type" selector while editing a value to see the
// offered types (or none, when the type is locked):
//
//   - `status` is locked to a Status ENUM (To do / In
//     progress / Done / Blocked)
//   - `done` stays a boolean — returning `false` removes the
//     selector entirely
//   - any string can be plain text or the custom "Colour"
//     type (a swatch)
//   - numbers offer the scalar types only — never null or a
//     nested collection
//
// `accentColour` starts as a hex string, so the Colour
// custom node already renders it as a swatch; switch any
// other string to "Colour" to get one too.
const initialData = {
  title: 'Ship the v2 docs',
  status: 'In progress',
  priority: 2,
  done: false,
  accentColour: '#4c9aff',
}

// An Enum restricts a value to a fixed list. `matchPriority`
// lets an existing string ("In progress") be recognised as
// this type when the data first loads.
const statusEnum: EnumDefinition = {
  enum: 'Status',
  values: ['To do', 'In progress', 'Done', 'Blocked'],
  matchPriority: 1,
}

// A tiny custom node: any hex-colour string renders as a
// swatch. It's view-only (no `showOnEdit`), so editing falls
// back to the normal text input.
const ColourSwatch = ({ value }: CustomComponentProps) => {
  const hex = typeof value === 'string' ? value : '#000000'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
      <span
        style={{
          width: '0.9em',
          height: '0.9em',
          borderRadius: 3,
          backgroundColor: hex,
          border: '1px solid rgba(0, 0, 0, 0.25)',
        }}
      />
      <code>{hex}</code>
    </span>
  )
}

const customNodeDefinitions: CustomNodeDefinition[] = [
  {
    // Any 3- or 6-digit hex string is shown as a colour swatch.
    condition: ({ value }) =>
      typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value),
    component: ColourSwatch,
    name: 'Colour', // the label shown in the Type selector
    showInTypeSelector: true,
    // inserted when "Colour" is picked (must match `condition`)
    defaultValue: '#4c9aff',
  },
]

// Returns the types offered for each node — an array the
// selector lists, or `false` to lock the type entirely.
const allowTypeSelection: TypeFilterFunction = ({ key, value }) => {
  // locked to the Status enum
  if (key === 'status') return [statusEnum]
  // booleans stay boolean
  if (typeof value === 'boolean') return false
  // text, or a swatch
  if (typeof value === 'string') return ['string', 'Colour']
  // scalars only — never null/collections
  return ['string', 'number', 'boolean']
}

export default function TypeRestrictions() {
  const [data, setData] = useState(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="task"
      allowTypeSelection={allowTypeSelection}
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
