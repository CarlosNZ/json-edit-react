import React, { useEffect, useState } from 'react'
import { Icon } from './Icons'
import './style.css'
import { CollectionDataType, CollectionKey, CopyMethod, CopyType } from './types'

export const EditButtons: React.FC<{
  startEdit?: () => void
  handleDelete?: () => void
  enableClipboard: boolean | CopyMethod
  handleAdd?: (newKey: string) => void
  type?: CollectionDataType
  data: unknown
  path: CollectionKey[]
  name: CollectionKey
}> = ({ startEdit, handleDelete, handleAdd, enableClipboard, type, data, path, name }) => {
  const NEW_KEY_PROMPT = 'Enter new key'
  const [isAdding, setIsAdding] = useState(false)
  const [newKey, setNewKey] = useState(NEW_KEY_PROMPT)

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
    let type: CopyType = 'value'
    if (enableClipboard) {
      switch (e.getModifierState('Shift')) {
        case true:
          navigator.clipboard.writeText(stringifyPath(path))
          type = 'path'
          break
        case false:
          navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      }
    }
    if (typeof enableClipboard === 'function')
      enableClipboard({ value: data, path, key: name, type })
  }

  return (
    <div className="fg-edit-buttons" style={isAdding ? { opacity: 1 } : undefined}>
      {enableClipboard && (
        <div onClick={handleCopy} className="fg-icon-wrapper">
          <Icon name="copy" />
        </div>
      )}
      {startEdit && (
        <div onClick={startEdit} className="fg-icon-wrapper">
          <Icon name="edit" />
        </div>
      )}
      {handleDelete && (
        <div onClick={handleDelete} className="fg-icon-wrapper">
          <Icon name="delete" />
        </div>
      )}
      {handleAdd && (
        <div
          onClick={() => {
            if (type === 'object') setIsAdding(true)
            // For arrays, we don't need to add a key
            else handleAdd('')
          }}
          className="fg-icon-wrapper"
        >
          <Icon name="add" />
        </div>
      )}
      {isAdding && handleAdd && type === 'object' && (
        <>
          <input
            className="fg-input-new-key"
            type="text"
            name="new-object-key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            autoFocus
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyPress}
          />
          <InputButtons
            onOk={() => {
              if (!!newKey) {
                setIsAdding(false)
                handleAdd(newKey)
              }
            }}
            onCancel={() => {
              setIsAdding(false)
            }}
          />
        </>
      )}
    </div>
  )
}

export const InputButtons: React.FC<{
  onOk: () => void
  onCancel: () => void
  isCollection?: boolean
}> = ({ onOk, onCancel, isCollection = false }) => {
  const size = isCollection ? '2em' : undefined
  return (
    <div className="fg-input-buttons">
      <div onClick={onOk} className="fg-icon-wrapper">
        <Icon name="ok" size={size} />
      </div>
      <div onClick={onCancel} className="fg-icon-wrapper">
        <Icon name="cancel" size={size} />
      </div>
    </div>
  )
}

const stringifyPath = (path: (string | number)[]): string =>
  path.reduce((str: string, part) => {
    if (typeof part === 'number') return `${str}[${part}]`
    else return str === '' ? part : `${str}.${part}`
  }, '')
