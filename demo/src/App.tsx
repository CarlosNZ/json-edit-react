import React, { useEffect, useRef } from 'react'
import { useSearch, useLocation } from 'wouter'
import JSON5 from 'json5'
import 'react-datepicker/dist/react-datepicker.css'
import {
  JsonEditor,
  themes,
  ThemeName,
  Theme,
  FilterFunction,
  JsonData,
  OnErrorFunction,
} from './_imports'
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
import { demoDataDefinitions } from './demoData'
import { useDatabase } from './useDatabase'
import './style.css'
import { version } from './version'

interface AppState {
  rootName: string
  indent: number
  collapseLevel: number
  collapseTime: number
  showCount: 'Yes' | 'No' | 'When closed'
  theme: ThemeName | Theme
  allowEdit: boolean
  allowDelete: boolean
  allowAdd: boolean
  allowCopy: boolean
  sortKeys: boolean
  showIndices: boolean
  showStringQuotes: boolean
  defaultNewValue: string
  searchText: string
}

function App() {
  const navigate = useLocation()[1]
  const searchString = useSearch()
  const queryParams = new URLSearchParams(searchString)
  const selectedDataSet = queryParams.get('data') ?? 'intro'
  const dataDefinition = demoDataDefinitions[selectedDataSet]

  const [state, setState] = useState<AppState>({
    rootName: dataDefinition.rootName ?? 'data',
    indent: 2,
    collapseLevel: dataDefinition.collapse ?? 2,
    collapseTime: 300,
    showCount: 'When closed',
    theme: 'default',
    allowEdit: true,
    allowDelete: true,
    allowAdd: true,
    allowCopy: true,
    sortKeys: false,
    showIndices: true,
    showStringQuotes: true,
    defaultNewValue: 'New data!',
    searchText: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const previousThemeName = useRef('') // Used when resetting after theme editing
  const toast = useToast()

  const { liveData, loading, updateLiveData } = useDatabase()

  const [
    { present: data, past, future },
    { set: setData, reset, undo: undoData, redo: redoData, canUndo, canRedo },
  ] = useUndo(selectedDataSet === 'editTheme' ? themes.default : dataDefinition.data)
  // Provides a named version of these methods (i.e undo.name = "undo")
  const undo = () => undoData()
  const redo = () => redoData()

  useEffect(() => {
    if (selectedDataSet === 'liveData' && !loading && liveData) reset(liveData)
  }, [loading, liveData, reset, selectedDataSet])

  const updateState = (patch: Partial<AppState>) => setState({ ...state, ...patch })

  const toggleState = (field: keyof AppState) => updateState({ [field]: !state[field] })

  const {
    searchText,
    rootName,
    theme,
    indent,
    collapseLevel,
    collapseTime,
    showCount,
    showIndices,
    sortKeys,
    showStringQuotes,
    allowCopy,
    defaultNewValue,
    allowEdit,
    allowDelete,
    allowAdd,
  } = state

  const restrictEdit: FilterFunction | boolean = (() => {
    const customRestrictor = dataDefinition?.restrictEdit
    if (typeof customRestrictor === 'function')
      return (input) => !allowEdit || customRestrictor(input)
    if (customRestrictor !== undefined) return customRestrictor
    return !allowEdit
  })()

  const restrictDelete: FilterFunction | boolean = (() => {
    const customRestrictor = dataDefinition?.restrictDelete
    if (typeof customRestrictor === 'function')
      return (input) => !allowDelete || customRestrictor(input)
    if (customRestrictor !== undefined) return customRestrictor
    return !allowDelete
  })()

  const restrictAdd: FilterFunction | boolean = (() => {
    const customRestrictor = dataDefinition?.restrictAdd
    if (typeof customRestrictor === 'function')
      return (input) => !allowAdd || customRestrictor(input)
    if (customRestrictor !== undefined) return customRestrictor
    return !allowAdd
  })()

  const handleChangeData = (selected: string) => {
    const newDataDefinition = demoDataDefinitions[selected]

    setState({
      ...state,
      searchText: '',
      collapseLevel: newDataDefinition.collapse ?? state.collapseLevel,
      rootName: newDataDefinition.rootName ?? 'data',
    })

    switch (selected) {
      case 'editTheme':
        previousThemeName.current = theme as string
        reset(typeof theme === 'string' ? themes[theme] : theme)
        break
      case 'liveData':
        if (!liveData) reset({ 'Oops!': "We couldn't load this data, sorry " })
        else reset(liveData)
        break
      default:
        reset(newDataDefinition.data)
    }

    if (selected === 'intro') navigate('./')
    else navigate(`./?data=${selected}`)
  }

  const handleThemeChange = (e) => {
    const selected = e.target.value
    updateState({ theme: selected })
    if (selectedDataSet === 'editTheme') {
      setData(themes[selected])
      previousThemeName.current = selected
    }
  }

  const handleHistory = (method: () => void) => {
    if (selectedDataSet === 'editTheme') {
      const theme = (method.name === 'undo' ? past.slice(-1)[0] : future[0]) as Theme
      updateState({ theme })
    }
    method()
  }

  const handleReset = async () => {
    const newState = { ...state }
    newState.searchText = ''

    switch (selectedDataSet) {
      case 'editTheme':
        reset(themes[previousThemeName.current])
        newState.theme = themes[previousThemeName.current]
        break
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
        reset(data)
        break
      default:
        reset(dataDefinition.data)
    }

    setState(newState)
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
              placeholder={dataDefinition.searchPlaceholder ?? 'Search values'}
              bgColor={'#f6f6f6'}
              borderColor="gainsboro"
              borderRadius={50}
              size="sm"
              w={60}
              value={searchText}
              onChange={(e) => updateState({ searchText: e.target.value })}
              position="absolute"
              right={2}
              top={2}
              zIndex={100}
            />
            <JsonEditor
              data={data}
              setData={setData as (data: JsonData) => void}
              rootName={rootName}
              theme={[theme, dataDefinition?.styles ?? {}, { container: { paddingTop: '1em' } }]}
              indent={indent}
              onUpdate={async (nodeData) => {
                const demoOnUpdate = dataDefinition?.onUpdate ?? (() => undefined)
                const result = await demoOnUpdate(nodeData, toast as (options: unknown) => void)
                if (result) return result
                else {
                  const { newData } = nodeData
                  if (selectedDataSet === 'editTheme') updateState({ theme: newData as Theme })
                }
              }}
              onEdit={dataDefinition?.onEdit ?? undefined}
              onAdd={dataDefinition?.onAdd ?? undefined}
              onError={
                dataDefinition.onError
                  ? (errorData) => {
                      const error = (dataDefinition.onError as OnErrorFunction)(errorData)
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
              showErrorMessages={dataDefinition.showErrorMessages}
              collapse={collapseLevel}
              collapseAnimationTime={collapseTime}
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
              restrictTypeSelection={dataDefinition?.restrictTypeSelection}
              restrictDrag={false}
              searchFilter={dataDefinition?.searchFilter}
              searchText={searchText}
              keySort={sortKeys}
              defaultValue={dataDefinition?.defaultValue ?? defaultNewValue}
              showArrayIndices={showIndices}
              showStringQuotes={showStringQuotes}
              minWidth={'min(500px, 95vw)'}
              maxWidth="min(670px, 90vw)"
              className="block-shadow"
              stringTruncate={90}
              customNodeDefinitions={dataDefinition?.customNodeDefinitions}
              customText={dataDefinition?.customTextDefinitions}
              onChange={dataDefinition?.onChange ?? undefined}
              jsonParse={JSON5.parse}
            />
          </Box>
          <VStack w="100%" align="flex-end" gap={4}>
            <HStack w="100%" justify="space-between" mt={4}>
              <Button
                colorScheme="primaryScheme"
                leftIcon={<ArrowBackIcon />}
                onClick={() => handleHistory(undo)}
                isDisabled={!canUndo}
              >
                Undo
              </Button>
              <Spacer />
              <Button
                colorScheme="primaryScheme"
                rightIcon={<ArrowForwardIcon />}
                onClick={() => handleHistory(redo)}
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
                leftIcon={selectedDataSet === 'liveData' ? <AiOutlineCloudUpload /> : <BiReset />}
                variant="outline"
                onClick={handleReset}
                visibility={canUndo ? 'visible' : 'hidden'}
                isLoading={isSaving}
              >
                {selectedDataSet === 'liveData' ? 'Push to the cloud' : 'Reset'}
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
                    <Select
                      id="dataSelect"
                      onChange={(e) => handleChangeData(e.target.value)}
                      value={selectedDataSet}
                    >
                      {Object.entries(demoDataDefinitions).map(([key, { name }]) => (
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
                    onChange={(e) => updateState({ rootName: e.target.value })}
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
                    onChange={(value) => updateState({ collapseLevel: Number(value) })}
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
                    Collapse animation time
                  </FormLabel>
                  <NumberInput
                    id="collapseTime"
                    className="inputWidth"
                    min={0}
                    value={collapseTime}
                    onChange={(value) => updateState({ collapseTime: Number(value) })}
                  >
                    <NumberInputField />
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
                    onChange={(value) => updateState({ indent: Number(value) })}
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
                      onChange={(e) =>
                        updateState({ showCount: e.target.value as 'Yes' | 'No' | 'When closed' })
                      }
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
                      disabled={dataDefinition.restrictEdit !== undefined}
                      onChange={() => toggleState('allowEdit')}
                      w="50%"
                    >
                      Allow Edit
                    </Checkbox>
                    <Checkbox
                      id="allowDeleteCheckbox"
                      isChecked={allowDelete}
                      disabled={dataDefinition.restrictDelete !== undefined}
                      onChange={() => toggleState('allowDelete')}
                      w="50%"
                    >
                      Allow Delete
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="allowAddCheckbox"
                      isChecked={allowAdd}
                      disabled={dataDefinition.restrictAdd !== undefined}
                      onChange={() => toggleState('allowAdd')}
                      w="50%"
                    >
                      Allow Add
                    </Checkbox>
                    <Checkbox
                      id="allowCopyCheckbox"
                      isChecked={allowCopy}
                      onChange={() => toggleState('allowCopy')}
                      w="50%"
                    >
                      Enable clipboard
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="showStringQuotesCheckbox"
                      isChecked={showStringQuotes}
                      onChange={() => toggleState('showStringQuotes')}
                      w="50%"
                    >
                      Show String quotes
                    </Checkbox>
                    <Checkbox
                      id="showIndicesCheckbox"
                      isChecked={showIndices}
                      onChange={() => toggleState('showIndices')}
                      w="50%"
                    >
                      Show Array indices
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="sortKeysCheckbox"
                      isChecked={sortKeys}
                      onChange={() => toggleState('sortKeys')}
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
                      disabled={dataDefinition.defaultValue !== undefined}
                      type="text"
                      value={defaultNewValue}
                      onChange={(e) => updateState({ defaultNewValue: e.target.value })}
                    />
                  </HStack>
                </CheckboxGroup>
              </VStack>
            </FormControl>
          </VStack>
          <Box maxW={350} pt={4}>
            {dataDefinition.description}
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
