/**
 * Renders the key ("Property") label for both Collection and Value nodes
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
  arrayIndexStart: number
  handleKeyboard: (
    e: React.KeyboardEvent,
    eventMap: Partial<Record<keyof KeyboardControlsFull, () => void>>
  ) => void
  handleEditKey: (newKey: string, onCommit?: () => void) => void
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
  arrayIndexStart,
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
  // Actions only (no subscription) — `isEditingKey` arrives via props.
  const { open, cancel } = useEditingStore()

  // The rename `<input>` is uncontrolled (`defaultValue`), so its in-progress
  // value lives in the DOM. `renameCommitOp` reads it live to commit on
  // displace (the keyboard paths read `e.target.value` directly instead).
  const keyInputRef = React.useRef<HTMLInputElement>(null)
  const renameCommitOp = (onCommit: () => void) =>
    handleEditKey(keyInputRef.current?.value ?? String(name), onCommit)

  const displayKey = typeof name === 'number' ? String(name + arrayIndexStart) : name

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
    if (customNodeData?.CustomKeyComponent && nodeData && getStyles) {
      const { CustomKeyComponent, componentProps } = customNodeData
      return (
        <CustomKeyComponent
          nodeData={nodeData}
          name={emptyStringKey ?? displayKey}
          path={path}
          canEditKey={canEditKey}
          handleEditKey={(newKey) => {
            if (canEditKey) handleEditKey(newKey)
          }}
          startEditingKey={() => {
            if (canEditKey) open(path, { op: 'rename', commitOp: renameCommitOp })
          }}
          handleClick={handleClick}
          styles={derivedKeyStyles}
          componentProps={componentProps}
          getStyles={getStyles}
        />
      )
    }
    return (
      <span
        className="jer-key-text"
        style={derivedKeyStyles}
        onDoubleClick={() => canEditKey && open(path, { op: 'rename', commitOp: renameCommitOp })}
        onClick={handleClick}
      >
        {emptyStringKey ? <span className="jer-empty-string">{emptyStringKey}</span> : displayKey}
        {displayKey !== '' || emptyStringKey ? <span className="jer-key-colon">:</span> : null}
      </span>
    )
  }

  return (
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
          stringConfirm: () => handleEditKey((e.target as HTMLInputElement).value),
          cancel: handleCancel,
          // Tab commits the rename, then opens the next node at the commit
          // moment (via `onCommit`) — so an invalid (duplicate-key) rename
          // blocks the move and stays open, matching value-edit Tab / displace.
          tabForward: () => {
            const value = (e.target as HTMLInputElement).value
            handleEditKey(value, () => {
              if (keyValueArray) {
                const firstChildKey = keyValueArray?.[0][0]
                const next = firstChildKey ? [...path, firstChildKey] : getNextOrPrevious('next')
                if (next) open(next)
                else cancel()
              } else open(path)
            })
          },
          tabBack: () => {
            const value = (e.target as HTMLInputElement).value
            handleEditKey(value, () => {
              const prev = getNextOrPrevious('prev')
              if (prev) open(prev)
              else cancel()
            })
          },
        })
      }
      style={{ width: `${displayKey.length / 1.5 + 0.5}em` }}
    />
  )
}
