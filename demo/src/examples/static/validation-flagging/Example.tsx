import { useMemo, useState } from 'react'
import { JsonEditor } from '@json-edit-react'
import { useValidationState, validationStyles, ajvAdapter } from '@json-edit-react/utils'
import Ajv from 'ajv'
import { useExampleTheme, useExampleProps } from '../../kit/exampleProps' // ---cut---

// The fix for the cross-branch staleness shown in the sibling "Validation
// staleness" example. Same constraint: `card.number` must be ≥16 chars, but
// only while `payment.method` is 'card'. Editing `method` changes the validity
// of a node on a *different* branch — `useValidationState` restyles it
// correctly, because its result identity changes exactly when validity does.
const schema = {
  type: 'object',
  properties: {
    payment: { type: 'object', properties: { method: { enum: ['cash', 'card'] } } },
    card: { type: 'object', properties: { number: { type: 'string' } } },
  },
  if: { properties: { payment: { properties: { method: { const: 'card' } } } } },
  then: { properties: { card: { properties: { number: { minLength: 16 } } } } },
}

// Compile the validator once and wrap it for the hook — `ajvAdapter` normalises
// AJV's errors into the `{ path, message }[]` the hook consumes.
const ajv = new Ajv({ allErrors: true })
const validate = ajvAdapter(ajv.compile(schema))

const initialData = {
  payment: { method: 'card' },
  card: { number: '' }, // invalid while method === 'card'
}

// Try it:
//  1. On load, `card.number` is flagged (method is 'card', number too short).
//  2. Edit `payment.method` → 'cash'. The flag clears *immediately* — even
//     though `card.number` is on another branch and its own value didn't
//     change. (Collapse `card` first and you'll still see the parent marked.)
//  3. Edit it back to 'card': the flag returns at once. No collapse/re-expand
//     needed — the hook re-renders the tree exactly when validity changes.
export default function ValidationFlagging() {
  const [data, setData] = useState(initialData)
  const baseTheme = useExampleTheme()

  // One hook: re-validates per data change, queryable in O(1), and
  // referentially stable until the error set actually changes.
  const validation = useValidationState(data, validate)

  // Compose the error styling over the host theme. Memoising on `validation`
  // (not an inline array) is what keeps the tree from re-rendering every commit
  // — and what lets it re-render, and restyle cross-branch nodes, when validity
  // flips.
  const theme = useMemo(
    () => [
      baseTheme,
      validationStyles(validation, {
        error: { backgroundColor: 'firebrick', color: 'white' },
        within: { backgroundColor: 'rgba(178, 34, 34, 0.08)' },
      }),
    ],
    [baseTheme, validation]
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
        theme={theme}
      />
    </div>
  )
}
