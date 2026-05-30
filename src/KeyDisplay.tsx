/**
 * Component to display the "Property" value for both Collection and Value nodes
 */

import React from 'react'
import { useEditing } from './contexts'
import {
  type KeyboardControlsFull,
  type CollectionKey,
  type NodeData,
  type ThemeableElement,
  type ValueData,
} from './types'
import { type CustomNodeData } from './CustomNode'

interface KeyDisplayProps {
  canEditKey: boolean
  isEditingKey: boolean
  pathString: string
  path: CollectionKey[]
  name: string | number
  arrayIndexFromOne: boolean
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
  nodeData?: NodeData
  customNodeData?: CustomNodeData
  getStyles?: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
}

export const KeyDisplay: React.FC<KeyDisplayProps> = ({
  isEditingKey,
  canEditKey,
  pathString,
  path,
  name,
  arrayIndexFromOne,
  handleKeyboard,
  handleEditKey,
  handleCancel,
  handleClick,
  keyValueArray,
  styles,
  getNextOrPrevious,
  emptyStringKey,
  nodeData,
  customNodeData,
  getStyles,
}) => {
  const { setCurrentlyEditingElement } = useEditing()

  const displayKey = typeof name === 'number' ? String(name + (arrayIndexFromOne ? 1 : 0)) : name

  if (!isEditingKey) {
    // Theme styles plus the same layout derivation the default key span
    // uses, so custom-key renderers that spread `...styles` get
    // default-consistent column alignment and wrap behaviour. Authors
    // can override individual values.
    const derivedKeyStyles: React.CSSProperties = {
      ...styles,
      minWidth: `${Math.min(displayKey.length + 1, 5)}ch`,
      flexShrink: displayKey.length > 10 ? 1 : 0,
    }
    if (customNodeData?.CustomKey && nodeData && getStyles) {
      const { CustomKey, customNodeProps } = customNodeData
      return (
        <CustomKey
          nodeData={nodeData}
          name={emptyStringKey ?? displayKey}
          path={path}
          canEditKey={canEditKey}
          handleEditKey={(newKey) => {
            if (canEditKey) handleEditKey(newKey)
          }}
          setIsEditingKey={() => {
            if (canEditKey) setCurrentlyEditingElement(path, 'key')
          }}
          handleClick={handleClick}
          styles={derivedKeyStyles}
          customNodeProps={customNodeProps}
          getStyles={getStyles}
        />
      )
    }
    return (
      <span
        className="jer-key-text"
        style={derivedKeyStyles}
        onDoubleClick={() => canEditKey && setCurrentlyEditingElement(path, 'key')}
        onClick={handleClick}
      >
        {emptyStringKey ? <span className="jer-empty-string">{emptyStringKey}</span> : displayKey}
        {displayKey !== '' || emptyStringKey ? <span className="jer-key-colon">:</span> : null}
      </span>
    )
  }

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
