/**
 * Component to display the "Property" value for both Collection and Value nodes
 */

import React from 'react'
import { useEditingStore } from './contexts'
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
  // Gated commit (fires `confirmRename` via `onEventIntercept`); used by the
  // explicit confirm (Enter) and the imperative `editConfirmRef` bridge. Tab
  // traversal uses the raw `handleEditKey` below the gate.
  handleConfirmRename: (newKey: string) => void
  handleStartRename: () => void
  handleCancel: () => void
  handleClick?: (e: React.MouseEvent) => void
  keyValueArray?: Array<[string | number, ValueData]>
  styles: React.CSSProperties
  getNextOrPrevious: (type: 'next' | 'prev') => CollectionKey[] | null
  emptyStringKey: string | null
  nodeData?: NodeData
  customNodeData?: CustomNodeData
  getStyles?: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  // Imperative confirm bridge: a key-rename has no visible OK button, so a
  // hidden element carries `editConfirmRef` for `editorRef.confirmEdit()`.
  editConfirmRef?: React.RefObject<HTMLDivElement | null>
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
  handleConfirmRename,
  handleStartRename,
  handleCancel,
  handleClick,
  keyValueArray,
  styles,
  getNextOrPrevious,
  emptyStringKey,
  nodeData,
  customNodeData,
  getStyles,
  editConfirmRef,
}) => {
  // Actions only (no subscription) — `isEditingKey` arrives via props.
  // Entering key-rename runs through the gated `handleStartRename` prop (so the
  // `onEventIntercept` soft gate isn't bypassed). `startEdit` is still used
  // directly for Tab traversal *within* an open session — internal navigation
  // that lives below the gate, like `editorRef`.
  const { startEdit, cancelEdit } = useEditingStore()
  const keyInputRef = React.useRef<HTMLInputElement>(null)

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
            if (canEditKey) handleStartRename()
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
        onDoubleClick={() => canEditKey && handleStartRename()}
        onClick={handleClick}
      >
        {emptyStringKey ? <span className="jer-empty-string">{emptyStringKey}</span> : displayKey}
        {displayKey !== '' || emptyStringKey ? <span className="jer-key-colon">:</span> : null}
      </span>
    )
  }

  return (
    <>
      <input
        ref={keyInputRef}
        className="jer-input-text jer-key-edit"
        type="text"
        name={pathString}
        defaultValue={displayKey}
        autoFocus
        onFocus={(e) => e.target.select()}
        onKeyDown={(e: React.KeyboardEvent) =>
          handleKeyboard(e, {
            stringConfirm: () => handleConfirmRename((e.target as HTMLInputElement).value),
            cancel: handleCancel,
            tabForward: () => {
              handleEditKey((e.target as HTMLInputElement).value)
              if (keyValueArray) {
                const firstChildKey = keyValueArray?.[0][0]
                const next = firstChildKey ? [...path, firstChildKey] : getNextOrPrevious('next')
                if (next) startEdit(next)
                else cancelEdit()
              } else startEdit(path)
            },
            tabBack: () => {
              handleEditKey((e.target as HTMLInputElement).value)
              const prev = getNextOrPrevious('prev')
              if (prev) startEdit(prev)
              else cancelEdit()
            },
          })
        }
        style={{ width: `${displayKey.length / 1.5 + 0.5}em` }}
      />
      {/* Hidden imperative-confirm bridge: `editorRef.confirmEdit()` clicks this
          to commit the rename below the gate (no visible OK button for keys). */}
      <div
        ref={editConfirmRef}
        style={{ display: 'none' }}
        onClick={() => handleConfirmRename(keyInputRef.current?.value ?? displayKey)}
      />
    </>
  )
}
