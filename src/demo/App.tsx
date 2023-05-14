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
  anArray: [1, 2, 3],
  age: 99,
  nested: { a: 'A ONE', b: true },
  oneMore: false,
  Nothing: null,
  function: () => true,
}

const initPrefs = {
  server: {
    isItTrue: true,
    thumbnailMaxWidth: 300,
    thumbnailMaxHeight: 300,
    hoursSchedule: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    ],
    SMTPConfig: {
      host: 'server.msupply.foundation',
      port: 465,
      secure: true,
      user: 'irims-dev@sussol.net',
      defaultFromName: 'Conforma',
      defaultFromEmail: 'no-reply@msupply.foundation',
    },
    backupFilePrefix: 'conforma_fiji_backup',
    backupSchedule: [15],
    maxBackupDurationDays: null,
    testingEmail: 'fergusroachenz@gmail.com',
  },
  web: {
    paginationPresets: [2, 5, 10, 20, 50],
    defaultLanguageCode: 'en_fiji',
    googleAnalyticsId: 'G-8RQHL40GLG',
    siteHost: 'conforma-demo.msupply.org:50006',
    arrayWithObjects: [
      { one: 1, two: 'second' },
      { one: 99, two: 'third' },
    ],
  },
}

function App() {
  const [data, setData] = useState<object>({
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
  })
  // console.log('outer data', data)
  return (
    <div className="App">
      <JsonEditor
        data={data}
        rootName="preferences"
        // onEdit={({ newValue }) => console.log('NEW VALUE', newValue)}
        onUpdate={({ newData }) => {
          // return 'Cannot update!'
          setData(newData)
        }}
        // onDelete={({ currentValue, newValue }) => {
        //   console.log('Data', currentValue, newValue)
        //   return false
        // }}
        collapse={2}
        // enableClipboard={({ value, path, key }) => {
        //   console.log(value)
        //   console.log('Path', path)
        //   console.log('key', key)
        // }}
        restrictEdit={({ key }) => key === 'server'}
        // restrictDelete={({ value }) => {
        //   return value === null
        // }}
        // keySort={true}
        defaultValue={'New'}
        // maxWidth="300px"
        // minWidth="unset"
      />
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
    </div>
  )
}

export default App
