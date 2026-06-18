import { useState } from 'react'
import { JsonEditor, type OnChangeFunction } from '@json-edit-react'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// `onChange` runs on every keystroke (not on commit), and
// MUST return a value — what it returns becomes the new
// contents of the input field. Use it to constrain or
// transform input live. Try editing each field:
//
//   - `name`: anything that isn't a letter or space is
//     dropped (digits, punctuation, line breaks)
//   - `age`: clamped to the 0–100 range as you type
//   - `couponCode`: forced to UPPER CASE live
const initialData = {
  name: 'Big Spender',
  age: 36,
  couponCode: 'SPRING25',
}

const onChange: OnChangeFunction = ({ key, newValue }) => {
  // CLAMP a number into range. Out-of-range values snap to
  // the nearest bound; in-range values fall through below.
  if (key === 'age' && typeof newValue === 'number') {
    if (newValue < 0) return 0
    if (newValue > 100) return 100
  }
  // FILTER characters: keep only letters and whitespace.
  if (key === 'name' && typeof newValue === 'string')
    return newValue.replace(/[^a-zA-Z\s]|\n|\r/gm, '')
  // TRANSFORM: upper-case the value on the way in.
  if (key === 'couponCode' && typeof newValue === 'string') return newValue.toUpperCase()
  // Otherwise return the input untouched — `onChange` must
  // always return a value or the field won't update.
  return newValue
}

export default function OnChangeValidation() {
  const [data, setData] = useState(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="signup"
      onChange={onChange}
    />
  )
}
