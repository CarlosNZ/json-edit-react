import { useState, type ReactNode } from 'react'
import {
  JsonEditor,
  type CustomComponentProps,
  type CustomNodeDefinition,
  type CustomWrapperProps,
  type JsonData,
} from '@json-edit-react'
import { useEditorDefaults } from '@example-resources'

// Custom COLLECTION nodes (objects/arrays) get two extra slots:
// `component` owns the CONTENTS (between the brackets) and
// `wrapperComponent` wraps the whole node (the outside). Add the
// `showCollectionWrapper` / `showKey` flags to drop the default
// chrome. This profile uses them at three levels of takeover:
//
//   - note   → `wrapperComponent` only. The node renders as
//     normal (chevron, brackets, rows) inside a callout frame —
//     the contents are untouched.
//   - skills → `component` only, brackets dropped. The default
//     child rows still arrive as `children`; we just re-wrap
//     them in a panel.
//   - profile → BOTH slots, with the brackets AND key off, so no
//     default chrome shows. The component ignores `children` and
//     builds its own UI from the data (`nodeData.value`) — an
//     avatar + field list; the wrapper adds the card and title.
//
// Takeaway: `component` is handed the rows as `children`,
// but can ignore them and render from `nodeData` instead (as
// profile does); a `wrapperComponent` always gets the whole
// node.
//
// Colours come from the theme via `getStyles`, and panels use
// a translucent overlay — so it all tracks the active theme.

const initialData = {
  profile: {
    name: 'Grace Hopper',
    title: 'Rear Admiral, US Navy',
    born: 1906,
  },
  skills: {
    COBOL: 'co-designed',
    compilers: 'pioneered',
    debugging: 'coined the term',
  },
  note: {
    tip: 'Taped a real moth into a logbook in 1947 — the original computer "bug".',
    year: 1947,
  },
}

// A faint neutral overlay: composites over the theme background,
// lifting the panel slightly on light and dark themes alike.
const PANEL = 'rgba(127, 127, 127, 0.08)'
const BORDER = 'rgba(127, 127, 127, 0.22)'

// Avatar initials from the object's `name` field, e.g. "GH".
const initials = (value: JsonData) => {
  const rec = (value ?? {}) as Record<string, unknown>
  const name = typeof rec.name === 'string' ? rec.name : ''
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// A small slot-name label, in the node's theme-derived accent.
const Eyebrow = ({ color, children }: { color: string; children: ReactNode }) => (
  <div
    style={{
      color,
      fontFamily: 'monospace',
      fontSize: '0.62em',
      fontWeight: 700,
      letterSpacing: '0.06em',
      opacity: 0.7,
      marginBottom: '0.25em',
    }}
  >
    {children}
  </div>
)

// `wrapperComponent` for the profile: the card frame, accent bar
// and title (from `nodeData.key`, since `showKey` is off).
// `children` is the component's output.
const ProfileCard = ({ children, getStyles, nodeData }: CustomWrapperProps) => {
  const accent = getStyles('number', nodeData).color ?? '#268bd2'
  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        overflow: 'hidden',
        margin: '0.4em 0',
      }}
    >
      <div style={{ height: 5, background: accent }} />
      <div style={{ padding: '0.5em 0.9em' }}>
        <Eyebrow color={accent}>wrapperComponent</Eyebrow>
        <div style={{ fontFamily: 'sans-serif', fontWeight: 700, textAlign: 'right' }}>
          {nodeData.key}
        </div>
        {children}
      </div>
    </div>
  )
}

// `component` for the profile: full takeover — it ignores
// `children` and renders its own avatar + field list straight
// from the node's data (`value`).
const ProfileContents = ({ value, getStyles, nodeData }: CustomComponentProps) => {
  const accent = getStyles('number', nodeData).color ?? '#268bd2'
  const cutout = getStyles('container', nodeData).backgroundColor ?? '#f6f6f6'
  const stringStyles = getStyles('string', nodeData)
  return (
    <div style={{ display: 'flex', gap: '0.8em', alignItems: 'flex-start' }}>
      <div
        style={{
          flex: '0 0 auto',
          width: '2.4em',
          height: '2.4em',
          borderRadius: '50%',
          background: accent,
          color: cutout,
          fontWeight: 700,
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '1em',
        }}
      >
        {initials(value)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow color={accent}>component</Eyebrow>
        {/* {children} */}
        <div
          style={{
            marginLeft: '2em',
            marginBottom: '1em',
            fontFamily: 'sans-serif',
            fontSize: '0.9em',
            lineHeight: 1.4,
          }}
        >
          <ul style={{ ...stringStyles }}>
            {Object.entries(value ?? {}).map(([field, val]) => (
              <li key={field}>
                <strong>{field}:</strong> {String(val)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// `component` only: re-wrap the default child rows (`children`)
// in a soft panel. `showCollectionWrapper: false` drops the
// brackets and chevron, but the key still shows.
const SkillPanel = ({ children, getStyles, nodeData }: CustomComponentProps) => {
  const accent = getStyles('boolean', nodeData).color ?? 'green'
  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: '0.3em 0.8em',
        margin: '0.2em 0 1em',
      }}
    >
      <Eyebrow color={accent}>component</Eyebrow>
      {children}
    </div>
  )
}

// `wrapperComponent` only: a callout frame; the node renders
// untouched inside it.
const Callout = ({ children, getStyles, nodeData }: CustomWrapperProps) => {
  const accent = getStyles('string', nodeData).color ?? '#cb4b16'
  return (
    <div
      style={{
        background: PANEL,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 8,
        padding: '0.4em 0.9em',
        margin: '0.4em 0',
      }}
    >
      <Eyebrow color={accent}>💡 wrapperComponent</Eyebrow>
      {children}
    </div>
  )
}

const customNodeDefinitions: CustomNodeDefinition[] = [
  // Both slots: card frame outside, avatar + fields inside.
  {
    condition: ({ key }) => key === 'profile',
    wrapperComponent: ProfileCard,
    component: ProfileContents,
    showCollectionWrapper: false,
    showKey: false,
  },
  // `component` only — wrap the contents in a soft panel.
  { condition: ({ key }) => key === 'skills', component: SkillPanel, showCollectionWrapper: false },
  // `wrapperComponent` only — a callout frame around the node.
  {
    condition: ({ key }) => key === 'note',
    wrapperComponent: Callout,
    // showCollectionWrapper: false,
  },
]

export default function CustomCollectionNodes() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="scientist"
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
