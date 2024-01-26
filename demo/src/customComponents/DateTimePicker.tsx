import React from 'react'
import DatePicker from 'react-datepicker'
import { CustomNodeProps, CustomNodeDefinition } from '../JsonEditImport'

import 'react-datepicker/dist/react-datepicker.css'
import './style.css'

export const DateTimePicker: React.FC<CustomNodeProps> = ({
  data,
  setValue,
  isEditing,
  setIsEditing,
  styles,
}) => {
  return isEditing ? (
    <DatePicker
      selected={new Date(data as string)}
      showTimeSelect
      dateFormat="MMMM d, yyyy h:mm aa"
      onChange={(date: Date) => setValue(date.toISOString())}
      open={true}
    />
  ) : (
    <div
      onDoubleClick={() => setIsEditing(true)}
      onClick={(e) => {
        if (e.getModifierState('Control') || e.getModifierState('Meta')) setIsEditing(true)
      }}
      className="jer-value-string"
      style={styles.string}
    >
      "{new Date(data as string).toISOString()}"
    </div>
  )
}

export const dateNodeDefinition: CustomNodeDefinition = {
  condition: ({ value }) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d\.]*Z?$/.test(value),
  element: DateTimePicker,
  showOnView: true,
  showOnEdit: true,
  name: 'Date',
  showInTypesSelector: true,
  defaultValue: new Date().toISOString(),
}
