/**
 * A date/time picker which shows when an ISO date/time string is present in
 * the JSON data, presenting a calendar interface rather than requiring the
 * user to edit the ISO string directly.
 */

import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'
import { DatePickerCustomProps, DateTimePicker } from './component'

const ISO_STRING_REGEX = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

// The condition doubles as the guard: it keeps the date parser away from
// anything but ISO strings. Consumer `condition` overrides are targeting,
// ANDed with this by the factory; a non-ISO date format needs the explicit
// `guard` override (realistically along with `fromStandardType` and
// `defaultValue`).
const DatePickerDefinition: CustomNodeDefinition<DatePickerCustomProps> = {
  condition: ({ value }) => typeof value === 'string' && ISO_STRING_REGEX.test(value),
  component: DateTimePicker,
  showOnView: true,
  showOnEdit: true,
  name: 'Date (ISO)', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  // when instantiated, default to the current date/time
  defaultValue: new Date().toISOString(),
  // ISO strings pass through unchanged (a confirm's buffer is always one, and
  // normalizing would alter date-only values); other parseable values convert,
  // and unparseable input falls back to the current date/time — the picker
  // can't display arbitrary text
  fromStandardType: (value) => {
    if (typeof value === 'string' && ISO_STRING_REGEX.test(value)) return value
    const date = new Date(String(value))
    return (isNaN(date.getTime()) ? new Date() : date).toISOString()
  },
  componentProps: { showTime: true },
}

export const datePickerDefinition = createDefinitionFactory(DatePickerDefinition)
