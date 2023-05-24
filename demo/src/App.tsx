import React from 'react'
import { JsonEditor, ThemeName, themes } from './json-edit-react/src'
// import { Jsonditor } from 'json-edit-react
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
import './style.css'

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
  const [rootName, setRootName] = useState('data')
  const [indent, setIndent] = useState(2)
  const [collapseLevel, setCollapseLevel] = useState(2)
  const [theme, setTheme] = useState<ThemeName>('default')
  const [allowEdit, setAllowEdit] = useState(true)
  const [allowDelete, setAllowDelete] = useState(true)
  const [allowAdd, setAllowAdd] = useState(true)
  const [allowCopy, setAllowCopy] = useState(true)
  const [sortKeys, setSortKeys] = useState(false)
  const [showIndices, setShowIndices] = useState(true)
  const [defaultNewValue, setDefaultNewValue] = useState('New data!')
  const toast = useToast()

  const [{ present: data }, { set: setData, reset, undo, redo, canUndo, canRedo }] =
    useUndo(initPrefs)

  return (
    <Flex m={2} align="flex-start" justify="space-evenly" wrap="wrap" gap={4}>
      <HStack w="100%">
        <VStack>
          <HStack>
            <Heading>json-edit-react</Heading>
            <Text>by @CarlosNZ</Text>
          </HStack>
          <Text>React component for editing or viewing JSON/object data (Docs)</Text>
        </VStack>
      </HStack>
      <VStack minW={400}>
        <Heading>Demo</Heading>
        <JsonEditor
          data={data}
          rootName={rootName}
          theme={[theme, { borderColor: 'transparent' }]}
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
          maxWidth={600}
          className="block-shadow"
        />
        <VStack w="100%" align="flex-end">
          <HStack w="100%" justify="space-between">
            <Button leftIcon={<ArrowBackIcon />} onClick={() => undo()} isDisabled={!canUndo}>
              Undo
            </Button>
            <Spacer />
            <Button rightIcon={<ArrowForwardIcon />} onClick={() => redo()} isDisabled={!canRedo}>
              Redo
            </Button>
          </HStack>
          <Button onClick={() => reset(initPrefs)}>Reset</Button>
        </VStack>
      </VStack>

      <VStack flexBasis={500}>
        <Heading textColor="jetBlack">Options</Heading>
        <VStack backgroundColor="#f6f6f6" borderRadius={10} className="block-shadow">
          <FormControl>
            <VStack align="flex-start" m={4}>
              <HStack className="inputRow">
                <FormLabel className="labelWidth" textAlign="right">
                  Theme
                </FormLabel>
                <div className="inputWidth" style={{ flexGrow: 1 }}>
                  <Select onChange={(e) => setTheme(e.target.value as ThemeName)} value={theme}>
                    {Object.entries(themes).map(([theme, { name }]) => (
                      <option value={theme} key={theme}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </div>
              </HStack>
              <HStack className="inputRow">
                <FormLabel className="labelWidth" textAlign="right">
                  Data root name
                </FormLabel>
                <Input
                  className="inputWidth"
                  type="text"
                  value={rootName}
                  onChange={(e) => setRootName(e.target.value)}
                />
              </HStack>
              <HStack className="inputRow">
                <FormLabel className="labelWidth" textAlign="right">
                  Collapse level
                </FormLabel>
                <NumberInput
                  className="inputWidth"
                  min={0}
                  value={collapseLevel}
                  onChange={(value) => setCollapseLevel(Number(value))}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </HStack>
              <HStack className="inputRow">
                <FormLabel className="labelWidth" textAlign="right">
                  Indent level
                </FormLabel>
                <NumberInput
                  className="inputWidth"
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
              </HStack>
              <CheckboxGroup colorScheme="green">
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Allow editing
                  </FormLabel>
                  <Checkbox
                    size="lg"
                    isChecked={allowEdit}
                    onChange={() => setAllowEdit(!allowEdit)}
                  />
                </HStack>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Allow deletion
                  </FormLabel>
                  <Checkbox
                    size="lg"
                    isChecked={allowDelete}
                    onChange={() => setAllowDelete(!allowDelete)}
                  />
                </HStack>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Allow Add
                  </FormLabel>
                  <Checkbox
                    size="lg"
                    isChecked={allowAdd}
                    onChange={() => setAllowAdd(!allowAdd)}
                  />
                </HStack>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Enable clipboard
                  </FormLabel>
                  <Checkbox
                    size="lg"
                    isChecked={allowCopy}
                    onChange={() => setAllowCopy(!allowCopy)}
                  />
                </HStack>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Sort Object keys
                  </FormLabel>
                  <Checkbox
                    size="lg"
                    isChecked={sortKeys}
                    onChange={() => setSortKeys(!sortKeys)}
                  />
                </HStack>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Show Array indices
                  </FormLabel>
                  <Checkbox
                    size="lg"
                    isChecked={showIndices}
                    onChange={() => setShowIndices(!showIndices)}
                  />
                </HStack>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Default new value
                  </FormLabel>
                  <Input
                    className="inputWidth"
                    type="text"
                    value={defaultNewValue}
                    onChange={(e) => setDefaultNewValue(e.target.value)}
                  />
                </HStack>
              </CheckboxGroup>
            </VStack>
          </FormControl>
        </VStack>
      </VStack>
    </Flex>
  )
}

export default App

export const truncate = (string: string, length = 200) =>
  string.length < length ? string : `${string.slice(0, length - 2).trim()}...`
