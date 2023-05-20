import React from 'react'
import { JsonEditor } from './fig-tree-editor/src'
// import { Jsonditor } from 'fig-tree-editor'
import { useState } from 'react'
import useUndo from 'use-undo'
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
  CheckboxGroup,
  Spacer,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
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
  // const [data, setData] = useState<object>(initPrefs)
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
  const toast = useToast()

  const [{ present: data }, { set: setData, reset, undo, redo, canUndo, canRedo }] =
    useUndo(initPrefs)

  return (
    <Flex m={2} align="flex-start" justify="center" wrap="wrap">
      <VStack minW={400}>
        <Heading>JSON Editor</Heading>
        <JsonEditor
          data={data}
          rootName={rootName}
          indent={indent}
          onUpdate={({ newData }) => {
            setData(newData as any)
          }}
          collapse={collapseLevel}
          enableClipboard={
            allowCopy
              ? ({ value, type }) =>
                  toast({
                    title: `${type === 'value' ? 'Value' : 'Path'} copied to clipboard:`,
                    description: truncate(String(value)),
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                  })
              : false
          }
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
            <Button leftIcon={<ArrowBackIcon />} onClick={() => undo()} disabled={!canUndo}>
              Undo
            </Button>
            <Spacer />
            <Button rightIcon={<ArrowForwardIcon />} onClick={() => redo()} disabled={!canRedo}>
              Redo
            </Button>
          </HStack>
          <Button>Reset</Button>
        </VStack>
      </VStack>
      <VStack minW={400}>
        <Heading>Options</Heading>
        <FormControl>
          <CheckboxGroup colorScheme="green" defaultValue={['naruto', 'kakashi']}>
            <VStack align="flex-start" m={4}>
              <FormLabel>Data root name</FormLabel>
              <Input type="text" value={rootName} onChange={(e) => setRootName(e.target.value)} />
              <FormLabel>Indent level</FormLabel>
              <NumberInput
                max={8}
                min={0}
                value={indent}
                onChange={(value) => setIndent(Number(value))}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Checkbox isChecked={allowEdit} onChange={() => setAllowEdit(!allowEdit)}>
                Allow Editing
              </Checkbox>
              <Checkbox isChecked={allowDelete} onChange={() => setAllowDelete(!allowDelete)}>
                Allow Deletion
              </Checkbox>
              <Checkbox isChecked={allowAdd} onChange={() => setAllowAdd(!allowAdd)}>
                Allow Add
              </Checkbox>
              <Checkbox isChecked={allowCopy} onChange={() => setAllowCopy(!allowCopy)}>
                Enable clipboard
              </Checkbox>
              <Checkbox isChecked={sortKeys} onChange={() => setSortKeys(!sortKeys)}>
                Sort Object keys
              </Checkbox>
              <Checkbox isChecked={showIndices} onChange={() => setShowIndices(!showIndices)}>
                Show Array indices
              </Checkbox>
              <FormLabel>Default new value</FormLabel>
              <Input
                type="text"
                value={defaultNewValue}
                onChange={(e) => setDefaultNewValue(e.target.value)}
              />
              <FormLabel>Indent level</FormLabel>
            </VStack>
          </CheckboxGroup>
        </FormControl>
      </VStack>
    </Flex>
  )
}

export default App

export const truncate = (string: string, length = 200) =>
  string.length < length ? string : `${string.slice(0, length - 2).trim()}...`
