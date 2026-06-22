import { type EditEvent, type UpdateFunction } from '@json-edit-react'
import { type ToastStatus } from '@example-resources'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// A stand-in for a real async save. Settles after a random 0.5–3 s, then fails
// 1 in 4 — so the event stream mixes updateSuccess (green) and updateError
// (red) at unpredictable delays. The "Use delayed settlement" toggle is exempt,
// so the control that enables this stays responsive.
export const saveToRemoteServer: UpdateFunction = async ({ path }) => {
  if (path[0] === 'Use delayed settlement') return
  await wait(200 + Math.random() * 3000)
  if (Math.random() < 0.25) return { error: 'Random save failure (1 in 4)' }
}

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
