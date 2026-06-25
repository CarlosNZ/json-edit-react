import { useState } from 'react'
import {
  JsonEditor,
  type CustomComponentProps,
  type CustomNodeDefinition,
  type JsonData,
} from '@json-edit-react'
import { byPath } from '@json-edit-react/utils/filters'
import { useEditorDefaults } from '@example-resources'

// A custom COLLECTION node that owns its own editor (`showOnEdit:
// true`) keeps the live child rows as its `children` while editing
// — exactly as in view — instead of being handed the built-in
// JSON textarea. So it can put an editable header/toolbar ABOVE
// the rows and keep them visible and interactive the whole time.
//
// Here `tracks` is the custom node. Its header shows the track
// count and total runtime; clicking "Reorder…" opens the node's
// own edit session, swapping the header for a toolbar (Shuffle /
// Sort / Reverse). Each action commits a reordered array through
// `setValue` — no special editor prop is needed.
//
// While that toolbar is open the track rows stay fully editable:
// edit a track's title or seconds inline, and (because there's a
// single active edit session) doing so just displaces the header's
// session. `showCollectionWrapper: false` drops the array's
// brackets/chevron so the header stands in for them.
//
// Editing is constrained with the filter-function toolkit
// (`@json-edit-react/utils/filters`): `byPath('tracks.*')` matches
// whole track items (not their fields, the playlist title, or the
// array itself), so only whole tracks can be deleted and dragged.
// Type changes are off entirely. The header's "Add track" button
// (view mode) appends a new track via `setValue`.

interface Track {
  title: string
  artist: string
  seconds: number
}

const initialData = {
  title: 'Focus Flow',
  tracks: [
    { title: 'Clair de Lune', artist: 'Debussy', seconds: 312 },
    { title: 'Gymnopédie No. 1', artist: 'Satie', seconds: 210 },
    { title: 'Spiegel im Spiegel', artist: 'Pärt', seconds: 540 },
  ],
}

// A faint neutral overlay that composites over any theme.
const PANEL = 'rgba(127, 127, 127, 0.08)'
const BORDER = 'rgba(127, 127, 127, 0.22)'

const formatDuration = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

// Fisher–Yates; runs in the browser, so Math.random is fine.
const shuffle = (tracks: Track[]) => {
  const next = [...tracks]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

const TrackList = ({
  value,
  children,
  isEditing,
  setIsEditing,
  setValue,
  handleCancel,
  getStyles,
  nodeData,
}: CustomComponentProps) => {
  const tracks = (value ?? []) as unknown as Track[]
  const accent = getStyles('number', nodeData).color ?? '#268bd2'
  const total = formatDuration(
    tracks.reduce((sum, track) => sum + (Number(track?.seconds) || 0), 0)
  )

  // Commit a reordered list; this closes the session, so each
  // action is one-shot (re-open "Reorder…" to run another).
  const reorder = (next: Track[]) => setValue(next as unknown as JsonData)

  // Append a fresh track to the end of the list.
  const addTrack = () =>
    setValue([...tracks, { title: 'New track', artist: '', seconds: 0 }] as unknown as JsonData)

  const button = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '0.15em 0.6em',
    fontSize: '0.8em',
    cursor: 'pointer',
    color: 'inherit',
  }

  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: '0.5em 0.8em',
        margin: '0.3em 0 0.8em',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6em',
          marginBottom: '0.4em',
        }}
      >
        <span style={{ fontFamily: 'sans-serif', fontWeight: 700, color: accent }}>
          🎵 {tracks.length} tracks · {total}
        </span>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '0.4em' }}>
            <button style={button} onClick={() => reorder(shuffle(tracks))}>
              Shuffle
            </button>
            <button
              style={button}
              onClick={() => reorder([...tracks].sort((a, b) => a.seconds - b.seconds))}
            >
              Sort by length
            </button>
            <button style={button} onClick={() => reorder([...tracks].reverse())}>
              Reverse
            </button>
            <button style={{ ...button, fontWeight: 700 }} onClick={handleCancel}>
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.4em' }}>
            <button style={button} onClick={addTrack}>
              + Add track
            </button>
            <button style={button} onClick={() => setIsEditing(true)}>
              Reorder…
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// A whole track item — a direct child of the `tracks` array. `*`
// matches one path segment, so this excludes the track's own
// fields (`tracks.0.title`), the playlist title, and the array
// itself. Used for both the delete and drag restrictions.
const isTrackItem = byPath('tracks.*')

const customNodeDefinitions: CustomNodeDefinition[] = [
  {
    condition: ({ key }) => key === 'tracks',
    component: TrackList,
    showOnView: true,
    showOnEdit: true, // the node owns its editor (header + live rows)
    showCollectionWrapper: false, // drop the array's brackets/chevron
  },
]

export default function Playlist() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useEditorDefaults()}
      rootName="playlist"
      customNodeDefinitions={customNodeDefinitions}
      allowDelete={isTrackItem} // only whole tracks
      allowDrag={isTrackItem} // drag whole tracks to reorder
      allowTypeSelection={false} // no type changes anywhere
    />
  )
}
