import { useState } from 'react'
import {
  JsonEditor,
  type CustomNodeDefinition,
  type CustomComponentProps,
} from '@json-edit-react'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

const initialData = {
  name: 'Project Phoenix',
  owner: 'Ada Lovelace',
  priority: 3,
  published: false,
}

// A custom node that decorates the *standard* value rendering with a "saving…"
// badge while the node's optimistic edit is still settling — i.e. the async
// `onUpdate` below hasn't resolved yet. `isPending` is true for exactly that
// window (and only on the edited node), so this is all it takes to show a
// pending state. `passOriginalNode` lets us reuse the normal value display and
// just add the badge.
const SavingIndicator = ({ isPending, originalNode }: CustomComponentProps) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}>
    {originalNode}
    {isPending && (
      <span
        style={{
          padding: '0 0.6em',
          fontSize: '0.8em',
          lineHeight: 1.6,
          borderRadius: '0.8em',
          color: '#fff',
          background: '#e0991a',
          whiteSpace: 'nowrap',
        }}
      >
        saving…
      </span>
    )}
  </span>
)

// Match every leaf value (anything that isn't an object/array), so editing any
// field demonstrates the indicator. Module-scoped for referential stability.
const customNodeDefinitions: CustomNodeDefinition[] = [
  {
    condition: ({ value }) => value === null || typeof value !== 'object',
    component: SavingIndicator,
    passOriginalNode: true,
  },
]

export default function PendingOverlay() {
  const [data, setData] = useState(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="project"
      customNodeDefinitions={customNodeDefinitions}
      onUpdate={async ({ newData }) => {
        // Simulate persisting to a server. The edit is applied
        // immediately (optimistic); this promise resolving is what
        // clears `isPending` and removes the badge. Throwing (or
        // returning an error string) would roll the edit back instead.
        await new Promise((resolve) => setTimeout(resolve, 1500))
        console.log('Saved to server:', newData)
      }}
    />
  )
}
