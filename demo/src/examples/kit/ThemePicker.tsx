import { useState } from 'react'
import { Select, type SelectProps } from '@chakra-ui/react'
import { defaultTheme, type Theme } from '@json-edit-react'

// Mirrors the main demo's theme list + name→getter convention (see App.tsx).
const themeNames = [
  'Default',
  'Github Dark',
  'Github Light',
  'White & Black',
  'Black & White',
  'Candy Wrapper',
  'Psychedelic',
  'Solarized Dark',
  'Solarized Light',
  'Dracula',
  'Monokai',
  'Tokyo Night',
]

// Resolve a display name to its Theme, loading `LazyThemes` on demand (keeps the
// theme objects out of the initial examples chunk) and caching the result. The
// getter-name convention (`get<Name>Theme`, spaces/ampersands stripped) matches
// `themeGetters` in LazyThemes.ts.
const cache: Record<string, Theme> = { Default: defaultTheme }

const loadTheme = async (name: string): Promise<Theme> => {
  if (cache[name]) return cache[name]
  const fnName = `get${name.replace(/\s+&\s+|\s+/g, '')}Theme`
  const { themeGetters } = await import('../../LazyThemes')
  const theme = themeGetters[fnName] ? themeGetters[fnName]() : defaultTheme
  cache[name] = theme
  return theme
}

interface ThemePickerProps extends Omit<SelectProps, 'onChange' | 'value'> {
  value: Theme
  onChange: (theme: Theme) => void
}

export const ThemePicker = ({ value, onChange, ...rest }: ThemePickerProps) => {
  const [name, setName] = useState(value.displayName ?? 'Default')
  return (
    <Select
      aria-label="Theme"
      bg="white"
      value={name}
      onChange={async (e) => {
        const next = e.target.value
        setName(next)
        onChange(await loadTheme(next))
      }}
      {...rest}
    >
      {themeNames.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  )
}
