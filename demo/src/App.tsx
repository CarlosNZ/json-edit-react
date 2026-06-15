import { useEffect, useRef, lazy, Suspense, useMemo, useCallback } from 'react'
import { useSearch, useLocation } from 'wouter'
import JSON5 from 'json5'
import {
  Theme,
  FilterFunction,
  JsonData,
  defaultTheme,
  splitPropertyString,
  extract,
  isCollection,
  type JsonEditorHandle,
} from '@json-edit-react'
// DEMO (Intro dataset): confirm-before-update via @json-edit-react/utils.
// Comment out this import + the wiring below to disable. Swap the commented
// import to demo the Layer-1 primitive instead.
import { useUndo } from '@json-edit-react/utils'
import { FaNpm, FaExternalLinkAlt, FaGithub } from 'react-icons/fa'
import { BiReset } from 'react-icons/bi'
import { AiOutlineCloudUpload } from 'react-icons/ai'
import { useState } from 'react'
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
  Tooltip,
  Spinner,
} from '@chakra-ui/react'
import logoSVG from './image/logo.svg'
import { ArrowBackIcon, ArrowForwardIcon, InfoIcon } from '@chakra-ui/icons'
import { demoDataDefinitions } from './demoData'
import { useDatabase } from './useDatabase'
import './style.css'
import { getLineHeight, truncate } from './helpers'
import { RenderProfiler } from './RenderProfiler'
import { Loading } from '../../packages/components/src/_common/Loading'
import { CodeEditor } from '@json-edit-react/components'
const SourceIndicator = lazy(() => import('./SourceIndicator'))
const JsonEditor = lazy(() =>
  import('@json-edit-react').then((m) => ({ default: m.JsonEditor }))
) as typeof import('@json-edit-react').JsonEditor

interface AppState {
  rootName: string
  indent: number
  collapseLevel: number | FilterFunction
  collapseTime: number
  showCount: 'Yes' | 'No' | 'When closed' | 'When closed or filtered'
  theme: Theme
  allowEdit: boolean
  allowDelete: boolean
  allowAdd: boolean
  allowCopy: boolean
  sortKeys: boolean
  showIndexes: boolean
  arraysFromOne: boolean
  showStringQuotes: boolean
  defaultNewValue: string
  searchText: string
  customTextEditor: boolean
}

// Additional themes are loaded dynamically when needed

const themeNames = [
  'Default',
  'Github Dark',
  'Github Light',
  'White & Black',
  'Black & White',
  'Candy Wrapper',
  'Psychedelic',
  'Solarized Dark',
  'Solarized Light',
  'Dracula',
  'Monokai',
  'Tokyo Night',
]

// Only default theme is loaded initially
const themes = [defaultTheme]

console.log(`json-edit-react v${__VERSION__}`)
console.log(`Site built: ${__BUILD_TIME__}`)

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
    showCount: 'When closed or filtered',
    theme: defaultTheme,
    allowEdit: true,
    allowDelete: true,
    allowAdd: true,
    allowCopy: true,
    sortKeys: false,
    showIndexes: true,
    arraysFromOne: false,
    showStringQuotes: true,
    defaultNewValue: 'New data!',
    searchText: '',
    customTextEditor: false,
  })

  // Imperative handle for driving collapse/edit actions from outside the tree.
  const editorRef = useRef<JsonEditorHandle>(null)
  // Imperative-handle test panel: visibility toggle + target path/options.
  // Kept in local state (not AppState) so it survives demo-data changes.
  const [showImperativeHandle, setShowImperativeHandle] = useState(false)
  const [handlePath, setHandlePath] = useState('')
  const [handleIncludeChildren, setHandleIncludeChildren] = useState(true)
  // const [handleOverrideRestrictions, setHandleOverrideRestrictions] = useState(false)
  // Tracks whether a node is currently being edited (via `onEditEvent`), so
  // the External Control panel can show Confirm/Cancel only while an edit is
  // active.
  const [isEditing, setIsEditing] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  // Used when resetting after theme editing
  const previousTheme = useRef<Theme>(null)
  const toast = useToast()

  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const { liveData, loading, updateLiveData } = useDatabase()

  // The consumer owns the data state; `useUndo` (controlled) layers undo/redo
  // on top, recording snapshots and committing through `setRawData`. Switch
  // datasets with `reset(newData)` (see `handleChangeData`) — never a raw
  // `setRawData` — so history is cleared rather than left pointing at the
  // previous dataset.
  const [rawData, setRawData] = useState<JsonData>(
    selectedDataSet === 'editTheme' ? defaultTheme : dataDefinition.data
  )
  const { data, set: setData, reset, undo, redo, canUndo, canRedo } = useUndo(rawData, setRawData)

  useEffect(() => {
    if (selectedDataSet === 'liveData' && !loading && liveData) reset(liveData)
  }, [loading, liveData, reset, selectedDataSet])

  // useEffect(() => {
  //   const localStorageState = localStorage.getItem('collapseState')
  //   if (localStorageState) {
  //     setTimeout(() => {
  //       const data = JSON.parse(localStorageState) as Record<string, CollapseState>
  //       collapseState.current = data
  //       const collapseArray = Object.values(data)
  //       setCollapseData(collapseArray)
  //       // console.log('collapseArray', collapseArray)
  //     }, 500)
  //   }
  // }, [])

  // Data sets whose definitions are configured by the data itself declare
  // them as a function; rebuild when the data changes. Static lists pass
  // through with their module-scope identity intact.
  const customNodeDefinitions = useMemo(
    () =>
      typeof dataDefinition.customNodeDefinitions === 'function'
        ? dataDefinition.customNodeDefinitions(data)
        : dataDefinition.customNodeDefinitions,
    [dataDefinition, data]
  )

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
    showIndexes,
    arraysFromOne,
    sortKeys,
    showStringQuotes,
    allowCopy,
    defaultNewValue,
    allowEdit: allowEditEnabled,
    allowDelete: allowDeleteEnabled,
    allowAdd: allowAddEnabled,
    customTextEditor,
  } = state

  // Compose the global toggle (the "Allow editing" checkbox) with any per-node
  // filter the data set defines: a node is permitted only if the toggle is on
  // AND the data set's own filter permits it.
  const allowEdit: FilterFunction | boolean = (() => {
    const customAllow = dataDefinition?.allowEdit
    if (typeof customAllow === 'function') return (input) => allowEditEnabled && customAllow(input)
    if (customAllow !== undefined) return customAllow
    return allowEditEnabled
  })()

  const allowDelete: FilterFunction | boolean = (() => {
    const customAllow = dataDefinition?.allowDelete
    if (typeof customAllow === 'function')
      return (input) => allowDeleteEnabled && customAllow(input)
    if (customAllow !== undefined) return customAllow
    return allowDeleteEnabled
  })()

  const allowAdd: FilterFunction | boolean = (() => {
    const customAllow = dataDefinition?.allowAdd
    if (typeof customAllow === 'function') return (input) => allowAddEnabled && customAllow(input)
    if (customAllow !== undefined) return customAllow
    return allowAddEnabled
  })()

  // The "Show External Control" toggle is disabled on the custom-nodes data
  // set, where path-based editing doesn't map cleanly onto the custom
  // renderers. When unavailable it stays off and the panel is hidden.
  const externalControlEnabled = selectedDataSet !== 'customNodes'
  const showExternalControl = showImperativeHandle && externalControlEnabled

  // External Control panel: collapse/expand the node at the entered path. We
  // pre-check that the target is a collection (a leaf has nothing to collapse)
  // and warn instead of firing a no-op — `collapse` itself returns nothing, so
  // the host detects this with the exported `extract` + `isCollection` helpers.
  // A successful collapse/expand is reported by the `onCollapse` callback
  // below.
  const handleExternalCollapse = (collapsed: boolean) => {
    const path = splitPropertyString(handlePath)
    if (!isCollection(extract(data, path))) {
      toast({
        title: `Can't ${collapsed ? 'collapse' : 'expand'} — not a collection node`,
        status: 'warning',
        duration: 2000,
        isClosable: true,
      })
      return
    }
    editorRef.current?.collapse({ path, collapsed, includeChildren: handleIncludeChildren })
  }

  // Stable references so the JsonEditor's memoized nodes can bail out: an
  // inline `theme` array would churn the theme context (re-rendering every
  // node), and an inline `onCopy` would churn the per-node prop comparison. For
  // the editTheme dataset the document IS the theme, so style the editor from
  // `data` directly — a pure derivation, no second copy of the theme to keep in
  // sync. Every other dataset styles from the chosen `theme`.
  const editorTheme = useMemo(
    () => [
      selectedDataSet === 'editTheme' ? (data as Theme) : theme,
      dataDefinition?.styles ?? {},
      { container: { paddingTop: '1em' } },
    ],
    [selectedDataSet, data, theme, dataDefinition]
  )

  const onCopy = useCallback(
    ({
      stringValue,
      type,
      success,
      error,
    }: {
      stringValue: string
      type: 'value' | 'path'
      success: boolean
      error?: { message: string }
    }) =>
      success
        ? toast({
            title: `${type === 'value' ? 'Value' : 'Path'} copied to clipboard:`,
            description: truncate(String(stringValue)),
            status: 'success',
            duration: 5000,
            isClosable: true,
          })
        : toast({
            title: 'Problem copying to clipboard',
            description: error?.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          }),
    [toast]
  )

  const handleChangeData = (selected: string) => {
    const newDataDefinition = demoDataDefinitions[selected]

    setState({
      ...state,
      searchText: '',
      collapseLevel: newDataDefinition.collapse ?? state.collapseLevel,
      rootName: newDataDefinition.rootName ?? 'data',
      customTextEditor: false,
      // Leaving the theme editor: persist the live-edited theme (the `data`)
      // into `state.theme` so the other datasets are styled with the theme
      // you built.
      // The editTheme view derives its styling from `data`, so this is the one
      // point where that work needs writing back to the standing theme.
      ...(selectedDataSet === 'editTheme' ? { theme: data as Theme } : {}),
    })

    switch (selected) {
      case 'editTheme':
        previousTheme.current = theme
        reset(theme)
        break
      case 'liveData':
        if (!liveData) reset({ 'Oops!': "We couldn't load this data, sorry " })
        else reset(liveData)
        break
      default:
        reset(newDataDefinition.data)
    }

    if (selected === 'intro') navigate('/')
    else navigate(`/?data=${selected}`)
  }

  const handleThemeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const themeName = e.target.value

    // If theme is already loaded, use it
    let theme = themes.find((th) => th.displayName === themeName)

    // If theme is not loaded yet, load it using LazyThemes
    if (!theme && themeName !== 'Default') {
      try {
        // Create a function name for the getter based on theme name
        const functionName = `get${themeName.replace(/\s+&\s+|\s+/g, '')}Theme`

        // Dynamically import the themes module
        const lazyThemesModule = await import('./LazyThemes')

        // Get the theme using the themeGetters map
        if (lazyThemesModule.themeGetters[functionName]) {
          const newTheme = lazyThemesModule.themeGetters[functionName]()

          // Add to available themes to avoid loading again
          if (newTheme) {
            themes.push(newTheme)
            theme = newTheme
          }
        }
      } catch (error) {
        console.error('Failed to load theme:', error)
        return
      }
    }

    if (!theme) return

    updateState({ theme })
    if (selectedDataSet === 'editTheme') {
      setData(theme)
      previousTheme.current = theme
    }
  }

  const handleReset = async () => {
    const newState = { ...state }
    newState.searchText = ''

    switch (selectedDataSet) {
      case 'editTheme':
        reset(previousTheme.current ?? defaultTheme)
        newState.theme = previousTheme.current ?? defaultTheme
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
          <Suspense fallback={null}>
            <SourceIndicator />
          </Suspense>

          <VStack align="flex-start" gap={3}>
            <HStack align="flex-end" mt={2} gap={4} flexWrap="wrap">
              <Flex gap={4} align="center">
                {/* <img src={logo} alt="logo" style={{ maxHeight: '3.5em' }} /> */}
                <img src={logoSVG} alt="logo" style={{ maxHeight: '3.5em' }} />
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
            <Suspense
              fallback={
                <Flex h={200} justify="center" align="center">
                  <Spinner label="Loading..." />
                </Flex>
              }
            >
              <Input
                id="searchTextInput"
                placeholder={
                  isSearchFocused ? (dataDefinition.searchPlaceholder ?? 'Search values') : '🔍'
                }
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                bgColor={'#f6f6f6'}
                borderColor="gainsboro"
                borderRadius={50}
                size="sm"
                w={'8rem'}
                value={searchText}
                onChange={(e) => updateState({ searchText: e.target.value })}
                position="absolute"
                right={2}
                top={2}
                zIndex={100}
                _focus={{ w: '45%' }}
                transition={'width 0.3s'}
              />
              <RenderProfiler>
                <JsonEditor<typeof data>
                  data={data}
                  setData={setData}
                  rootName={rootName}
                  theme={editorTheme}
                  indent={indent}
                  onUpdate={async (nodeData) => {
                    // §17: one `onUpdate`. The datasets' per-operation helpers
                    // (onEdit/onAdd) are dispatched by `event`, with `onUpdate`
                    // as the catch-all (delete/rename/move).
                    const runDemoUpdate = () => {
                      if (nodeData.event === 'edit' && dataDefinition?.onEdit)
                        return dataDefinition.onEdit(nodeData)
                      if (nodeData.event === 'add' && dataDefinition?.onAdd)
                        return dataDefinition.onAdd(nodeData)
                      return (dataDefinition?.onUpdate ?? (() => undefined))(
                        nodeData,
                        toast as (options: unknown) => void
                      )
                    }
                    const result = await runDemoUpdate()
                    // Reject (false) or silent cancel (null): pass straight
                    // through, no commit and no post-commit side effect.
                    if (result === false || result === null) return result
                    // Object result (error / { value } override): pass
                    // through to the library. `true` is a plain commit — fall
                    // through to the side effect like void/undefined.
                    if (result && result !== true) return result
                    // Commit (true | void | undefined): run the post-commit
                    // demo side effect.
                    const { newData } = nodeData
                    if (selectedDataSet === 'editTheme') updateState({ theme: newData as Theme })
                  }}
                  onError={
                    dataDefinition.onError
                      ? (errorData) => {
                          const message = dataDefinition.onError!(errorData)
                          toast({
                            title: 'ERROR 😢',
                            description: message,
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
                    showCount === 'Yes'
                      ? true
                      : showCount === 'When closed'
                        ? 'when-closed'
                        : showCount === 'When closed or filtered'
                          ? 'when-closed-or-filtered'
                          : false
                  }
                  showClipboardButton={allowCopy}
                  onCopy={onCopy}
                  allowEdit={allowEdit}
                  // allowEdit={(nodeData) => typeof nodeData.value === 'string'}
                  allowDelete={allowDelete}
                  allowAdd={allowAdd}
                  allowTypeSelection={dataDefinition?.allowTypeSelection}
                  // allowTypeSelection={[
                  //   'string',
                  //   'number',
                  //   'boolean',
                  //   'null',
                  //   { enum: 'Option', values: ['One', 'Two', 'Three'] },
                  //   {
                  //     enum: 'Hobby',
                  //     values: ['partying', 'building stuff', 'avenging', 'time travel'],
                  //     matchPriority: 1,
                  //   },
                  //   {
                  //     enum: 'Other activities that could be quite long',
                  //     values: ['changing', 'building stuff', 'avenging', 'money money money money'],
                  //     matchPriority: 2,
                  //   },
                  // ]}
                  allowDrag={true}
                  searchFilter={dataDefinition?.searchFilter}
                  searchText={searchText}
                  sortKeys={sortKeys}
                  // sortKeys={
                  //   sortKeys
                  //     ? (a, b) => {
                  //         const nameRev1 = String(a[0]).length
                  //         const nameRev2 = String(b[0]).length
                  //         if (nameRev1 < nameRev2) {
                  //           return -1
                  //         }
                  //         if (nameRev1 > nameRev2) {
                  //           return 1
                  //         }
                  //         return 0
                  //       }
                  //     : false
                  // }
                  defaultValue={dataDefinition?.defaultValue ?? defaultNewValue}
                  newKeyOptions={dataDefinition?.newKeyOptions}
                  showArrayIndexes={showIndexes}
                  arrayIndexStart={arraysFromOne ? 1 : 0}
                  showStringQuotes={showStringQuotes}
                  minWidth={'min(500px, 95vw)'}
                  maxWidth="min(670px, 90vw)"
                  className="block-shadow"
                  stringTruncateLength={90}
                  customNodeDefinitions={customNodeDefinitions}
                  customText={dataDefinition?.customTextDefinitions}
                  // icons={{ chevron: <IconCancel size="1.2em" /> }}
                  // customButtons={[
                  //   {
                  //     Element: () => (
                  //       <svg fill="none" viewBox="0 0 24 24" height="1em" width="1em">
                  //         <path
                  //           fill="currentColor"
                  //           fillRule="evenodd"
                  //           d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 2c6.075 0 11-4.925 11-11S18.075 1 12 1 1 5.925 1 12s4.925 11 11 11z"
                  //           clipRule="evenodd"
                  //         />
                  //         <path fill="currentColor" d="M16 12l-6 4.33V7.67L16 12z" />
                  //       </svg>
                  //     ),
                  //     onClick: (nodeData, e) => console.log(nodeData),
                  //   },
                  // ]}
                  onChange={dataDefinition?.onChange ?? undefined}
                  jsonParse={JSON5.parse}
                  keyboardControls={
                    {
                      // cancel: 'Tab',
                      // confirm: { key: 'Enter', modifier: 'Meta' },
                      // objectConfirm: { key: 'Enter', modifier: 'Shift' },
                      // stringLineBreak: { key: 'Enter' },
                      // stringConfirm: { key: 'Enter', modifier: 'Meta' },
                      // clipboardModifier: ['Alt', 'Shift'],
                      // collapseModifier: 'Control',
                      // booleanConfirm: 'Enter',
                      // booleanToggle: 'r',
                      // tabForward: { key: 'Tab', modifier: 'Shift' },
                      // tabBack: { key: 'Tab' },
                    }
                  }
                  // insertAtBeginning="object"
                  // baseFontSize={20}
                  TextEditor={
                    customTextEditor
                      ? (props) => (
                          <Suspense
                            fallback={
                              <div
                                className="loading"
                                style={{ height: `${getLineHeight(data)}lh` }}
                              >
                                <Loading text="Loading code editor" />
                              </div>
                            }
                          >
                            <CodeEditor {...props} theme={theme?.displayName ?? ''} />
                          </Suspense>
                        )
                      : undefined
                  }
                  // collapseClickZones={['property', 'header']}
                  onEditEvent={(e) => {
                    // A session is "editing" from `start*` until it closes with
                    // `commit*`/`cancel*`. `submit*` happens mid-session (the
                    // editor may still be open during a `hold()` gate), so it
                    // mustn't flip the flag; settlement/instant events don't
                    // either.
                    if (e.event.startsWith('start')) setIsEditing(true)
                    else if (e.event.startsWith('commit') || e.event.startsWith('cancel'))
                      setIsEditing(false)
                  }}
                  onCollapse={(input) => {
                    // Showcase the onCollapse callback — only while the
                    // External Control panel is on screen (fires for both
                    // handle-driven and user chevron-click collapses).
                    if (!showExternalControl) return
                    const label = input.path.length > 0 ? input.path.join('.') : 'root'
                    toast({
                      title: `${input.collapsed ? 'Collapsed' : 'Expanded'} ${label}`,
                      status: 'info',
                      duration: 2000,
                      isClosable: true,
                    })
                  }}
                  editorRef={editorRef}
                  // translations={{
                  //   EMPTY_STRING: 'Nah',
                  // }}
                  showIconTooltips
                />
              </RenderProfiler>
            </Suspense>
          </Box>
          {/* DEMO: confirm-before-update modal (Intro dataset).
              Comment out to disable. */}
          <VStack w="100%" align="flex-end" gap={4}>
            <HStack w="100%" justify="space-between" mt={4}>
              <Button
                colorScheme="primaryScheme"
                leftIcon={<ArrowBackIcon />}
                onClick={() => undo()}
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
              <Text maxW={600} fontSize="md">
                Undo/Redo functionality can be incorporated by using the{' '}
                <Link
                  href="https://github.com/CarlosNZ/json-edit-react/blob/main/packages/utils/src/undo/README.md"
                  isExternal
                >
                  <span className="code">useUndo</span> hook
                </Link>
                , from the{' '}
                <Link href="https://www.npmjs.com/package/@json-edit-react/utils" isExternal>
                  <span className="code">@json-edit-react/utils</span> package
                </Link>
              </Text>
              <Button
                colorScheme="accentScheme"
                leftIcon={selectedDataSet === 'liveData' ? <AiOutlineCloudUpload /> : <BiReset />}
                variant="outline"
                onClick={handleReset}
                visibility={canUndo ? 'visible' : 'hidden'}
                isLoading={isSaving}
                // isDisabled={isEditing}
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
                    <Select id="themeSelect" onChange={handleThemeChange} value={theme.displayName}>
                      {themeNames.map((themeName) => (
                        <option value={themeName} key={themeName}>
                          {themeName}
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
                    isDisabled={typeof collapseLevel !== 'number'}
                    value={typeof collapseLevel === 'number' ? collapseLevel : 'Custom function'}
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
                        updateState({
                          showCount: e.target.value as
                            | 'Yes'
                            | 'No'
                            | 'When closed'
                            | 'When closed or filtered',
                        })
                      }
                      value={showCount}
                      fontSize="sm"
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
                      <option value="When closed or filtered" key={3}>
                        When closed or filtered
                      </option>
                    </Select>
                  </div>
                </HStack>
                <HStack className="inputRow">
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
                <CheckboxGroup colorScheme="primaryScheme">
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="allowEditCheckbox"
                      isChecked={allowEditEnabled}
                      disabled={dataDefinition.allowEdit !== undefined}
                      onChange={() => toggleState('allowEdit')}
                      w="50%"
                    >
                      Allow Edit
                    </Checkbox>
                    <Checkbox
                      id="allowDeleteCheckbox"
                      isChecked={allowDeleteEnabled}
                      disabled={dataDefinition.allowDelete !== undefined}
                      onChange={() => toggleState('allowDelete')}
                      w="50%"
                    >
                      Allow Delete
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="allowAddCheckbox"
                      isChecked={allowAddEnabled}
                      disabled={dataDefinition.allowAdd !== undefined}
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
                      id="sortKeysCheckbox"
                      isChecked={sortKeys}
                      onChange={() => toggleState('sortKeys')}
                      w="50%"
                    >
                      Sort Object keys
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="showIndexesCheckbox"
                      isChecked={showIndexes}
                      onChange={() => toggleState('showIndexes')}
                      w="50%"
                    >
                      Show Array indexes
                    </Checkbox>
                    <Checkbox
                      id="arraysFromOneCheckbox"
                      isChecked={arraysFromOne}
                      onChange={() => toggleState('arraysFromOne')}
                      w="50%"
                    >
                      Arrays index from 1
                    </Checkbox>
                  </Flex>
                  <Flex w="100%" justify="flex-start">
                    <Checkbox
                      id="showImperativeHandleCheckbox"
                      isChecked={showExternalControl}
                      disabled={!externalControlEnabled}
                      onChange={() => setShowImperativeHandle((v) => !v)}
                      w="50%"
                    >
                      Show External Control
                    </Checkbox>
                    <HStack w="50%">
                      <Checkbox
                        id="customEditorCheckbox"
                        isChecked={customTextEditor}
                        onChange={() => toggleState('customTextEditor')}
                        disabled={!dataDefinition.customTextEditorAvailable}
                      >
                        Custom Text Editor
                      </Checkbox>
                      <Tooltip label="When in full JSON object edit">
                        <InfoIcon color="primaryScheme.500" />
                      </Tooltip>
                    </HStack>
                  </Flex>
                </CheckboxGroup>
                {showExternalControl && (
                  // Test panel for the `editorRef` imperative handle. Enter a
                  // dot-separated path (e.g. "user.name" or "items.0"); empty =
                  // root. Actions operate on that path.
                  <VStack w="100%" align="stretch" gap={2} pt={2} mt={2}>
                    <Text as="h3">External Control</Text>
                    <Input
                      size="sm"
                      placeholder="path, e.g. user.name or items[0] (empty = root)"
                      value={handlePath}
                      onChange={(e) => setHandlePath(e.target.value)}
                    />
                    <HStack gap={2} flexWrap="wrap" w="100%" justify="space-between">
                      <Flex justify="space-between">
                        <Button
                          size="sm"
                          onClick={() => {
                            const result = editorRef.current?.startEdit({
                              path: splitPropertyString(handlePath),
                              // overrideRestrictions: handleOverrideRestrictions,
                            })
                            if (result && result !== true)
                              toast({
                                title: "Can't edit that node",
                                description:
                                  result === 'RESTRICTED'
                                    ? 'That node is restricted from editing'
                                    : 'No node found at that path',
                                status: 'warning',
                                duration: 2000,
                                isClosable: true,
                              })
                          }}
                          colorScheme="primaryScheme"
                          variant="outline"
                        >
                          Start edit
                        </Button>
                      </Flex>
                      {/* Confirm/Cancel only make sense while an edit is
                          active; `isEditing` is tracked via `onEditEvent`. */}
                      {isEditing && (
                        <Flex gap={2}>
                          <Button
                            size="sm"
                            onClick={() => editorRef.current?.confirm()}
                            colorScheme="primaryScheme"
                            variant="outline"
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => editorRef.current?.cancel()}
                            colorScheme="primaryScheme"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </Flex>
                      )}
                      {/* <Checkbox
                        isChecked={handleOverrideRestrictions}
                        onChange={(e) => setHandleOverrideRestrictions(e.target.checked)}
                        whiteSpace="nowrap"
                      >
                        Override restrictions
                      </Checkbox> */}
                    </HStack>
                    <HStack gap={2} flexWrap="wrap">
                      <Button
                        size="sm"
                        onClick={() => handleExternalCollapse(true)}
                        colorScheme="primaryScheme"
                        variant="outline"
                      >
                        Collapse
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleExternalCollapse(false)}
                        colorScheme="primaryScheme"
                        variant="outline"
                      >
                        Expand
                      </Button>
                      <Checkbox
                        isChecked={handleIncludeChildren}
                        onChange={(e) => setHandleIncludeChildren(e.target.checked)}
                        whiteSpace="nowrap"
                      >
                        Include children
                      </Checkbox>
                    </HStack>
                  </VStack>
                )}
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
        <Text fontSize="sm">
          {`json-edit-react v${__VERSION__} `}
          <Link href="/json-edit-react/v1" color="gray.500">
            (Use V1.x)
          </Link>
        </Text>
      </footer>
    </div>
  )
}

export default App
