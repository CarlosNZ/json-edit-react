import { useState, type CSSProperties } from 'react'
import { JsonEditor, type FilterFunction, type JsonData } from '@json-edit-react'
import { useConfirmOnUpdate, type ConfirmDialogState } from '@json-edit-react/utils'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Three gating patterns in one editor:
//   - "Delayed Settlement": optimistic edit; settles after a
//     random 0.5–3s, and the value must contain a "Z".
//   - "Name with confirmation": edits go via a confirm modal.
//   - "Careful": deleting it is BOTH confirmed (modal) AND
//     delay-settled by a server that fails ~half the time.
// `useConfirmOnUpdate` runs the modal + hold() gating; its
// `onUpdate` option carries the delayed/async logic.
// `toast` is injected as a prop (the demo passes Chakra's
// `useToast()`); we use its `update` to mutate the SAME toast.
type ToastId = string | number
type ToastOpts = {
  title: string
  status: 'info' | 'success' | 'error'
  duration?: number | null
}
interface Toast {
  (opts: ToastOpts): ToastId | undefined
  update: (id: ToastId, opts: ToastOpts) => void
}

// A server round-trip: a random 0.5–3s of latency.
const settle = () => new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 2500))

// A stand-in backend. Each call waits out the latency, then
// resolves with a result. `update` rejects a value with no
// "Z"; `delete` is flaky and fails about half the time.
type ServerResult = { ok: true } | { ok: false; error: string }

const Server = {
  update: async (patch: Record<string, unknown>): Promise<ServerResult> => {
    await settle()
    const valid = Object.values(patch).every((v) => String(v).toUpperCase().includes('Z'))
    return valid ? { ok: true } : { ok: false, error: 'Invalid response' }
  },
  delete: async (_key: string): Promise<ServerResult> => {
    await settle()
    return Math.random() < 0.5
      ? { ok: false, error: 'Server error: unable to delete' }
      : { ok: true }
  },
}

const DELAYED = 'Server-side validation'
const CONFIRM = 'Local confirmation'
const CAREFUL = 'Careful'

const initialData = {
  [DELAYED]: 'You MUST include a Z',
  [CONFIRM]: 'Keanu Reeves',
  [CAREFUL]: 'Risky to delete',
}

// Only the "Careful" field can be deleted (and only via the
// confirmation flow below); the others are edit-only.
const allowDelete: FilterFunction = ({ key }) => key === CAREFUL

// A plain, self-contained confirmation modal — no UI
// library. It's driven entirely by the `dialog` object the
// hook returns: `isOpen` toggles it, `onConfirm` / `onCancel`
// are the button handlers, and `title` / `message` carry the
// content. Swap in your own modal (Chakra, MUI, Radix…) — the
// only contract is these fields.
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

export default function ConfirmAndSettle({ toast }: { toast: Toast }) {
  const [data, setData] = useState<JsonData>(initialData)

  // Show a toast on submit, then update the SAME toast on
  // settle — the result message replaces "Connecting...".
  const announce = (id: ToastId | undefined, opts: ToastOpts) => {
    const settled = { ...opts, duration: 4000 }
    return id === undefined ? toast(settled) : toast.update(id, settled)
  }

  const { onUpdate, dialog } = useConfirmOnUpdate({
    // Confirm: editing the name, and deleting "Careful".
    confirmOn: (input) =>
      input.key === CONFIRM || (input.key === CAREFUL && input.event === 'delete'),
    title: 'Confirm change',
    message: (input) => {
      if (input.event === 'delete') return `Delete the "${String(input.key)}" field?`
      if (input.event === 'edit') return `Set the name to ${JSON.stringify(input.newValue)}?`
      return 'Apply this change?'
    },
    // Runs for un-confirmed edits AND after a confirmed change
    // settles — so the delayed/async work lives here.
    onUpdate: async (input) => {
      // "Delayed Settlement": optimistic save. The server
      // rejects a value with no "Z"; the inline error stays,
      // and the toast mirrors the server's response.
      if (input.event === 'edit' && input.key === DELAYED) {
        const id = toast({ title: 'Connecting to server...', status: 'info', duration: null })
        const result = await Server.update({ [input.key]: input.newValue })
        announce(
          id,
          result.ok
            ? { title: 'Acceptable response saved successfully', status: 'success' }
            : { title: result.error, status: 'error' }
        )
        return result.ok ? undefined : { error: "Must include a 'Z'" }
      }
      // "Careful" delete (already confirmed above). The server
      // is flaky; a delete has no inline error, so the toast is
      // the only feedback.
      if (input.event === 'delete' && input.key === CAREFUL) {
        const id = toast({ title: 'Connecting to server...', status: 'info', duration: null })
        const result = await Server.delete(String(input.key))
        announce(
          id,
          result.ok
            ? { title: 'Deleted successfully', status: 'success' }
            : { title: result.error, status: 'error' }
        )
        return result.ok ? undefined : { error: result.error }
      }
    },
  })

  return (
    <>
      <JsonEditor
        data={data}
        setData={setData}
        {...useExampleProps()} // ---cut---
        rootName="form"
        allowAdd={false}
        allowDelete={allowDelete}
        allowTypeSelection={false}
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
