/**
 * Component to display the "Property" value for both Collection and Value nodes
 */

import React from 'react'
import { useTreeState } from './contexts'
import { type KeyboardControlsFull, type CollectionKey, type ValueData } from './types'

interface KeyDisplayProps {
  canEditKey: boolean
  isEditingKey: boolean
  pathString: string
  path: CollectionKey[]
  name: string | number
  arrayCountFromOne: boolean
  handleKeyboard: (
    e: React.KeyboardEvent,
    eventMap: Partial<Record<keyof KeyboardControlsFull, () => void>>
  ) => void
  handleEditKey: (newKey: string) => void
  handleCancel: () => void
  handleClick?: (e: React.MouseEvent) => void
  keyValueArray?: Array<[string | number, ValueData]>
  styles: React.CSSProperties
  getNextOrPrevious: (type: 'next' | 'prev') => CollectionKey[] | null
  emptyStringKey: string | null
}

export const KeyDisplay: React.FC<KeyDisplayProps> = ({
  isEditingKey,
  canEditKey,
  pathString,
  path,
  name,
  arrayCountFromOne,
  handleKeyboard,
  handleEditKey,
  handleCancel,
  handleClick,
  keyValueArray,
  styles,
  getNextOrPrevious,
  emptyStringKey,
}) => {
  const { setCurrentlyEditingElement } = useTreeState()

  const displayKey = typeof name === 'number' ? String(name + (arrayCountFromOne ? 1 : 0)) : name

  if (!isEditingKey)
    return (
      <span
        className="jer-key-text"
        style={{
          ...styles,
          minWidth: `${Math.min(displayKey.length + 1, 5)}ch`,
          flexShrink: displayKey.length > 10 ? 1 : 0,
        }}
        onDoubleClick={() => canEditKey && setCurrentlyEditingElement(path, 'key')}
        onClick={handleClick}
      >
        {emptyStringKey ? <span className="jer-empty-string">{emptyStringKey}</span> : displayKey}
        {displayKey !== '' || emptyStringKey ? <span className="jer-key-colon">:</span> : null}
      </span>
    )

  return (
    <input
      className="jer-input-text jer-key-edit"
      type="text"
      name={pathString}
      defaultValue={displayKey}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={(e: React.KeyboardEvent) =>
        handleKeyboard(e, {
          stringConfirm: () => handleEditKey((e.target as HTMLInputElement).value),
          cancel: handleCancel,
          tabForward: () => {
            handleEditKey((e.target as HTMLInputElement).value)
            if (keyValueArray) {
              const firstChildKey = keyValueArray?.[0][0]
              setCurrentlyEditingElement(
                firstChildKey ? [...path, firstChildKey] : getNextOrPrevious('next')
              )
            } else setCurrentlyEditingElement(path)
          },
          tabBack: () => {
            handleEditKey((e.target as HTMLInputElement).value)
            setCurrentlyEditingElement(getNextOrPrevious('prev'))
          },
        })
      }
      style={{ width: `${displayKey.length / 1.5 + 0.5}em` }}
    />
  )
}
