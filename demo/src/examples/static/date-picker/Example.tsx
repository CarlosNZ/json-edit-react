import { useState } from 'react'
import { JsonEditor, type JsonData } from '@json-edit-react'
import { datePickerDefinition } from '@json-edit-react/components'
import { ReactDatePicker } from '@json-edit-react/components/widgets'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// The pre-built `DatePicker` from `@json-edit-react/components`
// swaps a calendar widget in for any ISO date/time string. Its
// built-in `condition` doubles as the guard — it only matches
// ISO strings — so `name` here stays an ordinary text field.
//
// The same component is registered three times, each scoped to
// one field by its `condition` (condition-as-router) and given
// different `componentProps`:
//
//   - startDate → showTime: false, a date-only calendar
//   - checkIn   → defaults to a date + time picker
//   - rsvpBy    → a custom formatter for the read-only display
//
// `componentProps` is set per-definition, so separate
// definitions are how you send different props to
// different nodes. The picker UI is the swappable
// `ReactDatePicker` widget, passed in via
// `componentProps.DatePicker`.

const initialData = {
  name: 'Team offsite',
  startDate: '2025-09-15',
  checkIn: '2025-09-15T14:00:00',
  rsvpBy: '2025-08-29T17:00:00Z',
}

// One definition per date field. Each `condition` is ANDed with
// the component's built-in ISO guard by the factory, so it only
// narrows WHERE the picker applies. (All three inherit the same
// "Date (ISO)" type-selector entry, so type selection is turned
// off below to avoid three identical options.)
const customNodeDefinitions = [
  datePickerDefinition({
    condition: ({ key }) => key === 'startDate',
    componentProps: { DatePicker: ReactDatePicker, showTime: false },
  }),
  datePickerDefinition({
    condition: ({ key }) => key === 'checkIn',
    componentProps: { DatePicker: ReactDatePicker },
  }),
  datePickerDefinition({
    condition: ({ key }) => key === 'rsvpBy',
    componentProps: {
      DatePicker: ReactDatePicker,
      formatter: (date) =>
        date.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
    },
  }),
]

export default function DatePickerExample() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="event"
      customNodeDefinitions={customNodeDefinitions}
      allowTypeSelection={false}
      allowDelete={false}
    />
  )
}
