import { useState } from 'react'
import { Icon } from './Icons'
import './style.css'
import { CollectionDataType } from './types'

export const EditButtons: React.FC<{
  startEdit?: () => void
  handleDelete?: () => void
  handleCopy?: () => void
  handleAdd?: (value: string) => void
  type?: CollectionDataType
}> = ({ startEdit, handleDelete, handleAdd, handleCopy, type }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [newKey, setNewKey] = useState('Enter new key')

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && handleAdd) {
      setIsAdding(false)
      handleAdd(newKey)
    } else if (e.key === 'Escape') setIsAdding(false)
  }

  return (
    <div className="fg-edit-buttons">
      {handleCopy && (
        <span onClick={handleCopy}>
          <Icon name="copy" />
        </span>
      )}
      {startEdit && (
        <span onClick={startEdit}>
          <Icon name="edit" />
        </span>
      )}
      {handleDelete && (
        <span onClick={handleDelete}>
          <Icon name="delete" />
        </span>
      )}
      {handleAdd && (
        <span
          onClick={() => {
            if (type === 'object') setIsAdding(true)
            else handleAdd('IGNORE')
          }}
        >
          <Icon name="add" />
        </span>
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

export const InputButtons: React.FC<{ onOk: () => void; onCancel: () => void }> = ({
  onOk,
  onCancel,
}) => (
  <div className="fg-input-buttons">
    <span onClick={onOk}>
      <Icon name="ok" />
    </span>
    <span onClick={onCancel}>
      <Icon name="cancel" />
    </span>
  </div>
)
