import React from 'react'
import DatePicker from 'react-datepicker'
import { Button } from '@chakra-ui/react'
import { CustomNodeProps, CustomNodeDefinition } from '../JsonEditImport'

// Styles
import 'react-datepicker/dist/react-datepicker.css'
// For better matching with Chakra-UI
import './style.css'

export const DateTimePicker: React.FC<CustomNodeProps> = ({
  value,
  setValue,
  handleEdit,
  handleCancel,
  handleKeyPress,
  isEditing,
  setIsEditing,
  styles,
  customProps,
}) => {
  const { dateFormat = 'MMM d, yyyy h:mm aa', showTimeSelect = true } = customProps ?? {}

  const date = new Date(value as string)

  return isEditing ? (
    // Picker only shows up when "editing". Due to the `showOnView: false` in
    // the definition below, this component will not show at all when viewing
    // (and so will show raw ISO strings). However, we've defined an alternative
    // here too, when showOnView == true, in which case the date/time string is
    // shown as a localised date/time.
    <DatePicker
      // Check to prevent invalid date (from previous data value) crashing the
      // component
      selected={isNaN(date as any) ? null : date}
      showTimeSelect={showTimeSelect}
      dateFormat={dateFormat}
      onChange={(date: Date) => setValue(date.toISOString())}
      open={true}
      onKeyDown={handleKeyPress}
    >
      <div style={{ display: 'flex', gap: 20 }}>
        {/* These buttons are not really necessary -- you can either use the
        standard Ok/Cancel icons, or keyboard Enter/Esc, but shown for demo
        purposes */}
        <Button
          color={styles.container.backgroundColor}
          backgroundColor={styles.iconOk.color}
          onClick={handleEdit}
        >
          OK
        </Button>
        <Button
          color={styles.container.backgroundColor}
          backgroundColor={styles.iconCancel.color}
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>
    </DatePicker>
  ) : (
    <div
      // Double-click behaviour same as standard elements
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-string"
      style={styles.string}
    >
      "{new Date(value as string).toLocaleDateString()}"
    </div>
  )
}

// Definition for custom node behaviour
export const dateNodeDefinition: CustomNodeDefinition = {
  // Condition is a regex to match ISO strings
  condition: ({ value }) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d\.]*(Z?|[\+-][\d:]+)$/.test(value),
  element: DateTimePicker, // the component defined above
  showOnView: false,
  showOnEdit: true,
  name: 'Date', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: new Date().toISOString(), // when instantiated, default to the current date/time
}
