/**
 * An example Custom Component:
 * https://github.com/CarlosNZ/json-edit-react#custom-nodes
 *
 * A date/time picker which can be configure to show (using the
 * CustomNodeDefinitions at the bottom of this file) when an ISO date/time
 * string is present in the JSON data, and present a Date picker interface
 * rather than requiring the user to edit the ISO string directly.
 */

import React from 'react'
import DatePicker from 'react-datepicker'
import { Button } from './Button'
import { CustomNodeProps } from '@json-edit-react'

// Styles
import 'react-datepicker/dist/react-datepicker.css'
import './style.css'

export interface DatePickerCustomProps {
  dateFormat?: string
  dateTimeFormat?: string
  showTime?: boolean
}

export const DateTimePicker: React.FC<CustomNodeProps<DatePickerCustomProps>> = ({
  value,
  setValue,
  handleEdit,
  handleCancel,
  handleKeyPress,
  isEditing,
  setIsEditing,
  getStyles,
  nodeData,
  customNodeProps,
}) => {
  const {
    dateFormat = 'MMM d, yyyy',
    dateTimeFormat = 'MMM d, yyyy h:mm aa',
    showTime = true,
  } = customNodeProps ?? {}

  const date = new Date(value as string)

  const textColour = getStyles('container', nodeData).backgroundColor
  const okColour = getStyles('iconOk', nodeData).color
  const cancelColour = getStyles('iconCancel', nodeData).color
  const stringStyle = getStyles('string', nodeData)

  return isEditing ? (
    // By default, DatePicker only shows up when "editing". Due to the
    // `showOnView: false` in the definition below, this component will not show
    // at all when viewing (and so will show raw ISO strings). However, we've
    // defined an alternative here too, when showOnView == true, in which case
    // the date/time string is shown as a localised date/time.
    <DatePicker
      // Check to prevent invalid date (from previous data value) crashing the
      // component

      // @ts-expect-error -- isNan can take any input
      selected={isNaN(date) ? null : date}
      showTimeSelect={showTime}
      dateFormat={showTime ? dateTimeFormat : dateFormat}
      onChange={(date: Date | null) => date && setValue(date.toISOString())}
      open={true}
      onKeyDown={handleKeyPress}
    >
      <div style={{ display: 'inline-flex', gap: 10 }}>
        {/* These buttons are not really necessary -- you can either use the
        standard Ok/Cancel icons, or keyboard Enter/Esc, but shown for demo
        purposes */}
        <Button textColor={textColour} color={okColour} onClick={handleEdit} text="OK" />
        <Button textColor={textColour} color={cancelColour} onClick={handleCancel} text="Cancel" />
      </div>
    </DatePicker>
  ) : (
    <div
      // Double-click behaviour same as standard elements
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-string"
      style={stringStyle}
    >
      "{showTime ? date.toLocaleString() : date.toLocaleDateString()}"
    </div>
  )
}
