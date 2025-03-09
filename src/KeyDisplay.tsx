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
  name: string
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
}

export const KeyDisplay: React.FC<KeyDisplayProps> = ({
  isEditingKey,
  canEditKey,
  pathString,
  path,
  name,
  handleKeyboard,
  handleEditKey,
  handleCancel,
  handleClick,
  keyValueArray,
  styles,
  getNextOrPrevious,
}) => {
  const { setCurrentlyEditingElement } = useTreeState()

  if (!isEditingKey)
    return (
      <span
        className="jer-key-text"
        style={{
          ...styles,
          minWidth: `${Math.min(String(name).length + 1, 5)}ch`,
          flexShrink: name.length > 10 ? 1 : 0,
        }}
        onDoubleClick={() => canEditKey && setCurrentlyEditingElement(path, 'key')}
        onClick={handleClick}
      >
        {name === '' ? (
          <span className={path.length > 0 ? 'jer-empty-string' : undefined}>
            {/* display "<empty string>" using pseudo class CSS */}
          </span>
        ) : (
          `${name}`
        )}
        <span className="jer-key-colon">:</span>
      </span>
    )

  return (
    <input
      className="jer-input-text jer-key-edit"
      type="text"
      name={pathString}
      defaultValue={name}
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
      style={{ width: `${String(name).length / 1.5 + 0.5}em` }}
    />
  )
}
