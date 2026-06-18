import { useState } from 'react'
import { JsonEditor, type FilterFunction, type TypeFilterFunction } from '@json-edit-react'
import { datePickerDefinition, hyperlinkDefinition } from '@json-edit-react/components'
import { byType, primitives } from '@json-edit-react/utils/filters'
import { initialData } from './data'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

export { initialData }

// A large, deeply-nested chunk of Star Wars data (scraped
// from https://swapi.info/), showing how filter functions
// shape what the editor will let you do:
//
//   - `allowEdit` / `allowDelete` are set to `primitives`,
//     so only leaf values (not whole objects/arrays) can
//     be edited or deleted.
//   - `allowAdd` is `byType('array')`, so the "+" control
//     only appears on arrays — you can extend a list but
//     not bolt new keys onto an object.
//   - `allowTypeSelection` returns curated enum lists for
//     a handful of keys (film titles and the various
//     `*_color` fields), so those values become a
//     restricted dropdown instead of free text.
//
// Two custom components also light up automatically: ISO
// date strings get a date-picker, and URL strings become
// active links.

// Leaf values only: no editing/deleting whole collections.
export const allowEdit: FilterFunction = primitives

export const allowDelete: FilterFunction = primitives

// New entries can only be added to arrays, not objects.
export const allowAdd: FilterFunction = byType('array')

// Offer curated enum type-options for a few well-known
// keys, and disallow type changes everywhere else.
export const allowTypeSelection: TypeFilterFunction = ({ key, path }) => {
  if (path.slice(-2)[0] === 'films' || (path.slice(-3)[0] === 'films' && key === 'title'))
    return [
      {
        enum: 'Film',
        values: [
          'A New Hope',
          'The Empire Strikes Back',
          'Return of the Jedi',
          'The Phantom Menace',
          'Attack of the Clones',
          'Revenge of the Sith',
          'The Force Awakens',
          'The Last Jedi',
          'The Rise of Skywalker',
        ],
        matchPriority: 1,
      },
    ]
  if (key === 'eye_color')
    return [
      {
        enum: 'Eye colour',
        values: [
          'blue',
          'brown',
          'green',
          'hazel',
          'red',
          'yellow',
          'black',
          'white',
          'orange',
          'pink',
          'purple',
          'grey',
          'gold',
          'unknown',
        ],
        matchPriority: 1,
      },
    ]
  if (key === 'hair_color')
    return [
      {
        enum: 'Hair colour',
        values: ['black', 'blond', 'brown', 'auburn', 'grey', 'white', 'unknown'],
        matchPriority: 1,
      },
    ]
  if (key === 'skin_color')
    return [
      {
        enum: 'Skin colour',
        values: [
          'fair',
          'brown',
          'dark',
          'gold',
          'white',
          'blue',
          'red',
          'yellow',
          'green',
          'pale',
          'metal',
          'orange',
          'grey',
          'mottled',
          'unknown',
        ],
        matchPriority: 1,
      },
    ]
  return false
}

// Date strings → date-picker, URL strings → active links.
export const customNodeDefinitions = [datePickerDefinition(), hyperlinkDefinition()]

export default function StarWars() {
  const [data, setData] = useState(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="Star Wars data"
      collapse={1}
      allowEdit={allowEdit}
      allowDelete={allowDelete}
      allowAdd={allowAdd}
      allowTypeSelection={allowTypeSelection}
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
