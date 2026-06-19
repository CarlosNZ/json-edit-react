import { useEffect, useState } from 'react'
import {
  JsonEditor,
  type CustomComponentProps,
  type JsonData,
  type NodeData,
} from '@json-edit-react'
import { colorPickerDefinition } from '@json-edit-react/components'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Four custom components on one product card, each at a
// different point on the view/edit spectrum — controlled by
// three flags: showOnView, showOnEdit, and showEditTools.
//
//   - brightness → a meter bar. The default custom node:
//     shown in view, edits via the standard number input.
//   - warmth → a Kelvin slider. Edit-only — the raw number
//     shows in view, the slider appears only on edit.
//   - rating → click-to-set stars. One interface: commits on
//     click, never opens an edit session (so showEditTools is
//     off and showOnEdit goes unused).
//   - accent → the pre-built ColorPicker, custom in BOTH modes
//     (swatch in view, wheel on edit); tools off, so a
//     double-click on the swatch starts editing.

const initialData = {
  name: 'Aurora Desk Lamp',
  brightness: 72,
  warmth: 2700,
  rating: 4,
  accent: '#e8a13c',
}

// --- Three bespoke components ---------------------------------

// (1) Display-only. A meter bar drawn from a 0–100 number.
const MeterBar = ({
  value,
  canEdit,
  setIsEditing,
  handleEdit,
  getStyles,
  nodeData,
}: CustomComponentProps) => {
  const num = Number(value) || 0
  const pct = Math.max(0, Math.min(100, num))
  // brightness is display-only: its edit runs through the
  // standard number editor, not this component, so there's no
  // commit to intercept. Instead we heal the value — if a
  // committed brightness lands outside 0–100, snap it back.
  // All inside the definition, no onUpdate / onChange.
  useEffect(() => {
    if (pct !== num) handleEdit(pct)
  }, [num, pct, handleEdit])
  return (
    <div
      onDoubleClick={() => canEdit && setIsEditing(true)}
      title={canEdit ? 'Double-click to edit' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6em',
        cursor: canEdit ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: 140,
          height: 12,
          borderRadius: 6,
          background: 'rgba(127, 127, 127, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #fbbf24, #f97316)',
          }}
        />
      </div>
      <span style={{ ...getStyles('number', nodeData), fontVariantNumeric: 'tabular-nums' }}>
        {pct}%
      </span>
    </div>
  )
}

// Warm (2700K) → cool (6500K), so the slider's accent reflects
// the colour temperature it's setting.
const kelvinToColor = (k: number) => {
  const t = Math.max(0, Math.min(1, (k - 2700) / (6500 - 2700)))
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${mix(255, 158)}, ${mix(140, 197)}, ${mix(66, 255)})`
}

// (2) Edit-only. A slider that only appears while editing.
const WarmthSlider = ({ value, setValue, onKeyDown, getStyles, nodeData }: CustomComponentProps) => {
  const kelvin = Number(value) || 2700
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em' }}>
      <input
        type="range"
        min={2700}
        max={6500}
        step={100}
        value={kelvin}
        autoFocus
        onChange={(e) => setValue(Number(e.target.value))}
        onKeyDown={onKeyDown}
        style={{ accentColor: kelvinToColor(kelvin) }}
      />
      <span style={{ ...getStyles('number', nodeData), fontVariantNumeric: 'tabular-nums' }}>
        {kelvin}K
      </span>
    </div>
  )
}

// (3) One interface. Clicking a star commits immediately.
const StarRating = ({ value, canEdit, handleEdit }: CustomComponentProps) => {
  const rating = Number(value) || 0
  const [hover, setHover] = useState(0)
  const [pulse, setPulse] = useState(0)
  const active = hover || rating
  return (
    <span style={{ display: 'inline-flex', gap: '0.1em', fontSize: '2.2em', lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => {
            if (!canEdit) return
            handleEdit(n)
            // brief pop so a click registers even mid-hover
            setPulse(n)
            setTimeout(() => setPulse(0), 150)
          }}
          onMouseEnter={() => canEdit && setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            cursor: canEdit ? 'pointer' : 'default',
            color: n <= active ? '#f5b301' : 'rgba(127, 127, 127, 0.35)',
            transform: pulse === n ? 'scale(1.4)' : 'scale(1)',
            transition: 'transform 150ms ease-out',
          }}
        >
          ★
        </span>
      ))}
    </span>
  )
}

const customNodeDefinitions = [
  // (1) Display-only. A custom component renders in VIEW by
  // default, falling back to the standard editor on edit — no
  // flags needed (showOnView: true, showOnEdit: false).
  {
    condition: ({ key }: NodeData) => key === 'brightness',
    component: MeterBar,
  },
  // (2) Edit-only: hide the view so the raw number shows
  // through, and render the slider only while editing.
  {
    condition: ({ key }: NodeData) => key === 'warmth',
    component: WarmthSlider,
    showOnView: false,
    showOnEdit: true,
  },
  // (3) One interface: the stars commit on click (handleEdit),
  // so the node never enters edit mode — showOnEdit goes unused
  // and the hover tools are switched off.
  {
    condition: ({ key }: NodeData) => key === 'rating',
    component: StarRating,
    showEditTools: false,
  },
  // (4) Custom in BOTH modes: the pre-built ColorPicker shows a
  // swatch in view, a wheel on edit. Tools off — double-click
  // the swatch to start editing.
  colorPickerDefinition({
    condition: ({ key }) => key === 'accent',
    showEditTools: false,
  }),
]

export default function DisplayVsEdit() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="product"
      customNodeDefinitions={customNodeDefinitions}
      allowDelete={false}
      allowTypeSelection={false}
    />
  )
}
