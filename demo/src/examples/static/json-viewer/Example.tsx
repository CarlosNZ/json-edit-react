import { useState } from 'react'
import { JsonViewer } from '@json-edit-react'
import { SearchBox, useEditorDefaults } from '@example-resources'
import { solarSystem } from './exampleHelpers'

// A rich, read-only document — the kind of reference data you
// browse but never edit. `JsonViewer` renders it with every edit
// affordance stripped: there are no edit / add / delete / drag
// controls anywhere in the tree, but you can still collapse and
// expand any branch, and copy a value (or its path).
export default function SolarSystemViewer() {
  // Read-only, but still searchable: wire a search box to
  // `searchText` (no filter set, so it matches values).
  const [searchText, setSearchText] = useState('')

  return (
    <div style={{ position: 'relative' }}>
      <SearchBox value={searchText} onChange={setSearchText} placeholder="Search" />
      <JsonViewer
        data={solarSystem}
        {...useEditorDefaults()}
        rootName="solarSystem"
        collapse={2}
        searchText={searchText}
        searchFilter="all"
      />
    </div>
  )
}
