import React, { useEffect, useState } from 'react'
import { Icon } from './Icons'
import './style.css'
import { CollectionDataType, CollectionKey, CopyMethod } from './types'

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

  const handleCopy = (e: any) => {
    console.log('Shift', e.getModifierState('Shift'))
    if (enableClipboard) navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    if (typeof enableClipboard === 'function') enableClipboard({ value: data, path, key: name })
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
            else handleAdd('IGNORE')
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
