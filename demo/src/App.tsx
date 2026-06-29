import { lazy, Suspense } from 'react'
import JSON5 from 'json5'
import { Theme } from '@json-edit-react'
import { BiReset } from 'react-icons/bi'
import { AiOutlineCloudUpload } from 'react-icons/ai'
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  Link,
  Spacer,
  Input,
  useToast,
  Spinner,
} from '@chakra-ui/react'
import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import './style.css'
import { getLineHeight } from './helpers'
import { RenderProfiler } from './RenderProfiler'
import { Loading } from '../../packages/components/src/_common/Loading'
import { CodeEditor } from '@json-edit-react/components/widgets'
import { Banner } from './Banner'
import { DemoHeader } from './DemoHeader'
import { OptionsPanel } from './OptionsPanel'
import { ExternalControlPanel } from './ExternalControlPanel'
import { useDemoState } from './useDemoState'
const JsonEditor = lazy(() =>
  import('@json-edit-react').then((m) => ({ default: m.JsonEditor }))
) as typeof import('@json-edit-react').JsonEditor

console.log(`json-edit-react v${__VERSION__}`)
console.log(`Site built: ${__BUILD_TIME__}`)

function App() {
  // The whole demo model — state, the edited document, dataset/theme
  // resolution, and the External Control wiring — lives in `useDemoState`.
  // `App` is the view: it reads from the hook and threads values into the
  // panels, keeping only the editor's own event callbacks inline (where the
  // `JsonEditor` props type them).
  const {
    selectedDataSet,
    dataDefinition,
    exampleSlug,
    state,
    updateState,
    toggleState,
    data,
    setData,
    undo,
    redo,
    canUndo,
    canRedo,
    activePayload,
    isLoadingDataset,
    customNodeDefinitions,
    editorTheme,
    allowEdit,
    allowDelete,
    allowAdd,
    onCopy,
    editorRef,
    externalControlEnabled,
    showExternalControl,
    setShowImperativeHandle,
    handlePath,
    setHandlePath,
    handleIncludeChildren,
    setHandleIncludeChildren,
    isEditing,
    setIsEditing,
    handleExternalCollapse,
    isSaving,
    isSearchFocused,
    setIsSearchFocused,
    handleChangeData,
    handleThemeChange,
    handleReset,
  } = useDemoState()

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
    customTextEditor,
  } = state

  const toast = useToast()

  return (
    <div className="App">
      <Banner />
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
        <DemoHeader />
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
              {isLoadingDataset ? (
                <Flex h={200} justify="center" align="center">
                  <Spinner label="Loading dataset…" />
                </Flex>
              ) : (
                <RenderProfiler>
                  <JsonEditor<typeof data>
                    data={data}
                    setData={setData}
                    rootName={rootName}
                    theme={editorTheme}
                    indent={indent}
                    onUpdate={(nodeData) => {
                      const runDemoUpdate = () => {
                        if (nodeData.event === 'edit' && activePayload?.onEdit)
                          return activePayload.onEdit(nodeData)
                        if (nodeData.event === 'add' && activePayload?.onAdd)
                          return activePayload.onAdd(nodeData)
                        return (activePayload?.onUpdate ?? (() => undefined))(
                          nodeData,
                          toast as (options: unknown) => void
                        )
                      }
                      const settle = (result: Awaited<ReturnType<typeof runDemoUpdate>>) => {
                        // Reject (false) or silent cancel (null): pass straight
                        // through, no commit and no post-commit side effect.
                        if (result === false || result === null) return result
                        // Object result (error / { value } override): pass
                        // through to the library. `true` is a plain commit —
                        // fall through to the side effect like void/undefined.
                        if (result && result !== true) return result
                        // Commit (true | void | undefined): run the post-commit
                        // demo side effect.
                        const { newData } = nodeData
                        if (selectedDataSet === 'editTheme')
                          updateState({ theme: newData as Theme })
                        return undefined
                      }
                      // Return SYNCHRONOUSLY when the demo handler is sync —
                      // wrapping this in `async` would make every validation
                      // (even a sync schema check) look async to the editor,
                      // defeating its sync-reject handling and leaving dud undo
                      // entries.
                      const result = runDemoUpdate()
                      return result instanceof Promise ? result.then(settle) : settle(result)
                    }}
                    onError={
                      activePayload?.onError
                        ? (errorData) => {
                            const message = activePayload.onError!(errorData)
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
                    showErrorMessages={activePayload?.showErrorMessages}
                    collapse={collapseLevel}
                    collapseAnimationTime={collapseTime}
                    showCollectionCount={
                      showCount === 'Yes'
                        ? true
                        : showCount === 'When collapsed'
                          ? 'when-collapsed'
                          : showCount === 'When collapsed or filtered'
                            ? 'when-collapsed-or-filtered'
                            : false
                    }
                    showClipboardButton={allowCopy}
                    onCopy={onCopy}
                    allowEdit={allowEdit}
                    // allowEdit={(nodeData) => typeof nodeData.value === 'string'}
                    allowDelete={allowDelete}
                    allowAdd={allowAdd}
                    allowTypeSelection={activePayload?.allowTypeSelection}
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
                    searchFilter={activePayload?.searchFilter}
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
                    defaultValue={activePayload?.defaultValue ?? defaultNewValue}
                    newKeyOptions={activePayload?.newKeyOptions}
                    showArrayIndexes={showIndexes}
                    arrayIndexStart={arraysFromOne ? 1 : 0}
                    showStringQuotes={showStringQuotes}
                    insertAtTop
                    minWidth={'min(500px, 95vw)'}
                    maxWidth="min(670px, 90vw)"
                    className="block-shadow"
                    stringTruncateLength={90}
                    customNodeDefinitions={customNodeDefinitions}
                    customText={activePayload?.customTextDefinitions}
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
                    onChange={activePayload?.onChange ?? undefined}
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
              )}
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
        <OptionsPanel
          state={state}
          updateState={updateState}
          toggleState={toggleState}
          selectedDataSet={selectedDataSet}
          activePayload={activePayload}
          handleChangeData={handleChangeData}
          handleThemeChange={handleThemeChange}
          externalControlEnabled={externalControlEnabled}
          showExternalControl={showExternalControl}
          setShowImperativeHandle={setShowImperativeHandle}
          description={dataDefinition.description}
          exampleSlug={exampleSlug}
        >
          {showExternalControl && (
            <ExternalControlPanel
              editorRef={editorRef}
              handlePath={handlePath}
              setHandlePath={setHandlePath}
              handleIncludeChildren={handleIncludeChildren}
              setHandleIncludeChildren={setHandleIncludeChildren}
              isEditing={isEditing}
              onCollapse={handleExternalCollapse}
            />
          )}
        </OptionsPanel>
      </Flex>
      <Box h={50} />
      <footer>
        <Text fontSize="sm">{`json-edit-react v${__VERSION__}`}</Text>
      </footer>
    </div>
  )
}

export default App
