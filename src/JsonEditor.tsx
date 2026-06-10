import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { assign, type AssignOptions, type AssignInput } from './utils/assign'
import { extract } from './utils/extract'
import { CollectionNode } from './CollectionNode'
import { NativeSelect } from './NativeSelect'
import { getFullKeyboardControlMap, handleKeyPress } from './utils/keyboard'
import { matchNode, matchNodeKey } from './utils/filter'
import { isCollection, NOOP, restoreUndefined, UNDEFINED } from './utils/misc'
import {
  type CollectionData,
  type JsonEditorProps,
  type FilterFunction,
  type NodeData,
  type SearchFilterFunction,
  type CollectionKey,
  type UpdateFunctionProps,
  type UpdateControl,
  type JerErrorCode,
  type SortFunction,
  type BuildNodeDataFromPath,
  type BuildNodeDataFromPathRef,
  type JsonData,
  type KeyboardControls,
  ValueData,
  CustomNodeDefinition,
} from './types'
import {
  useTheme,
  ThemeProvider,
  TreeStateProvider,
  defaultTheme,
  useEditingStore,
  useCollapse,
} from './contexts'
import {
  type CommitPrimitives,
  type CommitRequest,
  type BuiltCommit,
  type UpdateOutcome,
} from './contexts/EditingProvider'
import { getTranslateFunction, type LocalisedStrings } from './localisation'
import { ValueNodeWrapper } from './ValueNodeWrapper'

import './style.css'
import { getCustomNode } from './CustomNode'

// Module-scoped so the default is a stable reference across renders;
// an inline default would clobber in-progress edits in CollectionNode.
const defaultJsonStringify = (
  data: JsonData,
  replacer?: (key: string, value: unknown) => unknown
) => JSON.stringify(data, replacer, 2)

// The localisation key for a generic reject (`onUpdate` → `false`), per event,
// so the message matches the `onError` code the node routes it to (`ADD_ERROR`,
// `DELETE_ERROR`, `RENAME_ERROR`, `MOVE_ERROR`). `edit` uses `ERROR_UPDATE`,
// which also covers internal failures (code `UPDATE_ERROR`). Typed as an
// exhaustive `Record` over the event union so a new event can't slip through.
const ERROR_MESSAGE_KEY: Record<UpdateFunctionProps['event'], keyof LocalisedStrings> = {
  edit: 'ERROR_UPDATE',
  add: 'ERROR_ADD',
  delete: 'ERROR_DELETE',
  rename: 'ERROR_RENAME',
  move: 'ERROR_MOVE',
}

// The `onError` code per event, so a generic (`false`) reject surfaces with the
// matching code alongside the `ERROR_MESSAGE_KEY` message.
const ERROR_CODE: Record<UpdateFunctionProps['event'], JerErrorCode> = {
  edit: 'UPDATE_ERROR',
  add: 'ADD_ERROR',
  delete: 'DELETE_ERROR',
  rename: 'RENAME_ERROR',
  move: 'MOVE_ERROR',
}

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
  // Keep the last DEFINED callback — never overwrite with `undefined`. The
  // wrapper is only handed out while `cb` is defined, and holding a real
  // function means even a prior render's wrapper invoked after `cb` is removed
  // (a concurrent-mode window) can't deref `undefined` via the `!` below.
  // Parameterising by Args/R keeps the wrapper's signature == cb's (no cast).
  if (cb) ref.current = cb
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

const Editor: React.FC<
  JsonEditorProps<JsonData> & {
    buildNodeDataFromPathRef: BuildNodeDataFromPathRef
    commitRef: React.RefObject<CommitPrimitives | undefined>
  }
> = ({
  data,
  setData,
  buildNodeDataFromPathRef,
  commitRef,
  rootName = 'root',
  onUpdate = NOOP,
  onChange,
  onError,
  onEditEvent,
  showErrorMessages = true,
  allowClipboard = true,
  onCopy,
  indent = 2,
  collapse = false,
  collapseAnimationTime = 300, // must be equivalent to CSS value
  showCollectionCount = 'when-closed',
  allowEdit = true,
  allowDelete = true,
  allowAdd = true,
  allowTypeSelection = true,
  allowDrag = false,
  searchFilter: searchFilterInput,
  searchText,
  searchDebounceTime = 350,
  sortKeys = false,
  showArrayIndexes = true,
  arrayIndexStart = 0,
  showStringQuotes = true,
  showIconTooltips = false,
  defaultValue = null,
  newKeyOptions,
  minWidth = 250,
  maxWidth = 'min(600px, 90vw)',
  baseFontSize,
  stringTruncateLength = 250,
  translations = EMPTY_TRANSLATIONS,
  className,
  id,
  customText = EMPTY_CUSTOM_TEXT,
  customNodeDefinitions = EMPTY_CUSTOM_NODE_DEFINITIONS,
  customButtons = EMPTY_CUSTOM_BUTTONS,
  jsonParse = JSON.parse,
  jsonStringify = defaultJsonStringify,
  TextEditor,
  CustomSelect: Select = NativeSelect,
  errorDisplayTime = 2500,
  keyboardControls = EMPTY_KEYBOARD_CONTROLS,
  editorRef,
  insertAtTop = false,
  onCollapse,
  collapseClickZones = DEFAULT_COLLAPSE_CLICK_ZONES,
}) => {
  const { getStyles } = useTheme()
  // Root must not subscribe to editing state — that would re-render the whole
  // tree on every edit transition. Read the actions from the stable store
  // (used by the cancel-on-unmount cleanup and the `editorRef` handle below).
  const { open: openEditSession, cancel: cancelEditSession } = useEditingStore()
  const collapseFilter = useMemo(() => getFilterFunction(collapse), [collapse])
  const translate = useMemo(
    () => getTranslateFunction(translations, customText),
    [translations, customText]
  )
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText)

  const mainContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cancelEditSession()
    const debounce = setTimeout(() => setDebouncedSearchText(searchText), searchDebounceTime)
    return () => clearTimeout(debounce)
    // `cancelEditSession` is intentionally excluded — same reasoning as the
    // editorRef deps below: it's store-stable, but a consumer's inline
    // `onEditEvent` would re-bind it every render and re-fire this effect,
    // cancelling in-progress edits mid-keystroke. React still picks up the
    // latest closure when a listed dep changes, so cancel runs once per
    // genuine search-input change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, searchDebounceTime])

  // Root node (path []). Same canonical builder the `editorRef` handle uses.
  const nodeData: NodeData = buildNodeData(data, [], rootName)

  // Refs-to-latest so the update callbacks below can be referentially STABLE
  // (useCallback with empty deps) yet always act on the current data and the
  // latest consumer callbacks — even when those are passed inline (as the demo
  // does). Stable identities are what let the React.memo'd nodes bail out
  // instead of re-rendering the whole tree on every commit.
  //
  // Writing `.current` during render is safe here because every read happens in
  // an event handler or async committer (the `useCallback`s below, and the
  // stabilised side-effect callbacks) — never during render to produce output.
  // With no mid-render read there is nothing to tear. Moving these writes into
  // a layout effect (the textbook "concurrent-safe" form) would instead open a
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
  // Single result-producer source (§17): one `onUpdate` for every operation.
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const rootNameRef = useRef(rootName)
  rootNameRef.current = rootName
  // Assigned just after `sort` is defined below; lets the stable update
  // handlers build a node's full `NodeData` payload with the live comparator.
  const sortRef = useRef<SortFunction | undefined>(undefined)

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
  const onCopyStable = useStableCallback(onCopy)

  // Document-mutation primitives the EditingProvider's commit engine calls.
  // The Provider owns the lifecycle (when to apply optimistically, gate,
  // settle, and which events fire); these own `setData`/`updateDataObject`.
  // Read the live document via refs so their identity stays stable (the memo'd
  // nodes bail).
  //
  // Every document write goes through `commitDocument`, which updates
  // `dataRef` *synchronously* before calling `setData`. This keeps the
  // latest-data ref consistent with optimistic writes rather than only with
  // rendered state: a synchronous `onUpdate` (e.g. `() => false`) resolves its
  // settlement in a microtask that runs *before* React re-renders, so a revert
  // reading `dataRef.current` would otherwise see the pre-apply document and
  // either undo the wrong thing or throw (deleting a not-yet-present added
  // key). The next render's `dataRef.current = data` (above) reconciles it
  // back to the real state — identical when `setData` is the recommended
  // controlled setter.
  const commitDocument = useCallback((d: unknown) => {
    dataRef.current = d as JsonData
    setDataRef.current(d as JsonData)
  }, [])

  const applyValue = useCallback(
    (path: CollectionKey[], value: unknown) => {
      commitDocument(updateDataObject(dataRef.current, path, value, 'update').newData)
    },
    [commitDocument]
  )

  // Prepare a commit for any op: compute `newData`, the `onUpdate` input, and
  // the optimistic `apply` + per-path `revert` thunks. `revert` reads the LIVE
  // doc so a late failure restores the right node without clobbering concurrent
  // commits to other paths (an edit re-sets the old value; add/delete invert;
  // move restores the pre-move doc — see the `move` case).
  const buildCommit = useCallback((request: CommitRequest): BuiltCommit | null => {
    const data = dataRef.current
    const rootName = rootNameRef.current
    const sort = sortRef.current
    const commitData = commitDocument
    const { op, path } = request

    switch (op) {
      case 'edit': {
        const { newData, currentValue, newValue } = updateDataObject(data, path, request.value, 'update')
        const nodeData = buildNodeData(data, path, rootName, sort)
        return {
          input: { ...nodeData, newData, event: 'edit', newValue } as UpdateFunctionProps,
          nodeData,
          isNoOp: currentValue === newValue,
          apply: () => commitData(newData),
          revert: () =>
            commitData(updateDataObject(dataRef.current, path, currentValue, 'update').newData),
        }
      }
      case 'delete': {
        const { newData, currentValue } = updateDataObject(data, path, '', 'delete')
        const nodeData = buildNodeData(data, path, rootName, sort)
        return {
          input: { ...nodeData, newData, event: 'delete' } as UpdateFunctionProps,
          nodeData,
          isNoOp: false,
          apply: () => commitData(newData),
          // Re-insert the removed value at its ORIGINAL position (a plain `add`
          // appends the key to the end of the object). `nodeData.index` is the
          // node's position in its parent. `insertBefore` is read for an object
          // parent, `insert` for an array — passing both is harmless (each path
          // ignores the other).
          revert: () =>
            commitData(
              updateDataObject(dataRef.current, path, currentValue, 'add', {
                insert: true,
                insertBefore: nodeData.index,
              }).newData
            ),
        }
      }
      case 'add': {
        // `path` is the collection; the new child lands at `[...path, key]`.
        const childPath = [...path, request.key]
        const { newData, newValue } = updateDataObject(
          data,
          childPath,
          request.value,
          'add',
          request.options
        )
        // Event payload describes the committed child (post-add
        // position/value).
        const nodeData = buildNodeData(newData, childPath, rootName, sort)
        return {
          // The new node doesn't exist in `data` yet for the `onUpdate` input —
          // build its position from `newData`, but describe the PRE-add state
          // otherwise (value unset, size null, current parent + document).
          input: {
            ...nodeData,
            value: undefined,
            size: null,
            parentData: (extract(data, path) ?? null) as object | null,
            fullData: data,
            newData,
            event: 'add',
            newValue,
          } as UpdateFunctionProps,
          nodeData,
          isNoOp: false,
          apply: () => commitData(newData),
          revert: () => commitData(updateDataObject(dataRef.current, childPath, '', 'delete').newData),
        }
      }
      case 'rename': {
        const parentPath = path.slice(0, -1)
        const oldKey = path[path.length - 1]
        const { newKey } = request
        const parentData = extract(data, parentPath) as Record<string, unknown>
        const renamedParent = Object.fromEntries(
          Object.entries(parentData).map(([k, v]) => (k === oldKey ? [newKey, v] : [k, v]))
        )
        // `updateDataObject` handles the root case (`parentPath === []`).
        const { newData } = updateDataObject(data, parentPath, renamedParent, 'update')
        const nodeData = buildNodeData(data, path, rootName, sort)
        return {
          input: { ...nodeData, newData, event: 'rename', newKey } as UpdateFunctionProps,
          nodeData,
          isNoOp: false,
          apply: () => commitData(newData),
          // Restore the parent with its original key order.
          revert: () =>
            commitData(updateDataObject(dataRef.current, parentPath, parentData, 'update').newData),
          extra: { oldKey, newKey },
        }
      }
      case 'move': {
        // Delete source + add at target, combined into one commit (the old
        // `onMove`). A combined op can't be per-path-reversed, so `revert`
        // restores the pre-move document (the rare optimistic-move-then-fail).
        const sourcePath = path
        const { path: destPath, position } = request.to
        const preMove = data
        const { newData: deletedData, currentValue } = updateDataObject(data, sourcePath, '', 'delete')
        const originalKey = sourcePath.slice(-1)[0]
        const targetPath = destPath.slice(0, -1)
        const insertPos = destPath.slice(-1)[0]
        let targetKey =
          typeof insertPos === 'number'
            ? position === 'above'
              ? insertPos
              : insertPos + 1
            : typeof originalKey === 'number'
            ? `arr_${originalKey}`
            : originalKey
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
        const landingPath = [...targetPath, targetKey]
        const { newData } = updateDataObject(
          deletedData,
          landingPath,
          currentValue,
          'add',
          insertOptions as UpdateOptions
        )
        const nodeData = buildNodeData(data, sourcePath, rootName, sort)
        return {
          input: { ...nodeData, newData, event: 'move', newPath: landingPath } as UpdateFunctionProps,
          nodeData,
          isNoOp: false,
          apply: () => commitData(newData),
          revert: () => commitData(preMove),
        }
      }
    }
  }, [commitDocument])

  // Runs the consumer's `onUpdate` and normalises its raw return to the
  // canonical outcome the commit engine acts on — including the localised,
  // event-specific reject message (so it matches the `onError` code the node
  // surfaces). This is the old synchronous result-protocol, minus `setData`
  // (now the engine's job).
  const runUpdate = useCallback(
    async (input: UpdateFunctionProps, control: UpdateControl): Promise<UpdateOutcome> => {
      const code = ERROR_CODE[input.event]
      const defaultMessage = () =>
        translateRef.current(ERROR_MESSAGE_KEY[input.event], rootNodeDataRef.current)
      let result
      try {
        result = await onUpdateRef.current(input, control)
      } catch (err) {
        // Rejected promise → treat as a reject; surface the thrown message if
        // present (also stops it escaping as an unhandled rejection).
        const message =
          err instanceof Error && err.message
            ? err.message
            : typeof err === 'string' && err
            ? err
            : defaultMessage()
        return { status: 'error', error: { code, message } }
      }
      if (result === false) return { status: 'error', error: { code, message: defaultMessage() } }
      if (result === null) return { status: 'cancel' }
      if (result && typeof result === 'object') {
        if (result.error !== undefined)
          return typeof result.error === 'string'
            ? { status: 'error', error: { code, message: result.error } }
            : { status: 'error', error: result.error }
        if (result.value !== undefined) return { status: 'override', value: result.value as JsonData }
      }
      return { status: 'commit' }
    },
    []
  )

  // The commit primitives handed to the EditingProvider via `commitRef`.
  // Assigned every render (same bridge pattern as `buildNodeDataFromPathRef`);
  // the store reads it only at event time.
  const commitPrimitives = useMemo<CommitPrimitives>(
    () => ({
      // `undefined` when the consumer supplied no `onUpdate` (it defaulted to
      // NOOP) — the engine then skips the settlement phase (no `update*`).
      runUpdate: onUpdate === NOOP ? undefined : runUpdate,
      buildCommit,
      applyValue,
    }),
    [runUpdate, buildCommit, applyValue, onUpdate]
  )
  commitRef.current = commitPrimitives

  const allowEditFilter = useMemo(() => getFilterFunction(allowEdit), [allowEdit])
  const allowDeleteFilter = useMemo(() => getFilterFunction(allowDelete), [allowDelete])
  const allowAddFilter = useMemo(() => getFilterFunction(allowAdd), [allowAdd])
  const allowDragFilter = useMemo(() => getFilterFunction(allowDrag), [allowDrag])
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
  const { setCollapseState } = useCollapse()

  // Common "sort" method for ordering nodes, based on the `sortKeys` prop
  // - If it's false (the default), we do nothing
  // - If true, use default array sort on the node's key
  // - Otherwise sort via the defined comparison function
  // The "nodeMap" is due  to the fact that this sort is performed on different
  //   shaped arrays in different places, so in each implementation we pass a
  //   function to convert each element into a [key, value] tuple, the shape
  //   expected by the comparison function
  const sort = useCallback(
    <T,>(arr: T[], nodeMap: (input: T) => [string | number, unknown]) => {
      if (sortKeys === false) return

      if (typeof sortKeys === 'function') {
        arr.sort((a, b) => sortKeys(nodeMap(a), nodeMap(b)))
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
    [sortKeys]
  )
  // Late-assigned (see the ref declaration above): the stable update handlers
  // read the live comparator from here when building a node's `NodeData`.
  sortRef.current = sort

  // Populate the bridge the editing/collapse providers read at event time to
  // build a node's flat `NodeData` from just a path (they're ancestors of
  // this component, so they can't reach `getLatestData`/`sort` directly).
  // Stable over `getLatestData`; reads `rootName`/`sort` from refs so the
  // identity holds.
  const buildNodeDataFromPath = useCallback<BuildNodeDataFromPath>(
    (path) => buildNodeData(getLatestData(), path, rootNameRef.current, sortRef.current),
    [getLatestData]
  )
  buildNodeDataFromPathRef.current = buildNodeDataFromPath

  // Imperative handle (`editorRef` prop). UI-interactions only (§17): open a
  // value-edit session, commit/cancel it, or collapse nodes — never mutates
  // data directly (the consumer owns `data`/`setData`). Every method reads
  // the LIVE tree at call time, never a frozen render closure (per
  // PERF-ARCHITECTURE). Declared after `sort` because `startEdit`'s
  // restriction pre-check rebuilds the target's NodeData via it.
  useImperativeHandle(
    editorRef,
    () => {
      // A sentinel lets us detect a gone path (`extract` returns it instead
      // of throwing), so a stale target reports `PATH_NOT_FOUND` rather than
      // crashing.
      const SENTINEL = Symbol('path-missing')
      return {
        collapse: (state) => setCollapseState(state),

        // Open a value-edit session, or report why it couldn't:
        // `'PATH_NOT_FOUND'` if the target is gone, `'RESTRICTED'` if
        // `allowEdit` blocks it (unless `overrideRestrictions`). `force: true`
        // skips the node's own re-check and auto-reveals a target collapsed
        // below the mount frontier.
        startEdit: ({ path, overrideRestrictions = false }) => {
          if (extract(getLatestData(), path, SENTINEL) === SENTINEL) return 'PATH_NOT_FOUND'
          if (
            !overrideRestrictions &&
            !allowEditFilter(buildNodeData(getLatestData(), path, rootName, sort))
          )
            return 'RESTRICTED'
          openEditSession(path, { force: true })
          return true
        },

        // Commit the open session by clicking the live confirm button, then
        // exit. No-op when there's no live confirm control to click (no
        // session, or a session whose confirm control isn't mounted/tracked
        // here): the unconditional `cancelEditSession()` would otherwise tear
        // down a session we never committed (e.g. silently cancelling a
        // key-rename).
        confirm: () => {
          if (!editConfirmRef.current) return
          editConfirmRef.current.click()
          cancelEditSession()
        },

        cancel: () => cancelEditSession(),
      }
    },
    [setCollapseState, openEditSession, cancelEditSession, allowEditFilter, getLatestData, rootName, sort]
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
    onChange: onChangeStable,
    onError: onErrorStable,
    onEditEvent: onEditEventStable,
    showErrorMessages,
    showCollectionCount,
    collapseFilter,
    collapseAnimationTime,
    allowEditFilter,
    allowDeleteFilter,
    allowAddFilter,
    allowTypeSelection,
    allowDragFilter,
    canDragOnto: false, // can't drag onto outermost container
    searchFilter,
    searchText: debouncedSearchText,
    allowClipboard,
    onCopy: onCopyStable,
    sortKeys,
    sort,
    showArrayIndexes,
    arrayIndexStart,
    showStringQuotes,
    showIconTooltips,
    indent,
    defaultValue,
    newKeyOptions,
    stringTruncateLength,
    translate,
    customNodeDefinitions,
    customNodeData,
    customButtons,
    parentData: null,
    jsonParse: jsonParseReplacement,
    jsonStringify: jsonStringifyReplacement,
    TextEditor,
    Select,
    errorDisplayTime,
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
  mainContainerStyles.fontSize = baseFontSize ?? mainContainerStyles.fontSize

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

  // Shared bridge (load-bearing, by design — not a leak). The §16 perf work
  // put the editing store and collapse state in ancestor providers so nodes
  // can subscribe to slivers via `useSyncExternalStore` without re-rendering
  // the tree. Those providers fire some observer events imperatively —
  // `onEditEvent` start/cancel (EditingProvider) and the once-per-command
  // `onCollapse` broadcast (CollapseProvider) — but they sit ABOVE `Editor`,
  // which owns the data, so they can't build a node's `NodeData` themselves.
  // `Editor` writes this ref each render (below); the providers read it at
  // event time to turn a path into flat `NodeData`. (The node-driven events —
  // confirm*/delete/move, user-click collapse — fire straight from the node
  // and never touch this.)
  const buildNodeDataFromPathRef = useRef<BuildNodeDataFromPath | undefined>(undefined)
  // Same bridge pattern: the inner `Editor` (data owner) populates this with
  // the commit primitives the EditingProvider's engine calls at event time.
  const commitRef = useRef<CommitPrimitives | undefined>(undefined)

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
      <TreeStateProvider
        onEditEvent={innerProps.onEditEvent}
        onCollapse={innerProps.onCollapse}
        buildNodeDataFromPathRef={buildNodeDataFromPathRef}
        commitRef={commitRef}
      >
        <Editor
          {...innerProps}
          buildNodeDataFromPathRef={buildNodeDataFromPathRef}
          commitRef={commitRef}
        />
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

// Canonical `NodeData` builder: construct the data for any node from the live
// tree given its path. Used for the root node and by the `editorRef` handle to
// run a node's `allowEdit` filter at call time (the filter takes the full
// NodeData, not just a path). `index`/`size` mirror the child construction in
// CollectionNode so a filter keying off them sees the same input the rendered
// node would; `sort` (the `sortKeys` comparator) is only needed to resolve the
// `index` of an object child, so it's optional.
const buildNodeData = (
  fullData: JsonData,
  path: CollectionKey[],
  rootName: string,
  sort?: <T>(arr: T[], nodeMap: (input: T) => [string | number, unknown]) => void
): NodeData => {
  if (path.length === 0) {
    return {
      key: rootName,
      path: [],
      level: 0,
      index: 0,
      value: fullData,
      size: isCollection(fullData) ? Object.keys(fullData).length : 1,
      parentData: null,
      fullData,
    }
  }

  const key = path[path.length - 1]
  const value = extract(fullData, path) as JsonData
  const parentData = (extract(fullData, path.slice(0, -1)) ?? null) as object | null

  let index = 0
  if (Array.isArray(parentData)) {
    index = typeof key === 'number' ? key : Number(key)
  } else if (parentData && typeof parentData === 'object') {
    const entries = Object.entries(parentData) as Array<[string | number, unknown]>
    sort?.(entries, (entry) => entry)
    index = entries.findIndex(([k]) => k === key)
  }

  return {
    key,
    path,
    level: path.length,
    index,
    value,
    size: isCollection(value) ? Object.keys(value as object).length : null,
    parentData,
    fullData,
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
