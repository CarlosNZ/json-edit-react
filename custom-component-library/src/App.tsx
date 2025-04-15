import { LinkCustomNodeDefinition, DateObjectDefinition } from '@components'
import { testData } from '@components/data'
import { JsonEditor } from 'json-edit-react'

function App() {
  return (
    <div id="container">
      <h1>json-edit-react</h1>
      <h2>Custom component library</h2>
      <JsonEditor
        data={{ testData }}
        customNodeDefinitions={[LinkCustomNodeDefinition, DateObjectDefinition]}
      />
    </div>
  )
}

export default App
