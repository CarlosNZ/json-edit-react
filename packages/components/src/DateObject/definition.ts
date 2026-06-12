import { DateObjectCustomComponent, DateObjectProps } from './component'
import { type CustomNodeDefinition } from 'json-edit-react'

export const DateObjectDefinition: CustomNodeDefinition<DateObjectProps> = {
  condition: (nodeData) => nodeData.value instanceof Date,
  component: DateObjectCustomComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'Date Object', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  defaultValue: new Date(),
  renderCollectionAsValue: true,
  toStandardType: (value) => (value instanceof Date ? value.toISOString() : String(value)),
  fromStandardType: (value, _, componentProps) => {
    if (value instanceof Date) return value
    const date = new Date(String(value))
    if (isNaN(date.getTime()))
      // Rejects the confirm; at switch time core seeds the raw text instead
      throw new Error(componentProps?.invalidDateError ?? 'Invalid Date')
    return date
  },
  // IMPORTANT: This component can't be used in conjunction with a ISO string
  // matcher (such as the DatePicker in this repo) -- because JSON.stringify
  // automatically serializes Date objects to ISO Strings, there's no way to
  // distinguish between them when re-parsing back to object.
  // There's also no point in providing a stringifyReplacer, as the
  // auto-serialisation gets done before passing to the string replacer function
  parseReviver: (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)
      ? new Date(value)
      : value,
}
