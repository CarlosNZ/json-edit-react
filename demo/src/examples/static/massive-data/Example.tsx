import { useEffect, useState } from 'react'
import { JsonEditor, type JsonData } from '@json-edit-react'
import { SearchBox, useEditorDefaults } from '@example-resources'

export default function MassiveDataSet() {
  const props = useEditorDefaults()
  const [data, setData] = useState<JsonData | null>(null)
  // A search box filters the loaded data set on value.
  const [searchText, setSearchText] = useState('')

  // Pull the ~900 KB data set in only once this example mounts.
  // The dynamic `import()` splits it into its own chunk, so it
  // never weighs down the initial bundle — it's fetched on
  // demand, behind the loading state below. A Vite plugin parses
  // the `.json5` to a plain object at build time.
  useEffect(() => {
    let cancelled = false
    import('@test-data/medium-test-data.json5').then(({ default: loaded }) => {
      if (!cancelled) setData(loaded as JsonData)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) return <p style={{ padding: '1em', opacity: 0.7 }}>Loading data set…</p>

  return (
    <div style={{ position: 'relative' }}>
      <SearchBox value={searchText} onChange={setSearchText} placeholder="Search" />
      <JsonEditor
        data={data}
        setData={setData}
        {...props}
        rootName="world"
        // ~19,000 nodes: collapse everything past the top
        // level so the first render stays cheap (collapsed
        // branches don't render their children). Expand into
        // any branch to explore.
        collapse={1}
        searchText={searchText}
      />
    </div>
  )
}
