import React, { useEffect, useState } from 'react'
import { Icon } from './Icons'
import { useTheme } from './theme'
import { type TranslateFunction } from './localisation'
import {
  type CollectionKey,
  type CollectionDataType,
  type CopyFunction,
  type CopyType,
  type NodeData,
} from './types'
import './style.css'

interface EditButtonProps {
  startEdit?: () => void
  handleDelete?: () => void
  enableClipboard: boolean | CopyFunction
  handleAdd?: (newKey: string) => void
  type?: CollectionDataType
  nodeData: NodeData
  translate: TranslateFunction
}

export const EditButtons: React.FC<EditButtonProps> = ({
  startEdit,
  handleDelete,
  handleAdd,
  enableClipboard,
  type,
  nodeData,
  translate,
}) => {
  const { getStyles } = useTheme()
  const NEW_KEY_PROMPT = translate('KEY_NEW', nodeData)
  const [isAdding, setIsAdding] = useState(false)
  const [newKey, setNewKey] = useState(NEW_KEY_PROMPT)

  const { key, path, value: data } = nodeData

  useEffect(() => {
    if (!isAdding) setNewKey(NEW_KEY_PROMPT)
  }, [isAdding])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && handleAdd) {
      setIsAdding(false)
      handleAdd(newKey)
    } else if (e.key === 'Escape') setIsAdding(false)
  }

  const handleCopy = (e: React.MouseEvent<HTMLElement>) => {
    let copyType: CopyType = 'value'
    let value
    let stringValue = ''
    if (enableClipboard) {
      switch (e.ctrlKey || e.metaKey) {
        case true:
          value = stringifyPath(path)
          stringValue = value
          copyType = 'path'
          break
        default:
          value = data
          stringValue = type ? JSON.stringify(data, null, 2) : String(value)
      }
      void navigator.clipboard.writeText(stringValue)
    }
    if (typeof enableClipboard === 'function') {
      enableClipboard({ value, stringValue, path, key, type: copyType })
    }
  }

  return (
    <div className="jer-edit-buttons" style={{ opacity: isAdding ? 1 : undefined }}>
      {enableClipboard && (
        <div onClick={handleCopy} className="jer-copy-pulse">
          <Icon name="copy" nodeData={nodeData} />
        </div>
      )}
      {startEdit && (
        <div onClick={startEdit}>
          <Icon name="edit" nodeData={nodeData} />
        </div>
      )}
      {handleDelete && (
        <div onClick={handleDelete}>
          <Icon name="delete" nodeData={nodeData} />
        </div>
      )}
      {handleAdd && (
        <div
          onClick={() => {
            if (type === 'object') setIsAdding(true)
            // For arrays, we don't need to add a key
            else handleAdd('')
          }}
        >
          <Icon name="add" nodeData={nodeData} />
        </div>
      )}
      {isAdding && handleAdd && type === 'object' && (
        <>
          <input
            className="jer-input-new-key"
            type="text"
            name="new-object-key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            autoFocus
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyPress}
            style={getStyles('input', nodeData)}
          />
          <InputButtons
            onOk={() => {
              if (newKey) {
                setIsAdding(false)
                handleAdd(newKey)
              }
            }}
            onCancel={() => {
              setIsAdding(false)
            }}
            nodeData={nodeData}
          />
        </>
      )}
    </div>
  )
}

export const InputButtons: React.FC<{
  onOk: () => void
  onCancel: () => void
  nodeData: NodeData
}> = ({ onOk, onCancel, nodeData }) => {
  return (
    <div className="jer-confirm-buttons">
      <div onClick={onOk}>
        <Icon name="ok" nodeData={nodeData} />
      </div>
      <div onClick={onCancel}>
        <Icon name="cancel" nodeData={nodeData} />
      </div>
    </div>
  )
}

const stringifyPath = (path: CollectionKey[]): string =>
  path.reduce((str: string, part) => {
    if (typeof part === 'number') return `${str}[${part}]`
    else return str === '' ? part : `${str}.${part}`
  }, '')
