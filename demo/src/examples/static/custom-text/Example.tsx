import { useState } from 'react'
import {
  JsonEditor,
  type CustomTextDefinitions,
  type CustomTextFunction,
  type DefaultValueFunction,
  type FilterFunction,
  type JsonData,
} from '@json-edit-react'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// `customText` overrides the editor's localisable strings with
// FUNCTIONS of the node, so the displayed text adapts to each
// node's content, depth and size. This music library combines
// three techniques:
//
//   - aggregate counts: an album's "N items" becomes
//     "9 tracks · 47 min" (summed from the data); a genre's
//     becomes "2 albums · 16 min"
//   - empty states: an empty album / genre reads "No tracks
//     yet" / "No albums yet" instead of "0 items"
//   - context-aware prompts: the add-a-key placeholder is
//     "Name a new genre…" at the root, "New album title…"
//     inside a genre
//
// Edit a track's length, or add / remove whole songs, and
// every summary recomputes live. A few edit rules keep each
// song shaped { title, seconds } so the maths never hits a NaN.

interface Track {
  title: string
  seconds: number
}

const initialData = {
  Rock: {
    'Abbey Road': [
      { title: 'Come Together', seconds: 259 },
      { title: 'Something', seconds: 182 },
      { title: 'Oh! Darling', seconds: 206 },
    ],
    Revolver: [
      { title: 'Taxman', seconds: 159 },
      { title: 'Eleanor Rigby', seconds: 128 },
    ],
  },
  Jazz: {
    'Kind of Blue': [
      { title: 'So What', seconds: 545 },
      { title: 'Freddie Freeloader', seconds: 586 },
      { title: 'Blue in Green', seconds: 337 },
    ],
  },
  Unsorted: {},
}

const formatDuration = (seconds: number) => {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const sumSeconds = (tracks: Track[]) =>
  tracks.reduce((total, track) => total + track.seconds, 0)

// Drives ITEM_SINGLE + ITEMS_MULTIPLE: the item count becomes a
// summary of what the node holds.
const summary: CustomTextFunction = ({ value, size, level }) => {
  // Album = an array of tracks → count + total running time.
  if (Array.isArray(value)) {
    if (size === 0) return 'No tracks yet'
    const time = formatDuration(sumSeconds(value as Track[]))
    return `${size} ${size === 1 ? 'track' : 'tracks'} · ${time}`
  }
  // Genre (level 1) = an object of albums → count + total time.
  if (level === 1) {
    if (size === 0) return 'No albums yet'
    const albums = Object.values(value as Record<string, Track[]>)
    const time = formatDuration(albums.reduce((s, a) => s + sumSeconds(a), 0))
    return `${size} ${size === 1 ? 'album' : 'albums'} · ${time}`
  }
  // Library root (level 0) = the genres.
  if (level === 0) return `${size} ${size === 1 ? 'genre' : 'genres'}`
  // Tracks (deeper objects) keep the default "n items".
  return null
}

// Drives KEY_NEW: the add-a-key placeholder depends on which
// collection you're adding to.
const newKeyPrompt: CustomTextFunction = ({ level }) => {
  if (level === 0) return 'Name a new genre…'
  if (level === 1) return 'New album title…'
  return null
}

const customText: CustomTextDefinitions = {
  ITEM_SINGLE: summary,
  ITEMS_MULTIPLE: summary,
  KEY_NEW: newKeyPrompt,
}

// Seed sensible empty containers so a new genre / album / track
// is the right shape (and shows its empty-state immediately).
const defaultValue: DefaultValueFunction = ({ level }) => {
  if (level === 0) return {} // a new genre
  if (level === 1) return [] // a new album
  if (level === 2) return { title: 'New track', seconds: 0 }
  return ''
}

// --- Editing protection -------------------------------------
// Keep every song shaped { title, seconds } so the duration
// maths never sees a missing (NaN) value.

const isCollection = (value: unknown) => value !== null && typeof value === 'object'

// Edit leaf values only — no "Edit as JSON" on collections.
const allowEdit: FilterFunction = ({ value }) => !isCollection(value)

// Add whole genres / albums / songs, but not new fields inside
// a song (a track object sits at level 3).
const allowAdd: FilterFunction = ({ level }) => level !== 3

// Delete a whole genre / album / song, but not a song's own
// `title` / `seconds` (its fields sit at level 4).
const allowDelete: FilterFunction = ({ level }) => level !== 4

// Initial expansion: empty collections start closed; otherwise
// only nodes deeper than level 2 collapse — so genres and
// albums stay open and each song folds up inside its album.
const startCollapsed: FilterFunction = ({ level, size }) =>
  size === 0 ? true : level > 2

export default function CustomText() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="library"
      collapse={startCollapsed}
      showCollectionCount
      customText={customText}
      defaultValue={defaultValue}
      allowEdit={allowEdit}
      allowAdd={allowAdd}
      allowDelete={allowDelete}
      allowTypeSelection={false}
      arrayIndexStart={1}
    />
  )
}
