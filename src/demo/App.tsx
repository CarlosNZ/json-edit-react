import './App.css'
import JsonEditor from '../fig-tree-editor'
import { useState } from 'react'

const initData = {
  name: 'My Name',
  age: 45,
  children: [
    { name: 'Leo', age: 12 },
    { name: 'Hugo', age: 9 },
    { name: 'Bodhi', age: 5 },
  ],
}

const initData2 = {
  one: 1,
  two: 'TWO',
  three: true,
  four: null,
  five: 6.5,
  six: 10,
  seven: [1, 'string', false, ['a', 'b']],
  eight: {
    one: 'ONE',
    two: [1, 'string', false, ['a', 'b']],
    three: { a: 'A', b: 'B' },
    four: () => true,
  },
  nine: undefined,
}

const initBasic = {
  firstName: 'Carl',
  lastName: 'Smith',
  likes: 'Ice Cream',
  nested: { a: 'A ONE', b: 'two' },
}

function App() {
  const [data, setData] = useState<object>(initBasic)
  // console.log('outer data', data)
  return (
    <div className="App">
      <JsonEditor data={data} rootName="My Root" onUpdate={({ newData }) => false} />
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
    </div>
  )
}

export default App
