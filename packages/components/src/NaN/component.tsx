import React from 'react'
import { useKeyboardListener, type CustomComponentProps } from 'json-edit-react'

export interface NaNProps {
  style?: React.CSSProperties
}

export const NotANumberComponent: React.FC<CustomComponentProps<NaNProps>> = ({
  isEditing,
  setIsEditing,
  handleKeyboard,
  handleEdit,
  keyboardCommon,
  componentProps = {},
}) => {
  const listenForSubmit = (e: unknown) =>
    handleKeyboard(e as React.KeyboardEvent, {
      confirm: handleEdit,
      ...keyboardCommon,
    })

  useKeyboardListener(isEditing, listenForSubmit)

  return (
    <div
      style={{ color: 'rgb(220, 50, 47)', ...componentProps?.style }}
      onDoubleClick={() => setIsEditing(true)}
    >
      NaN
    </div>
  )
}
