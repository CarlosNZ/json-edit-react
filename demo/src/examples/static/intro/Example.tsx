import { useState } from 'react'
import {
  JsonEditor,
  standardDataTypes,
  type JsonData,
  type TypeFilterFunction,
} from '@json-edit-react'
import { datePickerDefinition } from '@json-edit-react/components'
import { ReactDatePicker } from '@json-edit-react/components/widgets'
import { useEditorDefaults } from '@example-resources'

// A friendly playground for the editor — poke at every kind
// of value and see how editing works. Click the "edit" icon
// (or double-click a value) to change it, switch a value's
// type, add new entries, or drag nodes around.
//
// The `enum` field shows off type selection: open its "Type"
// selector and you'll find the standard types plus a `Date
// (ISO)` option and a custom enum locked to three choices.

export const initialData = {
  string: 'Welcome to the Editor 😀',
  number: 99,
  boolean: true,
  nothing: null,
  enum: 'Option B 🍌',
  Usage: [
    'Edit a value by clicking the "edit" icon, or double-clicking the value.',
    'You can change the type of any value',
    'You can add new values to objects or arrays',
    'You can edit individual values, or even a whole object node at once (as JSON text)',
    'You can also drag and drop!',
    {
      nested: 'An object inside an array',
      basic: false,
      value: 6.66,
    },
  ],
  'Keyboard interaction': {
    '"Enter" to submit change': '(or Ctrl/Cmd-Enter when editing whole JSON nodes)',
    '"Escape" to cancel': '👍',
    'To start a new line': 'Shift/Ctrl/Cmd-Enter (or just "Enter" when editing JSON nodes)',
    'When copying to clipboard': 'Hold down "Ctrl/Cmd" to copy path instead of data',
    'When opening/closing a node': 'Hold down "Alt/Option" to open/close ALL child nodes at once',
    'Tab navigation': 'Use "Tab" and "Shift-Tab" to quickly move between values.',
  },
}

// A date-picker editor for any ISO date string, wired with
// the third-party `ReactDatePicker` widget.
export const customNodeDefinitions = [
  datePickerDefinition({ componentProps: { DatePicker: ReactDatePicker } }),
]

// On the `enum` field, offer an ISO date plus a custom enum
// alongside the standard types; everything else is unrestricted.
export const allowTypeSelection: TypeFilterFunction = ({ key }) => {
  if (key === 'enum')
    return [
      ...standardDataTypes,
      'Date (ISO)',
      {
        enum: 'Custom Type',
        values: ['Option A 🍏', 'Option B 🍌', 'Option C 🍒'],
        matchPriority: 1,
      },
    ]
  return true
}

export default function Intro() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="data"
      collapse={2}
      customNodeDefinitions={customNodeDefinitions}
      allowTypeSelection={allowTypeSelection}
    />
  )
}
