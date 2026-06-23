import { useState } from 'react'
import {
  JsonEditor,
  isCollection,
  type CustomComponentProps,
  type JsonData,
  type NodeData,
} from '@json-edit-react'
import { dateObjectDefinition, enhancedLinkDefinition } from '@json-edit-react/components'
import { useEditorDefaults } from '@example-resources'

// `renderCollectionAsValue`: treat a whole object as ONE value,
// not as expandable key/value rows. The matched object is handed
// to the component as `value`, and the component renders — and
// edits — it as a single field.
//
// Three compound fields, three such components:
//   - location → a from-scratch `{ lat, lng }` renderer: a map
//     link in view, two number inputs while editing.
//   - opened   → the pre-built `DateObject` (a real `Date`).
//   - website  → the pre-built `EnhancedLink` (`{ text, url }`).
//
// The plain fields (name, architect) render as normal rows.

const initialData = {
  name: 'Sydney Opera House',
  location: { lat: -33.8568, lng: 151.2153 },
  opened: new Date(1973, 9, 20), // 20 Oct 1973 (month is 0-indexed)
  architect: 'Jørn Utzon',
  website: {
    text: 'sydneyoperahouse.com',
    url: 'https://www.sydneyoperahouse.com',
  },
}

interface LatLng {
  lat: number
  lng: number
}

// A coordinate like 151.2153 → "151.2153°E" (negatives flip the
// hemisphere letter).
const fmtCoord = (deg: number, pos: string, neg: string) =>
  `${Math.abs(deg).toFixed(4)}°${deg >= 0 ? pos : neg}`

// A `{ lat, lng }` object as one value: a map link in view, two
// number inputs while editing. (`renderCollectionAsValue` is set
// on the definition, so `value` is the whole object.)
const Location = ({
  value,
  isEditing,
  setValue,
  onKeyDown,
  getStyles,
  nodeData,
}: CustomComponentProps) => {
  const loc = (value ?? {}) as Partial<LatLng>
  const lat = Number(loc.lat ?? 0)
  const lng = Number(loc.lng ?? 0)

  if (isEditing)
    return (
      <span style={{ display: 'inline-flex', gap: '0.4em', alignItems: 'center' }}>
        <input
          type="number"
          step="any"
          autoFocus
          value={lat}
          onChange={(e) => setValue({ ...loc, lat: Number(e.target.value) })}
          onKeyDown={onKeyDown}
          style={{ ...getStyles('input', nodeData), width: '7em' }}
        />
        <input
          type="number"
          step="any"
          value={lng}
          onChange={(e) => setValue({ ...loc, lng: Number(e.target.value) })}
          onKeyDown={onKeyDown}
          style={{ ...getStyles('input', nodeData), width: '7em' }}
        />
      </span>
    )

  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      style={{ ...getStyles('string', nodeData), cursor: 'pointer', textDecoration: 'underline' }}
    >
      📍 {fmtCoord(lat, 'N', 'S')}, {fmtCoord(lng, 'E', 'W')}
    </a>
  )
}

const customNodeDefinitions = [
  // From-scratch: a `{ lat, lng }` object, rendered as one
  // value. `showInTypeSelector` + `defaultValue` also list it
  // in the Type menu, so any node can be switched to a Location.
  {
    condition: ({ value }: NodeData) => isCollection(value) && 'lat' in value && 'lng' in value,
    component: Location,
    name: 'Location',
    showInTypeSelector: true,
    showOnEdit: true,
    editOnTypeSwitch: true,
    defaultValue: { lat: 0, lng: 0 },
    renderCollectionAsValue: true,
    // Round-trips via a "lat, lng" string, so type switches stay
    // clean (no "[object Object]" landing in the next type).
    toStandardType: (value: unknown) => {
      if (!(isCollection(value) && 'lat' in value && 'lng' in value)) return String(value)
      const { lat, lng } = value as unknown as LatLng
      return `${lat}, ${lng}`
    },
    fromStandardType: (value: unknown) => {
      // The buffer is already the object — pass it through.
      if (isCollection(value) && 'lat' in value && 'lng' in value) return value
      // Else parse a "lat, lng" string; a throw just seeds
      // the defaultValue (e.g. switching from a non-coordinate
      // value).
      const [lat, lng] = String(value).split(',').map(Number)
      if (!Number.isFinite(lat) || !Number.isFinite(lng))
        throw new Error('Expected a "lat, lng" string')
      return { lat, lng }
    },
  },
  // Pre-built: a real `Date`, shown as a date (no time
  // component).
  dateObjectDefinition({ componentProps: { showTime: false } }),
  // Pre-built: a `{ text, url }` object, shown as a clickable
  // link.
  enhancedLinkDefinition(),
]

export default function CollectionAsValue() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="landmark"
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
