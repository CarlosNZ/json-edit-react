import { useState, type CSSProperties } from 'react'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

// A search input for example pages: a narrow pill that floats over the
// top-right of its container (give that container `position: relative`),
// showing 🔍 when idle and widening on focus — like the search on the main
// demo. The consuming example owns the `value` state and feeds it to the
// editor's `searchText`; the editor's `searchFilter` does the matching.
export const SearchBox = ({ value, onChange, placeholder = 'Search' }: SearchBoxProps) => {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={focused ? placeholder : '🔍'}
      style={{ ...searchStyle, width: focused ? '60%' : '5rem' }}
    />
  )
}

const searchStyle: CSSProperties = {
  position: 'absolute',
  top: '0.5em',
  right: '0.5em',
  zIndex: 10,
  padding: '0.4em 0.8em',
  fontSize: '0.9em',
  borderRadius: 50,
  border: '1px solid gainsboro',
  backgroundColor: '#f6f6f6',
  transition: 'width 0.3s',
}
