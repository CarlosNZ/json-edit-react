/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * A date/time picker which can be configure to show (using the
 * CustomNodeDefinitions at the bottom of this file) when an ISO date/time
 * string is present in the JSON data, and present a Date picker interface
 * rather than requiring the user to edit the ISO string directly.
 */

import { CustomNodeDefinition } from '../_imports'
import { DatePickerCustomProps, DateTimePicker } from './component'

// Styles
import 'react-datepicker/dist/react-datepicker.css'
// For better matching with Chakra-UI
import './style.css'

// Definition for custom node behaviour
export const DatePickerDefinition: CustomNodeDefinition<DatePickerCustomProps> = {
  // Condition is a regex to match ISO strings
  condition: ({ value }) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d.]*(Z?|[+-][\d:]+)$/.test(value),
  element: DateTimePicker,
  showOnView: true,
  showOnEdit: true,
  name: 'Date (ISO)', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: new Date().toISOString(), // when instantiated, default to the current date/time
  customNodeProps: { showTime: true },
}
