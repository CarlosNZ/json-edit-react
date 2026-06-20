import { type EditEvent } from '@json-edit-react'
import { type ToastStatus } from '@example-resources'

// Group the lifecycle into four colour-coded signals: a session opening or
// being committed (info), a change landing or a save confirming (success), an
// edit discarded or a node removed (warning), and a save rejecting (error).
export const statusForEvent = (event: EditEvent['event']): ToastStatus => {
  if (event === 'updateError') return 'error'
  if (event.startsWith('cancel') || event === 'delete') return 'warning'
  if (event.startsWith('commit') || event === 'updateSuccess' || event === 'move') return 'success'
  return 'info' // start* / submit*
}

// A one-line summary of where the event landed, plus the bit of payload unique
// to that event (the rename keys, the settlement operation, the error message).
export const describeEvent = (e: EditEvent): string => {
  const where = e.path.length ? e.path.join(' › ') : '(root)'
  switch (e.event) {
    case 'commitRename':
      return `${where}  "${e.oldKey}" → "${e.newKey}"`
    case 'updateError':
      return `${where}  ${e.error.message}`
    case 'updateSuccess':
      return `${where}  (${e.operation})`
    default:
      return where
  }
}
