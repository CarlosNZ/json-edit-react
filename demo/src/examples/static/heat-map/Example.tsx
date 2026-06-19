import { useState } from 'react'
import { JsonEditor, ThemeStyles } from '@json-edit-react'
import { SearchBox } from '../../kit/SearchBox'
import { useExampleTheme } from '../../kit/exampleProps'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

const initialData = {
  'New Zealand': {
    Auckland: 19,
    Wellington: 14,
    Christchurch: 11,
    Queenstown: 4,
  },
  Australia: {
    Sydney: 27,
    Melbourne: 22,
    Darwin: 34,
    'Alice Springs': 38,
  },
  Canada: {
    Toronto: -8,
    Vancouver: 3,
    Winnipeg: -22,
    Yellowknife: -31,
  },
  Japan: {
    Tokyo: 16,
    Osaka: 18,
    Sapporo: -5,
    Naha: 24,
  },
  'United Arab Emirates': {
    Dubai: 43,
    'Abu Dhabi': 41,
  },
}

const MIN_TEMP = -30
const MAX_TEMP = 45

const LIGHTNESS = 0.65 // OKLCH L — perceived lightness, held constant
const CHROMA = 0.25 // OKLCH C — perceived colorfulness, held constant
const HUE_COLD = 264 // blue (OKLCH hue angles differ from HSL!)
const HUE_HOT = 29 // red

const tempToColor = (temp: number): string => {
  const t = Math.min(1, Math.max(0, (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)))
  const hue = HUE_COLD + (HUE_HOT - HUE_COLD) * t // 264 → 29
  return `oklch(${LIGHTNESS} ${CHROMA} ${hue})`
}

const average = (data: Record<string, number>): number => {
  const values = Object.values(data)
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// Style functions to dynamically display different temperatures
// as different colours, and country names as the average of
// their cities' temperatures.
const heatMapTheme: ThemeStyles = {
  number: ({ value }) => {
    return { color: tempToColor(value as number), fontWeight: 'bold', fontSize: '115%' }
  },
  property: ({ level, value }) => {
    if (level === 1)
      return { color: tempToColor(average(value as Record<string, number>)), fontWeight: 'bold' }
  },
}

export default function HeatMap() {
  const [data, setData] = useState(initialData)
  const theme = useExampleTheme()
  // `searchFilter="all"` matches on keys and values, so a
  // search hits a country or any of its cities.
  const [searchText, setSearchText] = useState('')

  return (
    <div style={{ position: 'relative' }}>
      <SearchBox
        value={searchText}
        onChange={setSearchText}
        placeholder="Search countries or cities"
      />
      <JsonEditor
        data={data}
        setData={setData}
        {...useExampleProps()} // ---cut---
        rootName="temperatures (°C)"
        // The heatMap style functions (above) merge with the
        // selected theme and override it where they overlap.
        theme={[theme, heatMapTheme]}
        searchFilter="key"
        searchText={searchText}
      />
    </div>
  )
}
