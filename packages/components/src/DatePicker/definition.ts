/**
 * A date/time picker, shown wherever an ISO date/time string appears in the
 * data, so the user edits a calendar rather than the ISO string itself.
 */

import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { DatePickerCustomProps, DateTimePicker } from './component'

const ISO_STRING_REGEX =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

// The condition doubles as the guard, keeping the date parser away from
// anything but ISO strings. A consumer `condition` override is targeting, ANDed
// with this by the factory; a non-ISO date format needs the explicit `guard`
// override, realistically alongside `fromStandardType` and `defaultValue`.
const DatePickerDefinition: CustomNodeDefinition<DatePickerCustomProps> = {
  condition: ({ value }) => typeof value === 'string' && ISO_STRING_REGEX.test(value),
  component: DateTimePicker,
  showOnView: true,
  showOnEdit: true,
  name: 'Date (ISO)', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  // A function, so each new node defaults to the current date/time rather than
  // one fixed at module load, which also keeps the definition tree-shakeable.
  defaultValue: () => new Date().toISOString(),
  // ISO strings pass through unchanged: a confirm's buffer is always one, and
  // normalising would alter date-only values. Other parseable values convert,
  // and unparseable input falls back to the current date/time, the picker being
  // unable to display arbitrary text
  fromStandardType: (value) => {
    if (typeof value === 'string' && ISO_STRING_REGEX.test(value)) return value
    const date = new Date(String(value))
    return (isNaN(date.getTime()) ? new Date() : date).toISOString()
  },
  componentProps: { showTime: true },
}

export const datePickerDefinition = createDefinitionFactory(DatePickerDefinition)
