import { useState } from 'react'
import {
  JsonEditor,
  type CustomComponentProps,
  type JsonData,
  type NodeData,
} from '@json-edit-react'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// "Letting users create your type": two custom node types in
// the Type selector, each with a cool default and the opposite
// editOnTypeSwitch setting. Edit any value, click the type
// icon, and pick one:
//
//   - Color — editOnTypeSwitch: true. Picking it OPENS the
//     editor seeded with the Hot Pink default, so you set the
//     colour straight away.
//   - Location — a "(lat, lng)" string shown as a map link,
//     editOnTypeSwitch: false. Picking it just DROPS the
//     default landmark (Everest) and closes — no editing step.
//
// Each defaultValue satisfies its condition, so the new node
// immediately renders as the custom type.

const initialData = {
  name: 'My favourite spot',
  location: '(-33.8568, 151.2153)', // Sydney Opera House
  colour: '#7c3aed',
  untyped: 'edit me, then change my type →',
}

const HEX = /^#[0-9a-f]{6}$/i

// A swatch + hex; a native colour picker while editing.
const ColorSwatch = ({
  value,
  isEditing,
  setIsEditing,
  setValue,
  onKeyDown,
  getStyles,
  nodeData,
}: CustomComponentProps) => {
  const hex = String(value)
  if (isEditing)
    return (
      <input
        type="color"
        autoFocus
        value={hex}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
      />
    )
  return (
    <span
      onDoubleClick={() => setIsEditing(true)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}
    >
      <span style={{ width: '1em', height: '1em', borderRadius: 3, background: hex }} />
      <span style={getStyles('string', nodeData)}>{hex}</span>
    </span>
  )
}

// A "(lat, lng)" string shown as a map link. Underlines on
// hover so it reads as a link.
const GeoPoint = ({ value, getStyles, nodeData }: CustomComponentProps) => {
  const [hover, setHover] = useState(false)
  const coords = String(value).replace(/[()]/g, '')
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${coords}`}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...getStyles('string', nodeData),
        cursor: 'pointer',
        textDecoration: hover ? 'underline' : 'none',
      }}
    >
      📍 {coords}
    </a>
  )
}

const customNodeDefinitions = [
  {
    condition: ({ value }: NodeData) => typeof value === 'string' && HEX.test(value),
    component: ColorSwatch,
    name: 'Colour', // NZ spelling for public facing value 🇳🇿️
    showInTypeSelector: true,
    showOnView: true,
    showOnEdit: true,
    // Opens for editing on creation, seeded with the default.
    editOnTypeSwitch: true,
    defaultValue: '#ff69B4', // Hot Pink
  },
  {
    condition: ({ value }: NodeData) =>
      typeof value === 'string' && /^\(-?\d+(\.\d+)?, ?-?\d+(\.\d+)?\)$/.test(value),
    component: GeoPoint,
    name: 'Location',
    showInTypeSelector: true,
    // Left false: creating one just commits the default and
    // closes — no editing step.
    editOnTypeSwitch: false,
    defaultValue: '(27.9881, 86.925)', // Everest summit
  },
]

export default function CreatingTypes() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="place"
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
