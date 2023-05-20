import React from 'react'
import { JsonEditor } from './fig-tree-editor/src'
// import { Jsonditor } from 'fig-tree-editor'
import { useState } from 'react'
import {
  Box,
  Center,
  Flex,
  Heading,
  Text,
  Button,
  Checkbox,
  Select,
  Textarea,
  Spinner,
  HStack,
  VStack,
  Link,
  Image,
  Spacer,
} from '@chakra-ui/react'
import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'

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
  const [data, setData] = useState<object>(initPrefs)
  const [rootName, setRootName] = useState('data')
  const [indent, setIndent] = useState(2)
  const [collapseLevel, setCollapseLevel] = useState(2)
  const [theme, setTheme] = useState('default')
  const [allowEdit, setAllowEdit] = useState(true)
  const [allowDelete, setAllowDelete] = useState(true)
  const [allowAdd, setAllowAdd] = useState(true)
  const [allowCopy, setAllowCopy] = useState(true)
  const [sortKeys, setSortKeys] = useState(false)
  const [showIndices, setShowIndices] = useState(true)
  const [defaultNewValue, setDefaultNewValue] = useState('Some new data')

  return (
    <Flex m={2} align="flex-start" justify="center" wrap="wrap">
      <VStack minW={400}>
        <Heading>JSON Editor</Heading>
        <JsonEditor
          data={data}
          rootName={rootName}
          // onEdit={({ newValue }) => console.log('NEW VALUE', newValue)}
          // onUpdate={({ newData }) => {
          // return 'Cannot update!'
          //   setData(newData)
          // }}
          // onDelete={({ currentValue, newValue }) => {
          //   console.log('Data', currentValue, newValue)
          //   return false
          // }}
          collapse={collapseLevel}
          enableClipboard={allowCopy}
          // enableClipboard={({ value, path, key }) => {
          //   console.log(value)
          //   console.log('Path', path)
          //   console.log('key', key)
          // }}
          restrictEdit={!allowEdit}
          restrictDelete={!allowDelete}
          restrictAdd={!allowAdd}
          keySort={sortKeys}
          defaultValue={defaultNewValue}
          showArrayIndices={showIndices}
          // theme={{ stringColor: 'red' }}
        />
        <VStack w="100%" align="flex-end">
          <HStack w="100%" justify="space-between">
            <Button leftIcon={<ArrowBackIcon />}>Undo</Button>
            <Spacer />
            <Button rightIcon={<ArrowForwardIcon />}>Redo</Button>
          </HStack>
          <Button>Reset</Button>
        </VStack>
      </VStack>
      <VStack minW={400}>
        <Heading>Options</Heading>
      </VStack>
    </Flex>
  )
}

export default App
