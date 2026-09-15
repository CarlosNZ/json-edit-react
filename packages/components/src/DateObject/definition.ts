import { DateObjectCustomComponent, DateObjectProps } from './component'
import { type CustomNodeDefinition } from 'json-edit-react'
import { createDefinitionFactory } from '../_common/createDefinitionFactory'

// The condition doubles as the guard: consumer `condition` overrides are
// targeting, ANDed with this by the factory; replacing it requires the
// explicit `guard` override.
const DateObjectDefinition: CustomNodeDefinition<DateObjectProps> = {
  condition: (nodeData) => nodeData.value instanceof Date,
  component: DateObjectCustomComponent,
  showEditTools: true,
  showOnEdit: true,
  name: 'Date Object', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  // A function, so each new node gets the current date rather than one fixed
  // at module load, which also keeps the definition tree-shakeable.
  defaultValue: () => new Date(),
  renderCollectionAsValue: true,
  toStandardType: (value) => (value instanceof Date ? value.toISOString() : String(value)),
  fromStandardType: (value, _, componentProps) => {
    if (value instanceof Date) return value
    const date = new Date(String(value))
    if (isNaN(date.getTime()))
      // Rejects the confirm; at switch time core seeds `defaultValue`
      throw new Error(componentProps?.invalidDateError ?? 'Invalid Date')
    return date
  },
  // IMPORTANT: this component can't be combined with an ISO-string matcher
  // such as DatePicker. `JSON.stringify` serialises Date objects to ISO strings
  // automatically, so the two are indistinguishable when re-parsed back to an
  // object. A `stringifyReplacer` wouldn't help either, since that
  // auto-serialisation happens before the replacer is called.
  parseReviver: (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)
      ? new Date(value)
      : value,
}

export const dateObjectDefinition = createDefinitionFactory(DateObjectDefinition)
