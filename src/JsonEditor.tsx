import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assign, type AssignOptions, type AssignInput } from './utils/assign'
import { extract } from './utils/extract'
import { CollectionNode } from './CollectionNode'
import { getFullKeyboardControlMap, handleKeyPress } from './utils/keyboard'
import { matchNode, matchNodeKey } from './utils/filter'
import { isCollection, NOOP, restoreUndefined, UNDEFINED } from './utils/misc'
import {
  type CollectionData,
  type JsonEditorProps,
  type FilterFunction,
  type InternalUpdateFunction,
  type NodeData,
  type SearchFilterFunction,
  type CollectionKey,
  type UpdateFunctionReturn,
  type UpdateFunction,
  type UpdateFunctionProps,
  type JsonData,
  type KeyboardControls,
  ValueData,
  CustomNodeDefinition,
} from './types'
import { useTheme, ThemeProvider, TreeStateProvider, defaultTheme, useEditingStore } from './contexts'
import { useTriggers } from './hooks'
import { getTranslateFunction } from './localisation'
import { ValueNodeWrapper } from './ValueNodeWrapper'

import './style.css'
import { getCustomNode } from './CustomNode'

// Module-scoped so the default is a stable reference across renders;
// an inline default would clobber in-progress edits in CollectionNode.
const defaultJsonStringify = (
  data: JsonData,
  replacer?: (key: string, value: unknown) => unknown
) => JSON.stringify(data, replacer, 2)

// Wrap an optional consumer callback so its identity stays STABLE across
// renders (lets the React.memo'd nodes bail) while always invoking the LATEST
// implementation — even when passed inline. Same refs-to-latest idea as the
// update callbacks (and the same render-time-write safety: the wrapper runs
// only from event handlers, never during render, so there is no mid-render read
// to tear). Returns `undefined` when the consumer supplied nothing, so
// downstream `if (cb)` guards still hold.
const useStableCallback = <Args extends unknown[], R>(
  cb: ((...args: Args) => R) | undefined
): ((...args: Args) => R) | undefined => {
  const ref = useRef(cb)
  ref.current = cb
  // Identity fixed for the component's life; forwards to the latest `cb`. The
  // wrapper is only handed out while `cb` is defined (the return flips to
  // `undefined` otherwise, re-rendering consumers), so the assertion is safe —
  // and parameterising by Args/R keeps the wrapper's signature == cb's, no cast.
  const stable = useRef((...args: Args): R => ref.current!(...args))
  return cb ? stable.current : undefined
}

// Module-scoped stable defaults: a destructure default like `= []` allocates a
// fresh array on every render when the prop is omitted, which would defeat the
// React.memo node boundary (the prop would look "changed" every render). These
// shared references keep the default stable.
const EMPTY_CUSTOM_NODE_DEFINITIONS: CustomNodeDefinition[] = []
const DEFAULT_COLLAPSE_CLICK_ZONES: Array<'left' | 'header' | 'property'> = ['header', 'left']
// Same rationale: omitted object/array props would otherwise allocate a fresh
// `{}`/`[]` every render, churning the `useMemo`s that derive `translate`,
// `fullKeyboardControls`, etc., and defeating the node memo on every commit.
const EMPTY_TRANSLATIONS: NonNullable<JsonEditorProps<JsonData>['translations']> = {}
const EMPTY_CUSTOM_TEXT: NonNullable<JsonEditorProps<JsonData>['customText']> = {}
const EMPTY_KEYBOARD_CONTROLS: NonNullable<JsonEditorProps<JsonData>['keyboardControls']> = {}
const EMPTY_CUSTOM_BUTTONS: NonNullable<JsonEditorProps<JsonData>['customButtons']> = []

const Editor: React.FC<JsonEditorProps<JsonData>> = ({
  data,
  setData,
  rootName = 'root',
  onUpdate = NOOP,
  onEdit: srcEdit = onUpdate,
  onDelete: srcDelete = onUpdate,
  onAdd: srcAdd = onUpdate,
  onChange,
  onError,
  onEditEvent,
  showErrorMessages = true,
  enableClipboard = true,
  indent = 2,
  collapse = false,
  collapseAnimationTime = 300, // must be equivalent to CSS value
  showCollectionCount = true,
  restrictEdit = false,
  restrictDelete = false,
  restrictAdd = false,
  restrictTypeSelection = false,
  restrictDrag = true,
  searchFilter: searchFilterInput,
  searchText,
  searchDebounceTime = 350,
  keySort = false,
  showArrayIndices = true,
  arrayIndexFromOne = false,
  showStringQuotes = true,
  showIconTooltips = false,
  defaultValue = null,
  newKeyOptions,
  minWidth = 250,
  maxWidth = 'min(600px, 90vw)',
  rootFontSize,
  stringTruncate = 250,
  translations = EMPTY_TRANSLATIONS,
  className,
  id,
  customText = EMPTY_CUSTOM_TEXT,
  customNodeDefinitions = EMPTY_CUSTOM_NODE_DEFINITIONS,
  customButtons = EMPTY_CUSTOM_BUTTONS,
  jsonParse = JSON.parse,
  jsonStringify = defaultJsonStringify,
  TextEditor,
  errorMessageTimeout = 2500,
  keyboardControls = EMPTY_KEYBOARD_CONTROLS,
  externalTriggers,
  insertAtTop = false,
  onCollapse,
  collapseClickZones = DEFAULT_COLLAPSE_CLICK_ZONES,
}) => {
  const { getStyles } = useTheme()
  // Root must not subscribe to editing state — that would re-render the whole
  // tree on every edit transition. Read the cancel action from the stable store.
  const { cancelEdit } = useEditingStore()
  const collapseFilter = useMemo(() => getFilterFunction(collapse), [collapse])
  const translate = useMemo(
    () => getTranslateFunction(translations, customText),
    [translations, customText]
  )
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText)

  const mainContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cancelEdit()
    const debounce = setTimeout(() => setDebouncedSearchText(searchText), searchDebounceTime)
    return () => clearTimeout(debounce)
    // `cancelEdit` is intentionally excluded. It's useCallback-stable over
    // `onEditEvent`, but a consumer passing `onEditEvent={() => ...}` inline
    // would re-bind it on every render — including it here would re-fire this
    // effect on unrelated renders and cancel in-progress edits mid-keystroke.
    // React's effect semantics still pick up the latest `cancelEdit` closure
    // at fire time when one of the listed deps changes, so behaviour is
    // correct: cancel runs once per genuine search-input change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, searchDebounceTime])

  const nodeData: NodeData = {
    key: rootName,
    path: [],
    level: 0,
    index: 0,
    value: data,
    size: typeof data === 'object' && data !== null ? Object.keys(data).length : 1,
    parentData: null,
    fullData: data,
  }

  // Refs-to-latest so the update callbacks below can be referentially STABLE
  // (useCallback with empty deps) yet always act on the current data and the
  // latest consumer callbacks — even when those are passed inline (as the demo
  // does). Stable identities are what let the React.memo'd nodes bail out
  // instead of re-rendering the whole tree on every commit.
  //
  // Writing `.current` during render is safe here because every read happens in
  // an event handler or async committer (the `useCallback`s below, and the
  // stabilised side-effect callbacks) — never during render to produce output.
  // With no mid-render read there is nothing to tear. Moving these writes into a
  // layout effect (the textbook "concurrent-safe" form) would instead open a
  // child-first staleness window, since a child's effects run before this
  // parent's — strictly worse for refs that only ever feed event handlers.
  const dataRef = useRef(data)
  dataRef.current = data
  const setDataRef = useRef(setData)
  setDataRef.current = setData
  const translateRef = useRef(translate)
  translateRef.current = translate
  const rootNodeDataRef = useRef(nodeData)
  rootNodeDataRef.current = nodeData
  const srcEditRef = useRef(srcEdit)
  srcEditRef.current = srcEdit
  const srcDeleteRef = useRef(srcDelete)
  srcDeleteRef.current = srcDelete
  const srcAddRef = useRef(srcAdd)
  srcAddRef.current = srcAdd

  // Stable accessor for the latest whole document, so a memoized node can read
  // the live tree at event time (onChange `currentData`, Tab navigation) rather
  // than the `nodeData.fullData` prop, which a bailed sibling keeps stale.
  const getLatestData = useCallback(() => dataRef.current, [])

  // Stabilise the consumer's side-effect callbacks the same way, so a node that
  // bails out of re-rendering still invokes the latest implementation (not a
  // stale closure) when the consumer passes them inline.
  const onChangeStable = useStableCallback(onChange)
  const onErrorStable = useStableCallback(onError)
  const onCollapseStable = useStableCallback(onCollapse)
  const onEditEventStable = useStableCallback(onEditEvent)

  // Common method for handling data update. It runs the updated data through
  // provided "onUpdate" function, then updates data state or returns error
  // information accordingly
  const handleEdit = useCallback(
    async (updateMethod: UpdateFunction, input: UpdateFunctionProps) => {
      const result = await updateMethod(input)

      if (result === true || result === undefined) {
        setDataRef.current(input.newData)
        return
      }

      const returnTuple = isUpdateReturnTuple(result) ? result : ['error', result]
      const [type, resultValue] = returnTuple

      if (type === 'error') {
        setDataRef.current(input.currentData)
        return resultValue === false
          ? translateRef.current('ERROR_UPDATE', rootNodeDataRef.current)
          : String(resultValue)
      }

      setDataRef.current(resultValue)
    },
    []
  )

  const onEdit: InternalUpdateFunction = useCallback(
    async (value, path) => {
      const { currentData, newData, currentValue, newValue } = updateDataObject(
        dataRef.current,
        path,
        value,
        'update'
      )
      if (currentValue === newValue) return

      return await handleEdit(srcEditRef.current, {
        currentData,
        newData,
        currentValue,
        newValue,
        name: path.slice(-1)[0],
        path,
      })
    },
    [handleEdit]
  )

  const onDelete: InternalUpdateFunction = useCallback(
    async (value, path) => {
      const { currentData, newData, currentValue, newValue } = updateDataObject(
        dataRef.current,
        path,
        value,
        'delete'
      )

      return await handleEdit(srcDeleteRef.current, {
        currentData,
        newData,
        currentValue,
        newValue,
        name: path.slice(-1)[0],
        path,
      })
    },
    [handleEdit]
  )

  const onAdd: InternalUpdateFunction = useCallback(
    async (value, path, options) => {
      const { currentData, newData, currentValue, newValue } = updateDataObject(
        dataRef.current,
        path,
        value,
        'add',
        options
      )

      return await handleEdit(srcAddRef.current, {
        currentData,
        newData,
        currentValue,
        newValue,
        name: path.slice(-1)[0],
        path,
      })
    },
    [handleEdit]
  )

  // "onMove" is just a "Delete" followed by an "Add", but we combine into a
  // single "action" and only run one "onUpdate", which also means it'll be
  // registered as a single event in the "Undo" queue.
  // If either action returns an error, we reset the data the same way we do
  // when a single action returns error.
  const onMove = useCallback(
    async (
      sourcePath: CollectionKey[] | null,
      destPath: CollectionKey[],
      position: 'above' | 'below'
    ) => {
      if (sourcePath === null) return
      const { currentData, newData, currentValue } = updateDataObject(
        dataRef.current,
        sourcePath,
        '',
        'delete'
      )

      // Immediate key of the item being moved
      const originalKey = sourcePath.slice(-1)[0]
      // Where it's going
      const targetPath = destPath.slice(0, -1)
      // The key in the target path to insert before or after
      const insertPos = destPath.slice(-1)[0]

      let targetKey =
        typeof insertPos === 'number' // Moving TO an array
          ? position === 'above'
            ? insertPos
            : insertPos + 1
          : typeof originalKey === 'number'
          ? `arr_${originalKey}` // Moving FROM an array, so needs a key
          : originalKey // Moving from object to object

      const sourceBase = sourcePath.slice(0, -1).join('.')
      const destBase = destPath.slice(0, -1).join('.')

      if (
        sourceBase === destBase &&
        typeof originalKey === 'number' &&
        typeof targetKey === 'number' &&
        originalKey < targetKey
      ) {
        targetKey -= 1
      }

      const insertOptions =
        typeof targetKey === 'number'
          ? { insert: true }
          : position === 'above'
          ? { insertBefore: insertPos }
          : { insertAfter: insertPos }

      const { newData: addedData, newValue: addedValue } = updateDataObject(
        newData,
        [...targetPath, targetKey],
        currentValue,
        'add',
        insertOptions as UpdateOptions
      )

      return await handleEdit(srcEditRef.current, {
        currentData,
        newData: addedData,
        currentValue,
        newValue: addedValue,
        name: destPath.slice(-1)[0],
        path: destPath,
      })
    },
    [handleEdit]
  )

  const restrictEditFilter = useMemo(() => getFilterFunction(restrictEdit), [restrictEdit])
  const restrictDeleteFilter = useMemo(() => getFilterFunction(restrictDelete), [restrictDelete])
  const restrictAddFilter = useMemo(() => getFilterFunction(restrictAdd), [restrictAdd])
  const restrictDragFilter = useMemo(() => getFilterFunction(restrictDrag), [restrictDrag])
  const searchFilter = useMemo(() => getSearchFilter(searchFilterInput), [searchFilterInput])

  const fullKeyboardControls = useMemo(
    () => getFullKeyboardControlMap(keyboardControls),
    [keyboardControls]
  )

  const handleKeyboardCallback = useCallback(
    (e: React.KeyboardEvent, eventMap: Partial<Record<keyof KeyboardControls, () => void>>) =>
      handleKeyPress(fullKeyboardControls, eventMap, e),
    [fullKeyboardControls]
  )

  const jsonStringifyReplacement = useMemo(() => {
    const replacerFn = getJsonReplacerFn<unknown, unknown>(
      customNodeDefinitions,
      'stringifyReplacer'
    )
    return (data: JsonData) => jsonStringify(data, replacerFn)
  }, [customNodeDefinitions, jsonStringify])

  const jsonParseReplacement = useMemo(() => {
    const reviverFn = getJsonReplacerFn<string, unknown>(customNodeDefinitions, 'parseReviver')

    return (data: string) => {
      const parsed = jsonParse(data, reviverFn)
      return restoreUndefined(parsed)
    }
  }, [customNodeDefinitions, jsonParse])

  const editConfirmRef = useRef<HTMLDivElement>(null)
  useTriggers(externalTriggers, editConfirmRef)

  // Common "sort" method for ordering nodes, based on the `keySort` prop
  // - If it's false (the default), we do nothing
  // - If true, use default array sort on the node's key
  // - Otherwise sort via the defined comparison function
  // The "nodeMap" is due  to the fact that this sort is performed on different
  //   shaped arrays in different places, so in each implementation we pass a
  //   function to convert each element into a [key, value] tuple, the shape
  //   expected by the comparison function
  const sort = useCallback(
    <T,>(arr: T[], nodeMap: (input: T) => [string | number, unknown]) => {
      if (keySort === false) return

      if (typeof keySort === 'function') {
        arr.sort((a, b) => keySort(nodeMap(a), nodeMap(b)))
        return
      }

      arr.sort((a, b) => {
        const A = nodeMap(a)[0]
        const B = nodeMap(b)[0]
        if (A < B) return -1
        if (A > B) return 1
        return 0
      })
    },
    [keySort]
  )

  const customNodeData = getCustomNode(customNodeDefinitions, nodeData)

  // Stable object so it doesn't churn the node prop comparison every render.
  const insertAtTopOption = useMemo(
    () => ({
      object: insertAtTop === true || insertAtTop === 'object',
      array: insertAtTop === true || insertAtTop === 'array',
    }),
    [insertAtTop]
  )

  const otherProps = {
    mainContainerRef: mainContainerRef as React.MutableRefObject<Element>,
    name: rootName,
    nodeData,
    getLatestData,
    onEdit,
    onDelete,
    onAdd,
    onChange: onChangeStable,
    onError: onErrorStable,
    onEditEvent: onEditEventStable,
    showErrorMessages,
    onMove,
    showCollectionCount,
    collapseFilter,
    collapseAnimationTime,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    restrictTypeSelection,
    restrictDragFilter,
    canDragOnto: false, // can't drag onto outermost container
    searchFilter,
    searchText: debouncedSearchText,
    enableClipboard,
    keySort,
    sort,
    showArrayIndices,
    arrayIndexFromOne,
    showStringQuotes,
    showIconTooltips,
    indent,
    defaultValue,
    newKeyOptions,
    stringTruncate,
    translate,
    customNodeDefinitions,
    customNodeData,
    customButtons,
    parentData: null,
    jsonParse: jsonParseReplacement,
    jsonStringify: jsonStringifyReplacement,
    TextEditor,
    errorMessageTimeout,
    handleKeyboard: handleKeyboardCallback,
    keyboardControls: fullKeyboardControls,
    insertAtTop: insertAtTopOption,
    onCollapse: onCollapseStable,
    editConfirmRef,
    collapseClickZones,
  }

  const mainContainerStyles = { ...getStyles('container', nodeData), minWidth, maxWidth }

  // Props fontSize takes priority over theme, but we fall back on a default of
  // 16 (from CSS sheet) if neither are provided. Having a defined base size
  // ensures the component doesn't have its fontSize affected from the parent
  // environment
  mainContainerStyles.fontSize = rootFontSize ?? mainContainerStyles.fontSize

  return (
    <div
      id={id}
      ref={mainContainerRef}
      className={`jer-editor-container ${className ?? ''}`}
      style={mainContainerStyles}
    >
      {isCollection(data) && !customNodeData.renderCollectionAsValue ? (
        <CollectionNode data={data} {...otherProps} />
      ) : (
        <ValueNodeWrapper data={data as ValueData} showLabel {...otherProps} />
      )}
    </div>
  )
}

export function JsonEditor<T = JsonData>(props: JsonEditorProps<T>): React.ReactElement | null {
  const [docRoot, setDocRoot] = useState<HTMLElement>()

  // We want access to the global document.documentElement object, but can't
  // access it directly when used with SSR. So we set it inside a `useEffect`,
  // which won't run server-side (it'll just be undefined) until client
  // hydration
  useEffect(() => {
    const root = document.documentElement
    setDocRoot(root)
  }, [])

  if (!docRoot) return null

  // Cast at the boundary — the internal Editor and tree operate on `JsonData`,
  // generics only flow to the public surface for consumer typing.
  const innerProps = props as unknown as JsonEditorProps<JsonData>

  return (
    <ThemeProvider theme={innerProps.theme ?? defaultTheme} icons={innerProps.icons} docRoot={docRoot}>
      <TreeStateProvider onEditEvent={innerProps.onEditEvent} onCollapse={innerProps.onCollapse}>
        <Editor {...innerProps} />
      </TreeStateProvider>
    </ThemeProvider>
  )
}

interface UpdateOptions {
  remove?: boolean
  insert?: boolean
  insertBefore?: string | number
  insertAfter?: string | number
}

const updateDataObject = (
  data: JsonData,
  path: Array<string | number>,
  newValue: unknown,
  action: 'update' | 'delete' | 'add',
  insertOptions: AssignOptions = {}
) => {
  if (path.length === 0) {
    return {
      currentData: data,
      newData: newValue as CollectionData,
      currentValue: data,
      newValue,
    }
  }

  const assignOptions: UpdateOptions = {
    remove: action === 'delete',
    ...insertOptions,
  }

  const currentValue = action !== 'add' ? extract(data, path) : undefined
  const newData = assign(data as AssignInput, path, newValue, assignOptions)

  return {
    currentData: data,
    newData,
    currentValue,
    newValue: action !== 'delete' ? newValue : undefined,
  }
}

const getFilterFunction = (
  propValue: boolean | number | FilterFunction
): FilterFunction => {
  if (typeof propValue === 'boolean') return () => propValue
  if (typeof propValue === 'number') return ({ level }) => level >= propValue
  return propValue
}

const getSearchFilter = (
  searchFilterInput: 'key' | 'value' | 'all' | SearchFilterFunction | undefined
): SearchFilterFunction | undefined => {
  if (searchFilterInput === undefined) return undefined
  if (searchFilterInput === 'value') {
    return matchNode as SearchFilterFunction
  }
  if (searchFilterInput === 'key') {
    return matchNodeKey
  }
  if (searchFilterInput === 'all') {
    return (inputData, searchText) =>
      matchNode(inputData, searchText) || matchNodeKey(inputData, searchText)
  }
  return searchFilterInput
}

const isUpdateReturnTuple = (
  input: UpdateFunctionReturn | string | boolean | undefined
): input is UpdateFunctionReturn => {
  return Array.isArray(input) && input.length === 2 && ['error', 'value'].includes(input[0])
}

// Combines all the replacer or reviver functions from the Custom node
// definitions into a single replacer/reviver function for the internal
// jsonStringify and jsonParse methods
const getJsonReplacerFn = <T, U>(
  customNodeDefinitions: CustomNodeDefinition[],
  method: 'stringifyReplacer' | 'parseReviver'
): ((key: string, value: T) => U) | undefined => {
  const replacers: (((value: unknown) => unknown) | ((stringified: string) => unknown))[] =
    // For "undefined", we hard-code this stringify replacer, as the restore
    // when parsing has to be handled internally (as reviver function can't
    // return undefined)
    method === 'stringifyReplacer'
      ? [(value: unknown) => (value === undefined ? UNDEFINED : value)]
      : []

  replacers.push(...customNodeDefinitions.map((r) => r[method]).filter((r) => !!r))

  if (replacers.length === 0) return undefined

  return (_: string, value: T) => {
    let result: unknown = value

    for (const replacer of replacers) {
      result = replacer(result as string)
    }

    return result as U
  }
}
