import { useState, type CSSProperties } from 'react'
import { JsonEditor, type JsonData } from '@json-edit-react'
import { useConfirmOnUpdate, type ConfirmDialogState } from '@json-edit-react/utils'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

const initialData = {
  name: 'Project Phoenix',
  owner: 'Ada Lovelace',
  priority: 3,
  published: false,
  tags: ['internal', 'q3'],
}

// A plain, self-contained confirmation modal — no UI library. It's driven
// entirely by the `dialog` object the hook returns: `isOpen` toggles it,
// `onConfirm` / `onCancel` are the button handlers, and `title` / `message`
// carry the content. Swap in your own modal (Chakra, MUI, Radix…) — the only
// contract is these fields.
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }: ConfirmDialogState) => {
  if (!isOpen) return null
  return (
    <div style={backdrop} onClick={onCancel}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        {title && <h2 style={titleStyle}>{title}</h2>}
        {message && <p style={messageStyle}>{message}</p>}
        <div style={actions}>
          <button style={cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button style={confirmButton} onClick={onConfirm} autoFocus>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationExample() {
  const [data, setData] = useState<JsonData>(initialData)

  // Ask before committing any change. The hook runs the hold() gate for us — the
  // edited node stays open and the rest of the tree is blocked while the modal
  // is up — then commits on Confirm, or reverts on Cancel. `confirmOn` takes the
  // event names to gate (or a predicate); `message` can be a string or, as here,
  // a function of the edit.
  const { onUpdate, dialog } = useConfirmOnUpdate({
    confirmOn: ['edit', 'add', 'delete', 'rename'],
    title: 'Confirm change',
    message: (input) => {
      switch (input.event) {
        case 'edit':
          return `Set "${String(input.key)}" to ${JSON.stringify(input.newValue)}?`
        case 'rename':
          return `Rename "${String(input.key)}" to "${input.newKey}"?`
        case 'add':
          return `Add new item "${String(input.key)}"?`
        case 'delete':
          return `Delete "${String(input.key)}"?`
        default:
          return 'Apply this change?'
      }
    },
  })

  return (
    <>
      <JsonEditor
        data={data}
        setData={setData}
        {...useExampleProps()} // ---cut---
        rootName="project"
        onUpdate={onUpdate}
      />
      <ConfirmModal {...dialog} />
    </>
  )
}

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
}

const card: CSSProperties = {
  background: '#fff',
  color: '#1a202c',
  borderRadius: 10,
  padding: '1.5em 1.75em',
  width: 'min(90vw, 360px)',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
}

const titleStyle: CSSProperties = { margin: '0 0 0.4em', fontSize: '1.2em' }
const messageStyle: CSSProperties = { margin: '0 0 1.4em', color: '#4a5568' }
const actions: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '0.75em' }

const buttonBase: CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '0.5em 1.1em',
  fontSize: '0.95em',
  cursor: 'pointer',
}
const cancelButton: CSSProperties = { ...buttonBase, background: '#e2e8f0', color: '#1a202c' }
const confirmButton: CSSProperties = { ...buttonBase, background: '#3182ce', color: '#fff' }
