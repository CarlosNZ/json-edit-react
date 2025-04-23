import React from 'react'
import { useKeyboardListener, type CustomNodeProps } from '@json-edit-react'

export interface UndefinedProps {
  style?: React.CSSProperties
}

export const UndefinedCustomComponent: React.FC<CustomNodeProps<UndefinedProps>> = ({
  isEditing,
  setIsEditing,
  handleKeyboard,
  handleEdit,
  keyboardCommon,
  customNodeProps = {},
}) => {
  const listenForSubmit = (e: unknown) =>
    handleKeyboard(e as React.KeyboardEvent, {
      confirm: handleEdit,
      ...keyboardCommon,
    })

  useKeyboardListener(isEditing, listenForSubmit)

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className="jer-value-undefined"
      style={{ fontStyle: 'italic', color: '#9b9b9b', ...customNodeProps?.style }}
    >
      undefined
    </div>
  )
}
