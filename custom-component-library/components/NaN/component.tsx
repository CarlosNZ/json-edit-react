import React from 'react'
import { useKeyboardListener, type CustomNodeProps } from '@json-edit-react'

export interface NaNProps {
  style?: React.CSSProperties
}

export const NotANumberComponent: React.FC<CustomNodeProps<NaNProps>> = ({
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
      style={{ color: 'rgb(220, 50, 47)', ...customNodeProps?.style }}
      onDoubleClick={() => setIsEditing(true)}
    >
      NaN
    </div>
  )
}
