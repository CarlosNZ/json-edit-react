import React from 'react'
import DatePicker from 'react-datepicker'
import { Button } from '@chakra-ui/react'
import { CustomNodeProps, CustomNodeDefinition } from '../JsonEditImport'

// Styles
import 'react-datepicker/dist/react-datepicker.css'
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

  console.log('styles', styles)

  return isEditing ? (
    <DatePicker
      selected={isNaN(date as any) ? null : date}
      showTimeSelect={showTimeSelect}
      dateFormat={dateFormat}
      onChange={(date: Date) => setValue(date.toISOString())}
      open={true}
      onKeyDown={handleKeyPress}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <Button
          color={styles.property.color}
          backgroundColor={styles.input.color}
          onClick={handleEdit}
        >
          OK
        </Button>
        <Button onClick={handleCancel}>Cancel</Button>
      </div>
    </DatePicker>
  ) : (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-string"
      style={styles.string}
    >
      "{new Date(value as string).toLocaleDateString()}"
    </div>
  )
}

export const dateNodeDefinition: CustomNodeDefinition = {
  condition: ({ value }) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d\.]*(Z?|[\+-][\d:]+)$/.test(value),
  element: DateTimePicker,
  showOnView: false,
  showOnEdit: true,
  name: 'Date',
  showInTypesSelector: true,
  defaultValue: new Date().toISOString(),
}
