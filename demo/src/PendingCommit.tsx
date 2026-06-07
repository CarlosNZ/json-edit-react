import { type FC } from 'react'
import { type CustomComponentProps } from '@json-edit-react'

// Placeholder pending-overlay node for the confirm demo (Intro dataset). The
// confirm hooks ship NO UI — the consumer supplies this and passes it as
// `pendingComponent`. Just a red border for now; a proper visual comes later.
export const PendingCommit: FC<CustomComponentProps> = ({ value, originalNode, componentProps }) => (
  <div
    title={`pending: ${String(componentProps?.event ?? '')}`}
    style={{ border: '2px solid red', borderRadius: 4, padding: '0 0.25em' }}
  >
    {originalNode ?? <span>{String(value)}</span>}
  </div>
)
