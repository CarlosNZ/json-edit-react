import React, { useEffect, useState } from 'react'
import { Icon } from './Icons'
import { useTheme } from './theme'
import { TranslateMethod } from './localisation'
import { CollectionDataType, CollectionKey, CopyMethod, CopyType } from './types'
import './style.css'

interface EditButtonProps {
  startEdit?: () => void
  handleDelete?: () => void
  enableClipboard: boolean | CopyMethod
  handleAdd?: (newKey: string) => void
  type?: CollectionDataType
  data: unknown
  path: CollectionKey[]
  name: CollectionKey
  translate: TranslateMethod
}

export const EditButtons: React.FC<EditButtonProps> = ({
  startEdit,
  handleDelete,
  handleAdd,
  enableClipboard,
  type,
  data,
  path,
  name,
  translate,
}) => {
  const { styles } = useTheme()
  const NEW_KEY_PROMPT = translate('KEY_NEW')
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
    let value
    if (enableClipboard) {
      switch (e.ctrlKey || e.metaKey) {
        case true:
          value = stringifyPath(path)
          type = 'path'
          break
        case false:
          value = JSON.stringify(data, null, 2)
      }
      navigator.clipboard.writeText(value)
    }
    if (typeof enableClipboard === 'function') enableClipboard({ value, path, key: name, type })
  }

  return (
    <div className="jer-edit-buttons" style={isAdding ? { opacity: 1 } : undefined}>
      {enableClipboard && (
        <div
          onClick={handleCopy}
          className="jer-icon-wrapper jer-copy-pulse"
          style={styles.iconCopy}
        >
          <Icon name="copy" />
        </div>
      )}
      {startEdit && (
        <div onClick={startEdit} className="jer-icon-wrapper" style={styles.iconEdit}>
          <Icon name="edit" />
        </div>
      )}
      {handleDelete && (
        <div onClick={handleDelete} className="jer-icon-wrapper" style={styles.iconDelete}>
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
          className="jer-icon-wrapper"
          style={styles.iconAdd}
        >
          <Icon name="add" />
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
            style={{ ...styles.input }}
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
  const { styles } = useTheme()
  const size = isCollection ? '2em' : undefined
  return (
    <div className="jer-input-buttons">
      <div onClick={onOk} className="jer-icon-wrapper" style={styles.iconOk}>
        <Icon name="ok" size={size} />
      </div>
      <div onClick={onCancel} className="jer-icon-wrapper" style={styles.iconCancel}>
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
