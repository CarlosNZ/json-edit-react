import 'react-datepicker/dist/react-datepicker.css'

import React, { useEffect, useRef } from 'react'
import { JsonEditor, themes, ThemeName, Theme, FilterFunction } from './_imports'
import { FaNpm, FaExternalLinkAlt, FaGithub } from 'react-icons/fa'
import { BiReset } from 'react-icons/bi'
import { AiOutlineCloudUpload } from 'react-icons/ai'
import { useState } from 'react'
import useUndo from 'use-undo'
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Checkbox,
  Select,
  HStack,
  VStack,
  Link,
  Icon,
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
import logo from './image/logo_400.png'
import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { demoData } from './demoData'
import { useDatabase } from './useDatabase'
import './style.css'
import { version } from './version'
import { OnErrorFunction } from './json-edit-react/src/types'

function App() {
  const [selectedData, setSelectedData] = useState('intro')
  const [rootName, setRootName] = useState(demoData[selectedData].rootName ?? 'data')
  const [indent, setIndent] = useState(3)
  const [collapseLevel, setCollapseLevel] = useState(2)
  const [showCount, setShowCount] = useState<'Yes' | 'No' | 'When closed'>('When closed')
  const [theme, setTheme] = useState<ThemeName | Theme>('default')
  const [allowEdit, setAllowEdit] = useState(true)
  const [allowDelete, setAllowDelete] = useState(true)
  const [allowAdd, setAllowAdd] = useState(true)
  const [allowCopy, setAllowCopy] = useState(true)
  const [sortKeys, setSortKeys] = useState(false)
  const [showIndices, setShowIndices] = useState(true)
  const [showStringQuotes, setShowStringQuotes] = useState(true)
  const [defaultNewValue, setDefaultNewValue] = useState('New data!')
  const [isSaving, setIsSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const previousThemeName = useRef('') // Used when resetting after theme editing
  const toast = useToast()

  const { liveData, updateLiveData } = useDatabase()

  const [{ present: data }, { set: setData, reset, undo, redo, canUndo, canRedo }] = useUndo(
    demoData[selectedData].data
  )

  useEffect(() => {
    const rootName = demoData[selectedData].rootName
    if (rootName) setRootName(rootName ?? 'data')
    switch (selectedData) {
      case 'editTheme':
        return
      case 'liveData':
        setCollapseLevel(demoData.liveData.collapse as number)
        if (!liveData) reset({ 'Oops!': "We couldn't load this data, sorry " })
        else reset(liveData)
        return
      default:
        const newData = demoData[selectedData]
        if (newData.collapse) setCollapseLevel(newData.collapse)
        reset(newData.data)
    }
  }, [selectedData, reset])

  useEffect(() => {
    if (selectedData === 'editTheme') setTheme(data as Theme)
  }, [data])

  const restrictEdit: FilterFunction | boolean = (() => {
    const customRestrictor = demoData[selectedData]?.restrictEdit
    if (typeof customRestrictor === 'function')
      return (input) => !allowEdit || customRestrictor(input)
    if (customRestrictor !== undefined) return customRestrictor
    return !allowEdit
  })()

  const restrictDelete: FilterFunction | boolean = (() => {
    const customRestrictor = demoData[selectedData]?.restrictDelete
    if (typeof customRestrictor === 'function')
      return (input) => !allowDelete || customRestrictor(input)
    if (customRestrictor !== undefined) return customRestrictor
    return !allowDelete
  })()

  const restrictAdd: FilterFunction | boolean = (() => {
    const customRestrictor = demoData[selectedData]?.restrictAdd
    if (typeof customRestrictor === 'function')
      return (input) => !allowAdd || customRestrictor(input)
    if (customRestrictor !== undefined) return customRestrictor
    return !allowAdd
  })()

  const handleChangeData = (e) => {
    setSelectedData(e.target.value)
    setSearchText('')
    if (e.target.value === 'editTheme') {
      previousThemeName.current = theme as string
      setCollapseLevel(demoData.editTheme.collapse as number)
      reset(themes[theme as string])
    }
  }

  const handleThemeChange = (e) => {
    setTheme(e.target.value as ThemeName)
    if (selectedData === 'editTheme') {
      setData(themes[e.target.value])
      previousThemeName.current = e.target.value
    }
  }

  const handleReset = async () => {
    setSearchText('')
    switch (selectedData) {
      case 'editTheme':
        reset(themes[previousThemeName.current])
        setTheme(themes[previousThemeName.current])
        return
      case 'liveData':
        setIsSaving(true)
        await updateLiveData(data)
        setIsSaving(false)
        toast({
          title: 'Whoosh!',
          description: 'Data saved!',
          status: 'success',
          duration: 5000,
          isClosable: true,
        })
        console.log(liveData)
        reset(data)
        return
      default:
        reset(demoData[selectedData].data)
    }
  }

  return (
    <div className="App">
      <Flex
        px={8}
        pt={4}
        mb={-50}
        align="flex-start"
        justify="space-evenly"
        wrap="wrap"
        gap={4}
        minH="100%"
      >
        <HStack w="100%" justify="space-between" align="flex-start">
          <VStack align="flex-start" gap={3}>
            <HStack align="flex-end" mt={2} gap={4} flexWrap="wrap">
              <Flex gap={4} align="center">
                <img src={logo} alt="logo" style={{ maxHeight: '3.5em' }} />
                <Heading as="h1" size="3xl" variant="other">
                  json-edit-<span style={{ color: '#EA3788' }}>react</span>
                </Heading>
              </Flex>
              <Text pb={0.5} variant="primary">
                by{' '}
                <Link href="https://github.com/CarlosNZ" isExternal>
                  <strong>@CarlosNZ</strong>
                </Link>
              </Text>
            </HStack>
            <Heading variant="sub">
              A <span style={{ color: '#011C27' }}>React</span> component for editing or viewing
              JSON/object data •{' '}
              <Link
                href="https://github.com/CarlosNZ/json-edit-react#readme"
                isExternal
                color="accent"
              >
                Docs <Icon boxSize={4} as={FaExternalLinkAlt} />
              </Link>
            </Heading>
          </VStack>
          <Flex align="center" gap={5}>
            <a href="https://github.com/CarlosNZ/json-edit-react" target="_blank" rel="noreferrer">
              <Icon boxSize="2em" as={FaGithub} color="secondary" />
            </a>
            <a
              href="https://www.npmjs.com/package/json-edit-react"
              target="_blank"
              rel="noreferrer"
            >
              <Icon boxSize="3em" as={FaNpm} color="secondary" />
            </a>
          </Flex>
        </HStack>
        <VStack minW={400}>
          <Heading size="lg" variant="accent">
            Demo
          </Heading>
          <Box position="relative">
            <Input
              id="searchTextInput"
              placeholder={demoData[selectedData].searchPlaceholder ?? 'Search values'}
              bgColor={'#f6f6f6'}
              borderColor="gainsboro"
              borderRadius={50}
              size="sm"
              w={60}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              position="absolute"
              right={2}
              top={2}
              zIndex={100}
            />
            <JsonEditor
              data={data}
              rootName={rootName}
              theme={[
                theme,
                demoData[selectedData]?.styles ?? {},
                { container: { paddingTop: '1em' } },
              ]}
              indent={indent}
              onUpdate={async (nodeData) => {
                const demoOnUpdate = demoData[selectedData]?.onUpdate
                const result = demoOnUpdate
                  ? await demoOnUpdate(nodeData, toast as (options: unknown) => void)
                  : undefined
                const { newData } = nodeData
                if (result) return result
                else {
                  setData(newData)
                  if (selectedData === 'editTheme') setTheme(newData as ThemeName | Theme)
                }
              }}
              onEdit={
                demoData[selectedData]?.onEdit
                  ? (data) => {
                      const updateData = (demoData[selectedData] as any).onEdit(data)
                      if (updateData) setData(updateData)
                    }
                  : undefined
              }
              onAdd={
                demoData[selectedData]?.onAdd
                  ? (data) => {
                      const updateData = (demoData[selectedData] as any).onAdd(data)
                      if (updateData) setData(updateData)
                    }
                  : undefined
              }
              onError={
                demoData[selectedData].onError
                  ? (errorData) => {
                      const error = (demoData[selectedData].onError as OnErrorFunction)(errorData)
                      toast({
                        title: 'ERROR 😢',
                        description: error as any,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                      })
                    }
                  : undefined
              }
              showErrorMessages={demoData[selectedData].showErrorMessages}
              collapse={collapseLevel}
              showCollectionCount={
                showCount === 'Yes' ? true : showCount === 'When closed' ? 'when-closed' : false
              }
              enableClipboard={
                allowCopy
                  ? ({ stringValue, type }) =>
                      toast({
                        title: `${type === 'value' ? 'Value' : 'Path'} copied to clipboard:`,
                        description: truncate(String(stringValue)),
                        status: 'success',
                        duration: 5000,
                        isClosable: true,
                      })
                  : false
              }
              restrictEdit={restrictEdit}
              restrictDelete={restrictDelete}
              restrictAdd={restrictAdd}
              restrictTypeSelection={demoData[selectedData]?.restrictTypeSelection}
              restrictDrag={false}
              searchFilter={demoData[selectedData]?.searchFilter}
              searchText={searchText}
              keySort={sortKeys}
              defaultValue={demoData[selectedData]?.defaultValue ?? defaultNewValue}
              showArrayIndices={showIndices}
              showStringQuotes={showStringQuotes}
              minWidth={'min(500px, 95vw)'}
              maxWidth="min(670px, 90vw)"
              className="block-shadow"
              stringTruncate={90}
              customNodeDefinitions={demoData[selectedData]?.customNodeDefinitions}
              customText={demoData[selectedData]?.customTextDefinitions}
              onChange={demoData[selectedData]?.onChange ?? undefined}
            />
          </Box>
          <VStack w="100%" align="flex-end" gap={4}>
            <HStack w="100%" justify="space-between" mt={4}>
              <Button
                colorScheme="primaryScheme"
                leftIcon={<ArrowBackIcon />}
                onClick={() => undo()}
                // visibility={canUndo ? 'visible' : 'hidden'}
                isDisabled={!canUndo}
              >
                Undo
              </Button>
              <Spacer />
              <Button
                colorScheme="primaryScheme"
                rightIcon={<ArrowForwardIcon />}
                onClick={() => redo()}
                isDisabled={!canRedo}
              >
                Redo
              </Button>
            </HStack>
            <HStack justify="space-between" w="100%">
              <Text maxW={400} fontSize="md">
                Undo/Redo functionality can be incorporated by using an additional hook, such as{' '}
                <Link href="https://github.com/homerchen19/use-undo" isExternal>
                  use-undo
                </Link>
              </Text>
              <Button
                colorScheme="accentScheme"
                leftIcon={selectedData === 'liveData' ? <AiOutlineCloudUpload /> : <BiReset />}
                variant="outline"
                onClick={handleReset}
                visibility={canUndo ? 'visible' : 'hidden'}
                isLoading={isSaving}
              >
                {selectedData === 'liveData' ? 'Push to the cloud' : 'Reset'}
              </Button>
            </HStack>
          </VStack>
        </VStack>
        <VStack flexBasis={500}>
          <Heading size="lg" variant="accent">
            Options
          </Heading>
          <VStack backgroundColor="#f6f6f6" borderRadius={10} className="block-shadow">
            <FormControl>
              <VStack align="flex-start" m={4}>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Demo data
                  </FormLabel>
                  <div className="inputWidth" style={{ flexGrow: 1 }}>
                    <Select id="dataSelect" onChange={handleChangeData} value={selectedData}>
                      {Object.entries(demoData).map(([key, { name }]) => (
                        <option value={key} key={key}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </HStack>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Theme
                  </FormLabel>
                  <div className="inputWidth" style={{ flexGrow: 1 }}>
                    <Select id="themeSelect" onChange={handleThemeChange} value={theme}>
                      {(Object.entries(themes) as [ThemeName, Theme][]).map(
                        ([theme, { displayName }]) => (
                          <option value={theme} key={theme}>
                            {displayName}
                          </option>
                        )
                      )}
                    </Select>
                  </div>
                </HStack>
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Data root name
                  </FormLabel>
                  <Input
                    id="dataNameInput"
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
                    id="collapseInput"
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
                    id="indentInput"
                    className="inputWidth"
                    max={12}
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
                <HStack className="inputRow">
                  <FormLabel className="labelWidth" textAlign="right">
                    Show counts
                  </FormLabel>
                  <div className="inputWidth" style={{ flexGrow: 1 }}>
                    <Select
                      id="showCountSelect"
                      onChange={(e) => setShowCount(e.target.value as 'Yes' | 'No' | 'When closed')}
                      value={showCount}
                    >
                      <option value="Yes" key={0}>
                        Yes
                      </option>
                      <option value="No" key={1}>
                        No
                      </option>
                      <option value="When closed" key={2}>
                        When closed
                      </option>
                    </Select>
                  </div>
                </HStack>
                <CheckboxGroup colorScheme="primaryScheme">
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="allowEditCheckbox"
                      isChecked={allowEdit}
                      disabled={demoData[selectedData].restrictEdit !== undefined}
                      onChange={() => setAllowEdit(!allowEdit)}
                      w="50%"
                    >
                      Allow Edit
                    </Checkbox>
                    <Checkbox
                      id="allowDeleteCheckbox"
                      isChecked={allowDelete}
                      disabled={demoData[selectedData].restrictDelete !== undefined}
                      onChange={() => setAllowDelete(!allowDelete)}
                      w="50%"
                    >
                      Allow Delete
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="allowAddCheckbox"
                      isChecked={allowAdd}
                      disabled={demoData[selectedData].restrictAdd !== undefined}
                      onChange={() => setAllowAdd(!allowAdd)}
                      w="50%"
                    >
                      Allow Add
                    </Checkbox>
                    <Checkbox
                      id="allowCopyCheckbox"
                      isChecked={allowCopy}
                      onChange={() => setAllowCopy(!allowCopy)}
                      w="50%"
                    >
                      Enable clipboard
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="showStringQuotesCheckbox"
                      isChecked={showStringQuotes}
                      onChange={() => setShowStringQuotes(!showStringQuotes)}
                      w="50%"
                    >
                      Show String quotes
                    </Checkbox>
                    <Checkbox
                      id="showIndicesCheckbox"
                      isChecked={showIndices}
                      onChange={() => setShowIndices(!showIndices)}
                      w="50%"
                    >
                      Show Array indices
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="sortKeysCheckbox"
                      isChecked={sortKeys}
                      onChange={() => setSortKeys(!sortKeys)}
                      w="50%"
                    >
                      Sort Object keys
                    </Checkbox>
                  </Flex>
                  <HStack className="inputRow" pt={2}>
                    <FormLabel className="labelWidth" textAlign="right">
                      Default new value
                    </FormLabel>
                    <Input
                      className="inputWidth"
                      disabled={demoData[selectedData].defaultValue !== undefined}
                      type="text"
                      value={defaultNewValue}
                      onChange={(e) => setDefaultNewValue(e.target.value)}
                    />
                  </HStack>
                </CheckboxGroup>
              </VStack>
            </FormControl>
          </VStack>
          <Box maxW={350} pt={4}>
            {demoData[selectedData].description}
          </Box>
        </VStack>
      </Flex>
      <Box h={50} />
      <footer>
        <Text fontSize="sm">{`json-edit-react v${version}`}</Text>
      </footer>
    </div>
  )
}

export default App

export const truncate = (string: string, length = 200) =>
  string.length < length ? string : `${string.slice(0, length - 2).trim()}...`
