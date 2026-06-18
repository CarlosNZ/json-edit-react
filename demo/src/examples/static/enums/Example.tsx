import { useState } from 'react'
import {
  JsonEditor,
  standardDataTypes,
  type EnumDefinition,
  type TypeFilterFunction,
} from '@json-edit-react'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Enums restrict a value to a fixed list, shown as a
// dropdown when you edit. Open the "Type" selector on a
// field to switch type and see its enum in action:
//
//   - `priority` is LOCKED to the Priority enum — it's the
//     only type offered, so the value must stay Low/Med/High
//   - `day` and `colour` offer their enum ALONGSIDE every
//     standard type, via the `standardDataTypes` spread
const initialData = {
  title: 'Design review',
  day: 'Wednesday',
  priority: 'High',
  colour: 'Blue',
  allDay: false,
}

// An enum is just an object in the types list. `matchPriority`
// lets an existing string ("High") be recognised AS this enum
// type on load — essential when a node is locked to one enum,
// or you couldn't switch a plain string to it.
const dayEnum: EnumDefinition = {
  enum: 'Weekday',
  values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  matchPriority: 1,
}

const colourEnum: EnumDefinition = {
  enum: 'Colour',
  values: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'],
  matchPriority: 1,
}

const priorityEnum: EnumDefinition = {
  enum: 'Priority',
  values: ['Low', 'Medium', 'High'],
  matchPriority: 1,
}

const allowTypeSelection: TypeFilterFunction = ({ key }) => {
  // A single enum returned = locked to that type (no selector).
  if (key === 'priority') return [priorityEnum]
  // The enum offered next to all the standard types.
  if (key === 'day') return [...standardDataTypes, dayEnum]
  if (key === 'colour') return [...standardDataTypes, colourEnum]
  // Everything else: the standard types only.
  return [...standardDataTypes]
}

export default function Enums() {
  const [data, setData] = useState(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="event"
      allowTypeSelection={allowTypeSelection}
    />
  )
}
