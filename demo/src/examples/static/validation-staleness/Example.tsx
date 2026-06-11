import { useMemo, useState } from 'react'
import { JsonEditor, type NodeData, type ThemeStyles } from '@json-edit-react'
import Ajv from 'ajv'
import { useExampleTheme } from '../../kit/exampleProps'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Cross-branch constraint: `card.number` must be ≥16 chars, but only while
// `payment.method` is 'card'. Editing `method` therefore changes the validity
// of a node on a *different branch* — one that won't re-render.
const schema = {
  type: 'object',
  properties: {
    payment: { type: 'object', properties: { method: { enum: ['cash', 'card'] } } },
    card: { type: 'object', properties: { number: { type: 'string' } } },
  },
  if: { properties: { payment: { properties: { method: { const: 'card' } } } } },
  then: { properties: { card: { properties: { number: { minLength: 16 } } } } },
}

const ajv = new Ajv({ allErrors: true })
const validate = ajv.compile(schema)

// The naive approach: run the validator inside a style function. A node only
// re-evaluates this when *it* re-renders — which is the bug on display.
const flagInvalid = (nodeData: NodeData) => {
  validate(nodeData.fullData)
  const pointer = '/' + nodeData.path.join('/')
  return (validate.errors ?? []).some((e) => e.instancePath === pointer)
    ? { backgroundColor: 'firebrick', color: 'white' }
    : null
}

const errorTheme: ThemeStyles = {
  string: flagInvalid,
  number: flagInvalid,
  boolean: flagInvalid,
  null: flagInvalid,
}

const initialData = {
  payment: { method: 'card' },
  card: { number: '' }, // invalid while method === 'card'
}

// Try it:
//  1. On load, `card.number` is red (correct — method is 'card').
//  2. Edit `payment.method` → 'cash'. The banner flips to valid, but the node
//     stays red: it never re-rendered, so its style function never re-ran.
//  3. Collapse and re-expand `card` — the red clears with no data change.
//  4. Edit `method` back to 'card': `number` is invalid again, but no red
//     appears until something forces that node to re-render.
export default function ValidationStaleness() {
  const [data, setData] = useState(initialData)
  const theme = useExampleTheme()

  // Deliberately referentially stable across data changes (the recommended
  // pattern for theme objects). Composing inline — `theme={[theme,
  // errorTheme]}` — would hide the bug: a fresh identity per render means a
  // theme context update, which re-renders every node in the tree.
  const composedTheme = useMemo(() => [theme, errorTheme], [theme])

  const isValid = validate(data)

  return (
    <div>
      <p style={{ padding: '0.6em 1em', fontFamily: 'monospace' }}>
        Document is currently:{' '}
        <strong style={{ color: isValid ? 'green' : 'firebrick' }}>
          {isValid ? 'VALID ✓' : 'INVALID ✗'}
        </strong>
      </p>
      <JsonEditor
        data={data}
        setData={setData}
        {...useExampleProps()} // ---cut---
        rootName="order"
        theme={composedTheme}
      />
    </div>
  )
}
