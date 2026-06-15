import { useMemo, useState } from 'react'
import { JsonEditor } from '@json-edit-react'
import { useValidationState, ajvAdapter } from '@json-edit-react/utils'
import { errorIndicatorDefinition } from '@json-edit-react/components'
import Ajv from 'ajv'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// A custom-node glyph marker for invalid nodes, driven by `useValidationState`.
// Same cross-branch constraint as the sibling "Validation staleness" example:
// `card.number` must be ≥16 chars, but only while `payment.method` is 'card'.
// Editing `method` changes the validity of a node on a *different* branch.
const schema = {
  type: 'object',
  properties: {
    payment: { type: 'object', properties: { method: { enum: ['cash', 'card'] } } },
    card: { type: 'object', properties: { number: { type: 'string' } } },
  },
  if: { properties: { payment: { properties: { method: { const: 'card' } } } } },
  then: { properties: { card: { properties: { number: { minLength: 16 } } } } },
}

// Compile the validator once and wrap it for the hook.
const ajv = new Ajv({ allErrors: true })
const validate = ajvAdapter(ajv.compile(schema))

const initialData = {
  payment: { method: 'card' },
  card: { number: '' }, // invalid while method === 'card'
}

// Try it:
//  1. On load, `card.number` shows a ⚠️ (method is 'card', number too short).
//  2. Edit `payment.method` → 'cash'. The ⚠️ clears *immediately* — even though
//     `card.number` is on another branch and its own value didn't change.
//  3. Edit it back to 'card': the ⚠️ returns at once. No collapse/re-expand
//     needed — the definitions, memoized on `validation`, re-render the tree
//     exactly when validity changes.
export default function ValidationFlagging() {
  const [data, setData] = useState(initialData)

  // One hook: re-validates per data change, queryable in O(1), and
  // referentially stable until the error set actually changes.
  const validation = useValidationState(data, validate)

  // `errorIndicatorDefinition` wraps the built-in node and adds a ⚠️. The
  // validity check rides the definition's `condition`; memoising on `validation`
  // is what lets the tree re-render — and flag cross-branch nodes — when
  // validity flips.
  const customNodeDefinitions = useMemo(
    () => [
      errorIndicatorDefinition({
        condition: (nodeData) => validation.hasErrorAt(nodeData.path),
      }),
    ],
    [validation]
  )

  return (
    <div>
      <p style={{ padding: '0.6em 1em', fontFamily: 'monospace' }}>
        Document is currently:{' '}
        <strong style={{ color: validation.isValid ? 'green' : 'firebrick' }}>
          {validation.isValid ? 'VALID ✓' : 'INVALID ✗'}
        </strong>
      </p>
      <JsonEditor
        data={data}
        setData={setData}
        {...useExampleProps()} // ---cut---
        rootName="order"
        customNodeDefinitions={customNodeDefinitions}
      />
    </div>
  )
}
