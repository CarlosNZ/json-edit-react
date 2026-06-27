import { useEffect, useRef, useMemo, useCallback, useState, type ChangeEvent } from 'react'
import { useSearch, useLocation } from 'wouter'
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
import { useUndo } from '@json-edit-react/utils'
import { useToast } from '@chakra-ui/react'
import { demoDataDefinitions, type DemoPayload } from './demoData'
import { exampleSlugByDataSet } from './examples/registry'
import { useDatabase } from './useDatabase'
import { truncate } from './helpers'

// The demo's main control state, owned by `useDemoState` and threaded into the
// `OptionsPanel` controls.
export interface AppState {
  rootName: string
  indent: number
  collapseLevel: number | FilterFunction
  collapseTime: number
  showCount: 'Yes' | 'No' | 'When collapsed' | 'When collapsed or filtered'
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

// Persisted theme choice (stored as the display name), so the selection
// survives reloads. Mirrors the Example pages' ThemePicker.
const THEME_STORAGE_KEY = 'jer-demo-theme'

// Only default theme is loaded initially
const themes = [defaultTheme]

// Resolve a theme display-name to its `Theme`, lazy-loading the themes chunk on
// demand and caching the result in `themes`. The getter-name convention
// (`get<Name>Theme`, spaces/ampersands stripped) matches `themeGetters` in
// LazyThemes.ts.
const loadThemeByName = async (themeName: string): Promise<Theme | undefined> => {
  const existing = themes.find((th) => th.displayName === themeName)
  if (existing) return existing
  if (themeName === 'Default') return defaultTheme
  try {
    const functionName = `get${themeName.replace(/\s+&\s+|\s+/g, '')}Theme`
    const lazyThemesModule = await import('./LazyThemes')
    const getter = lazyThemesModule.themeGetters[functionName]
    if (getter) {
      const newTheme = getter()
      if (newTheme) {
        themes.push(newTheme)
        return newTheme
      }
    }
  } catch (error) {
    console.error('Failed to load theme:', error)
  }
  return undefined
}

// Owns the whole demo model: the control state, the edited document (+ undo),
// dataset/payload resolution, theme persistence, and the External Control
// state shared with the editor. `App` consumes this and is otherwise a pure
// view; the editor's own event callbacks (onUpdate/onError/etc.) stay inline in
// `App` where they're contextually typed by the `JsonEditor` props.
export const useDemoState = () => {
  const navigate = useLocation()[1]
  const searchString = useSearch()
  const queryParams = new URLSearchParams(searchString)
  const selectedDataSet = queryParams.get('data') ?? 'intro'
  const dataDefinition = demoDataDefinitions[selectedDataSet]
  // If this data set has a mirrored example page, link to its source.
  const exampleSlug = exampleSlugByDataSet[selectedDataSet]

  const [state, setState] = useState<AppState>({
    rootName: dataDefinition.rootName ?? 'data',
    indent: 2,
    collapseLevel: dataDefinition.collapse ?? 2,
    collapseTime: 300,
    showCount: 'When collapsed or filtered',
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
    selectedDataSet === 'editTheme' ? defaultTheme : (dataDefinition.data ?? {})
  )
  const { data, set: setData, reset, undo, redo, canUndo, canRedo } = useUndo(rawData, setRawData)

  // Lazy (example-backed) datasets resolve their payload from a chunk; eager
  // datasets carry it inline. `loadedPayload` holds the resolved chunk for the
  // active lazy dataset; for an eager dataset the payload IS the definition,
  // read synchronously so there's no stale frame on switch. It's `null` while a
  // lazy chunk is in flight — the editor shows a spinner until it lands.
  const [loadedPayload, setLoadedPayload] = useState<DemoPayload | null>(null)
  const activePayload: Partial<DemoPayload> | null = dataDefinition.load
    ? loadedPayload
    : dataDefinition
  const isLoadingDataset = !!dataDefinition.load && !loadedPayload

  useEffect(() => {
    const def = demoDataDefinitions[selectedDataSet]
    // Eager datasets need no resolution; just clear any stale lazy payload.
    if (!def.load) {
      setLoadedPayload(null)
      return
    }
    // Lazy: load the chunk, then seed the document from its data.
    let cancelled = false
    setLoadedPayload(null)
    def.load().then((payload) => {
      if (cancelled) return
      setLoadedPayload(payload)
      reset(payload.data)
    })
    return () => {
      cancelled = true
    }
  }, [selectedDataSet, reset])

  useEffect(() => {
    if (selectedDataSet === 'liveData' && !loading && liveData) reset(liveData)
  }, [loading, liveData, reset, selectedDataSet])

  // Restore the persisted theme on mount so the selection survives reloads
  // (mirrors the Example pages' ThemePicker). Stored as a display name; resolve
  // it back to the `Theme` via the same lazy loader the picker uses. Functional
  // setState so a late-resolving lazy chunk doesn't clobber other state.
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (!stored || stored === 'Default') return
    loadThemeByName(stored).then((theme) => {
      if (!theme) return
      setState((s) => ({ ...s, theme }))
      // On the theme editor the document IS the theme (the editor styles from
      // `data`, not `state.theme`), so seed the editor too — otherwise it shows
      // the default while the selector shows the restored choice. Mirrors the
      // editTheme case in handleChangeData.
      if (selectedDataSet === 'editTheme') {
        previousTheme.current = theme
        reset(theme)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

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
      typeof activePayload?.customNodeDefinitions === 'function'
        ? activePayload.customNodeDefinitions(data)
        : activePayload?.customNodeDefinitions,
    [activePayload, data]
  )

  const updateState = (patch: Partial<AppState>) => setState({ ...state, ...patch })

  const toggleState = (field: keyof AppState) => updateState({ [field]: !state[field] })

  const {
    theme,
    allowEdit: allowEditEnabled,
    allowDelete: allowDeleteEnabled,
    allowAdd: allowAddEnabled,
  } = state

  // Compose the global toggle (the "Allow editing" checkbox) with any per-node
  // filter the data set defines: a node is permitted only if the toggle is on
  // AND the data set's own filter permits it.
  const allowEdit: FilterFunction | boolean = (() => {
    const customAllow = activePayload?.allowEdit
    if (typeof customAllow === 'function') return (input) => allowEditEnabled && customAllow(input)
    if (customAllow !== undefined) return customAllow
    return allowEditEnabled
  })()

  const allowDelete: FilterFunction | boolean = (() => {
    const customAllow = activePayload?.allowDelete
    if (typeof customAllow === 'function')
      return (input) => allowDeleteEnabled && customAllow(input)
    if (customAllow !== undefined) return customAllow
    return allowDeleteEnabled
  })()

  const allowAdd: FilterFunction | boolean = (() => {
    const customAllow = activePayload?.allowAdd
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
  // in `App`.
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
      activePayload?.styles ?? {},
      { container: { paddingTop: '1em' } },
    ],
    [selectedDataSet, data, theme, activePayload]
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
        // Eager datasets seed synchronously; lazy ones are seeded by the
        // load effect once their chunk resolves (see above).
        if (!newDataDefinition.load) reset(newDataDefinition.data ?? {})
    }

    if (selected === 'intro') navigate('/')
    else navigate(`/?data=${selected}`)
  }

  const handleThemeChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const themeName = e.target.value
    const theme = await loadThemeByName(themeName)
    if (!theme) return

    localStorage.setItem(THEME_STORAGE_KEY, themeName)
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
        reset(activePayload?.data ?? {})
    }

    setState(newState)
  }

  return {
    // Routing-derived
    selectedDataSet,
    dataDefinition,
    exampleSlug,
    // Control state
    state,
    updateState,
    toggleState,
    // Edited document (+ undo/redo)
    data,
    setData,
    undo,
    redo,
    canUndo,
    canRedo,
    // Resolved dataset payload + derived editor inputs
    activePayload,
    isLoadingDataset,
    customNodeDefinitions,
    editorTheme,
    allowEdit,
    allowDelete,
    allowAdd,
    onCopy,
    // External Control panel (shared with the editor)
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
    // Misc UI state + actions
    isSaving,
    isSearchFocused,
    setIsSearchFocused,
    handleChangeData,
    handleThemeChange,
    handleReset,
  }
}
