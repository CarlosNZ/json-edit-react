import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { assign, type AssignOptions, type AssignInput } from './utils/assign'
import { buildNodeData } from './utils/buildNodeData'
import { extract } from './utils/extract'
import { CollectionNode } from './CollectionNode'
import { NativeSelect } from './NativeSelect'
import { getFullKeyboardControlMap, handleKeyPress } from './utils/keyboard'
import { computeFilterState, matchNode, matchNodeKey } from './utils/filter'
import { isCollection, isThenable, NOOP, restoreUndefined, UNDEFINED } from './utils/misc'
import {
  type CollectionData,
  type JsonEditorProps,
  type FilterFunction,
  type NodeData,
  type SearchFilterFunction,
  type CollectionKey,
  type UpdateFunctionProps,
  type UpdateResult,
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
  FilterStateProvider,
} from './contexts'
import {
  type CommitPrimitives,
  type CommitRequest,
  type BuiltCommit,
  type UpdateOutcome,
} from './contexts/EditingProvider'
import { getTranslateFunction, type LocalisedStrings } from './localisation'
import { ValueNodeWrapper } from './ValueNodeWrapper'

import { injectStyles } from './injectStyles'
import { getCustomNode } from './CustomNode'

// Module-scoped so the default is a stable reference across renders; an inline
// default would clobber in-progress edits in CollectionNode.
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
// renders — letting the memoised nodes bail — while always invoking the LATEST
// implementation, even when passed inline. The wrapper runs only from event
// handlers, never during render, so the render-time ref write can't tear.
// Returns `undefined` when the consumer supplied nothing, so downstream
// `if (cb)` guards still hold.
const useStableCallback = <Args extends unknown[], R>(
  cb: ((...args: Args) => R) | undefined
): ((...args: Args) => R) | undefined => {
  const ref = useRef(cb)
  // Keep the last DEFINED callback, never overwriting with `undefined`: the
  // wrapper is only handed out while `cb` is defined, and holding a real
  // function means a prior render's wrapper invoked after `cb` is removed (a
  // concurrent-mode window) can't deref `undefined` via the `!` below.
  if (cb) ref.current = cb
  const stable = useRef((...args: Args): R => ref.current!(...args))
  return cb ? stable.current : undefined
}

// Module-scoped stable defaults: a destructure default like `= []` allocates a
// fresh array every render when the prop is omitted, which would defeat the
// node memo boundary — the prop would look "changed" every render.
const EMPTY_CUSTOM_NODE_DEFINITIONS: CustomNodeDefinition[] = []
const DEFAULT_COLLAPSE_CLICK_ZONES: Array<'left' | 'header' | 'property'> = ['header', 'left']
// Same rationale: an omitted object/array prop allocating a fresh `{}`/`[]`
// every render churns the `useMemo`s deriving `translate`,
// `fullKeyboardControls` and the rest.
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
  showClipboardButton = true,
  onCopy,
  indent = 2,
  collapse = 3, // open the top 3 levels; deeper nodes start collapsed
  collapseAnimationTime = 300, // must be equivalent to CSS value
  showCollectionCount = 'when-collapsed-or-filtered',
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
  Select = NativeSelect,
  errorDisplayTime = 2500,
  keyboardControls = EMPTY_KEYBOARD_CONTROLS,
  editorRef,
  insertAtTop = false,
  onCollapse,
  collapseClickZones = DEFAULT_COLLAPSE_CLICK_ZONES,
}) => {
  const { getStyles, cssVars } = useTheme()
  // The root must not subscribe to editing state, or the whole tree re-renders
  // on every edit transition. Read the actions from the stable store instead,
  // for the cancel-on-unmount cleanup and the `editorRef` handle below.
  const {
    open: openEditSession,
    cancel: cancelEditSession,
    getSnapshot: getEditingSnapshot,
  } = useEditingStore()
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
    // `cancelEditSession` is deliberately excluded. It's store-stable, but a
    // consumer's inline `onEditEvent` would re-bind it every render and re-fire
    // this effect, cancelling in-progress edits mid-keystroke. React still
    // picks up the latest closure when a listed dep changes, so the cancel runs
    // once per genuine search-input change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, searchDebounceTime])

  // Root node (path []). Same canonical builder the `editorRef` handle uses.
  const nodeData: NodeData = buildNodeData(data, [], rootName)

  // Refs-to-latest, so the update callbacks below can be referentially STABLE
  // (`useCallback` with empty deps) yet always act on the current data and the
  // latest consumer callbacks, even when those are passed inline. Those stable
  // identities are what let the memoised nodes bail out instead of re-rendering
  // the whole tree on every commit.
  //
  // Writing `.current` during render is safe here: every read happens in an
  // event handler or async committer, never during render to produce output, so
  // there is nothing to tear. Moving these writes into a layout effect (the
  // textbook "concurrent-safe" form) would open a child-first staleness window
  // instead, since a child's effects run before this parent's.
  const dataRef = useRef(data)
  dataRef.current = data
  const setDataRef = useRef(setData)
  setDataRef.current = setData
  const translateRef = useRef(translate)
  translateRef.current = translate
  const rootNodeDataRef = useRef(nodeData)
  rootNodeDataRef.current = nodeData
  // The single result-producer: one `onUpdate` for every operation.
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

  // Document-mutation primitives the EditingProvider's commit engine calls. The
  // provider owns the lifecycle — when to apply optimistically, gate, settle,
  // and which events fire — while these own `setData`/`updateDataObject`. They
  // read the live document via refs, so their identity stays stable.
  //
  // Every document write goes through `commitDocument`, which updates `dataRef`
  // synchronously before calling `setData`, keeping the latest-data ref
  // consistent with optimistic writes rather than only with rendered state. A
  // synchronous `onUpdate` settles in a microtask that runs before React
  // re-renders, so a revert reading `dataRef.current` would otherwise see the
  // pre-apply document and either undo the wrong thing or throw (deleting a
  // not-yet-present added key). The next render's `dataRef.current = data`
  // reconciles it back to the real state.
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
  // the optimistic `apply` plus per-path `revert` thunks. `revert` reads the
  // LIVE document, so a late failure restores the right node without clobbering
  // concurrent commits to other paths.
  const buildCommit = useCallback(
    (request: CommitRequest): BuiltCommit | null => {
      const data = dataRef.current
      const rootName = rootNameRef.current
      const sort = sortRef.current
      const commitData = commitDocument
      const { op, path } = request

      switch (op) {
        case 'edit': {
          const { newData, currentValue, newValue } = updateDataObject(
            data,
            path,
            request.value,
            'update'
          )
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
            // Re-insert at the node's ORIGINAL position, since a plain `add`
            // appends to the end of the object. An object parent reads
            // `insertBefore` and an array reads `insert`; passing both is
            // harmless, as each ignores the other.
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
          // Describes the committed child: post-add position and value.
          const nodeData = buildNodeData(newData, childPath, rootName, sort)
          return {
            // The new node doesn't exist in `data` yet, so take its position
            // from `newData` but describe the PRE-add state otherwise: value
            // unset, size null, and the current parent and document.
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
            revert: () =>
              commitData(updateDataObject(dataRef.current, childPath, '', 'delete').newData),
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
            // A same-key rename is a no-op: the engine fires `commitRename`
            // and skips `onUpdate`, as an unchanged value edit does with
            // `commitEdit`.
            isNoOp: oldKey === newKey,
            apply: () => commitData(newData),
            // Restore the parent with its original key order.
            revert: () =>
              commitData(
                updateDataObject(dataRef.current, parentPath, parentData, 'update').newData
              ),
            extra: { oldKey, newKey },
          }
        }
        case 'move': {
          // Delete source + add at target, combined into one commit. A
          // combined op can't be reversed per-path, so `revert` restores the
          // whole pre-move document.
          const sourcePath = path
          const { path: destPath, position } = request.to
          const preMove = data
          const { newData: deletedData, currentValue } = updateDataObject(
            data,
            sourcePath,
            '',
            'delete'
          )
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
            input: {
              ...nodeData,
              newData,
              event: 'move',
              newPath: landingPath,
            } as UpdateFunctionProps,
            nodeData,
            isNoOp: false,
            apply: () => commitData(newData),
            revert: () => commitData(preMove),
          }
        }
      }
    },
    [commitDocument]
  )

  // Runs the consumer's `onUpdate` and normalises its raw return to the
  // canonical outcome the commit engine acts on, including the localised,
  // event-specific reject message that matches the `onError` code the node
  // surfaces.
  //
  // Returns the outcome SYNCHRONOUSLY when `onUpdate` does (a non-thenable
  // return), and a promise only when it's genuinely async. The engine uses that
  // distinction to skip the optimistic apply for a synchronous verdict, so a
  // sync reject never writes to `setData`. Hence calling `onUpdate` directly
  // rather than `await`-ing it: an `async` wrapper would force even a sync
  // return into a microtask, after the optimistic apply has already fired.
  const runUpdate = useCallback(
    (
      input: UpdateFunctionProps,
      control: UpdateControl
    ): UpdateOutcome | Promise<UpdateOutcome> => {
      const code = ERROR_CODE[input.event]
      const defaultMessage = () =>
        translateRef.current(ERROR_MESSAGE_KEY[input.event], rootNodeDataRef.current)

      // A thrown sync error or rejected promise becomes a reject, surfacing
      // its message if present, and stopping it escaping as unhandled.
      const toError = (err: unknown): UpdateOutcome => {
        const message =
          err instanceof Error && err.message
            ? err.message
            : typeof err === 'string' && err
              ? err
              : defaultMessage()
        return { status: 'error', error: { code, message } }
      }

      const normalise = (result: UpdateResult): UpdateOutcome => {
        if (result === false) return { status: 'error', error: { code, message: defaultMessage() } }
        if (result === null) return { status: 'cancel' }
        if (result && typeof result === 'object') {
          if (result.error !== undefined)
            return typeof result.error === 'string'
              ? { status: 'error', error: { code, message: result.error } }
              : { status: 'error', error: result.error }
          // A key set to `undefined` means "no override for this key", not
          // "override to undefined" — consistent with the protocol's top-level
          // "undefined/void = proceed". Overriding a node *to* undefined isn't
          // supported; `null` overrides are.
          const hasData = result.data !== undefined
          const hasValue = result.value !== undefined
          // Returning both is a mistake: `data` (whole-document) wins and
          // `value` is ignored, with a warning so it's caught at dev time.
          if (hasData && hasValue)
            console.warn(
              'json-edit-react: onUpdate returned both { value } and { data }; ' +
                '{ data } (whole-document) takes precedence and { value } is ignored.'
            )
          // `{ data }` replaces the whole document — apply at the root path.
          if (hasData) return { status: 'override', value: result.data as JsonData, path: [] }
          // `{ value }` is the edited node's value, applied at its path. Only
          // meaningful for `edit`/`add`, which have a value; `rename`, `move`
          // and `delete` have no target for it, so it's ignored and the commit
          // proceeds. For `add`, `input.path` is the new child's full path.
          if (hasValue && (input.event === 'edit' || input.event === 'add'))
            return { status: 'override', value: result.value as JsonData, path: input.path }
        }
        return { status: 'commit' }
      }

      let raw
      try {
        raw = onUpdateRef.current(input, control)
      } catch (err) {
        return toError(err)
      }
      return isThenable(raw) ? raw.then(normalise, toError) : normalise(raw as UpdateResult)
    },
    []
  )

  // The commit primitives handed to the EditingProvider via `commitRef`,
  // assigned every render and read by the store only at event time.
  const commitPrimitives = useMemo<CommitPrimitives>(
    () => ({
      // `undefined` when the consumer supplied no `onUpdate`, which makes the
      // engine skip the settlement phase (no `update*` events).
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

  // Whole-tree visibility plus per-collection visible-child counts, surfaced to
  // nodes via FilterStateProvider. `null` when no filter is active, which the
  // consumer hooks fast-path.
  const filterState = useMemo(
    () => computeFilterState(nodeData, searchFilter, debouncedSearchText),
    // `nodeData` is rebuilt every render from `data`/`rootName`, but the walk
    // only depends on the underlying `data` reference, so listing `nodeData`
    // would recompute on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, debouncedSearchText, searchFilter, rootName]
  )

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

  const editConfirmRef = useRef<HTMLButtonElement>(null)
  const { setCollapseState } = useCollapse()

  // Common sort method for ordering nodes, driven by the `sortKeys` prop:
  // `false` (the default) leaves the order alone, `true` sorts on the node's
  // key, and a function is used as the comparator. `nodeMap` converts an
  // element to the `[key, value]` tuple the comparator expects, since the sort
  // runs over differently-shaped arrays in different places.
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
  // Late-assigned: the stable update handlers read the live comparator from
  // here when building a node's `NodeData`.
  sortRef.current = sort

  // Populate the bridge the editing and collapse providers read at event time
  // to build a node's flat `NodeData` from a path alone — they're ancestors of
  // this component, so they can't reach `getLatestData`/`sort` directly.
  // `rootName` and `sort` are read from refs, so the identity holds.
  const buildNodeDataFromPath = useCallback<BuildNodeDataFromPath>(
    (path) => buildNodeData(getLatestData(), path, rootNameRef.current, sortRef.current),
    [getLatestData]
  )
  buildNodeDataFromPathRef.current = buildNodeDataFromPath

  // Imperative handle (`editorRef` prop). UI interactions only: open a
  // value-edit session, commit or cancel it, or collapse nodes. It never
  // mutates data directly — the consumer owns `data`/`setData`. Every method
  // reads the LIVE tree at call time, never a frozen render closure. Declared
  // after `sort` because `startEdit`'s restriction pre-check rebuilds the
  // target's `NodeData` via it.
  useImperativeHandle(editorRef, () => {
    // A sentinel detects a missing path — `extract` returns it rather than
    // throwing — so a stale target reports `PATH_NOT_FOUND` instead of
    // crashing.
    const SENTINEL = Symbol('path-missing')
    return {
      collapse: (state) => setCollapseState(state),

      // Open a value-edit session, or report why it couldn't:
      // `'PATH_NOT_FOUND'` if the target is gone, `'RESTRICTED'` if `allowEdit`
      // blocks it (unless `overrideRestrictions`). `force: true` skips the
      // node's own re-check and reveals a target collapsed below the mount
      // frontier.
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
      // exit. A no-op when there's no live confirm control to click — no
      // session, or one whose confirm control isn't mounted here — since the
      // unconditional `cancelEditSession()` would otherwise tear down a session
      // that was never committed, e.g. silently cancelling a key rename.
      confirm: () => {
        if (!editConfirmRef.current) return
        editConfirmRef.current.click()
        // A rejected confirm (invalid JSON on a collection, a throwing
        // `fromStandardType` on a custom node) leaves its session in 'editing'
        // phase with an inline error, so keep it open. A committed session
        // leaves no active entry and a held one is inert against cancel, so the
        // trailing cancel only ever reaches a rejected session.
        if (getEditingSnapshot().active?.phase === 'editing') return
        cancelEditSession()
      },

      cancel: () => cancelEditSession(),
    }
  }, [
    setCollapseState,
    openEditSession,
    cancelEditSession,
    getEditingSnapshot,
    allowEditFilter,
    getLatestData,
    rootName,
    sort,
  ])

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
    canAddHere: false, // ...nor relocate into it
    showClipboardButton,
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

  const mainContainerStyles = {
    ...getStyles('container', nodeData),
    ...cssVars,
    minWidth,
    maxWidth,
  }

  // The prop takes priority over the theme, falling back to the stylesheet's
  // 16px. A defined base size keeps the parent environment's font size from
  // affecting the component.
  mainContainerStyles.fontSize = baseFontSize ?? mainContainerStyles.fontSize

  return (
    <div
      id={id}
      ref={mainContainerRef}
      className={`jer-editor-container ${className ?? ''}`}
      style={mainContainerStyles}
    >
      <FilterStateProvider value={filterState}>
        {isCollection(data) && !customNodeData.renderCollectionAsValue ? (
          <CollectionNode data={data} {...otherProps} />
        ) : (
          <ValueNodeWrapper data={data as ValueData} showLabel {...otherProps} />
        )}
      </FilterStateProvider>
    </div>
  )
}

export function JsonEditor<T = JsonData>(props: JsonEditorProps<T>): React.ReactElement {
  // Insertion effects run in the commit's mutation phase — ahead of every
  // layout effect, and before the browser can paint the tree being committed —
  // so the stylesheet is always present the first time the editor's markup is
  // on screen. `JsonViewer` renders through here, so this covers it too.
  useInsertionEffect(() => {
    injectStyles()
  }, [])

  // Shared bridge, load-bearing by design. The editing store and collapse
  // state live in ancestor providers so nodes can subscribe to slivers via
  // `useSyncExternalStore` without re-rendering the tree. Those providers fire
  // some observer events imperatively — `onEditEvent` start/cancel, and the
  // once-per-command `onCollapse` broadcast — but they sit ABOVE `Editor`,
  // which owns the data, so they can't build a node's `NodeData` themselves.
  // `Editor` writes this ref each render and the providers read it at event
  // time to turn a path into flat `NodeData`. Node-driven events (commit*,
  // delete, move, user-click collapse) fire straight from the node and never
  // touch it.
  const buildNodeDataFromPathRef = useRef<BuildNodeDataFromPath | undefined>(undefined)
  // Same bridge pattern: the inner `Editor`, which owns the data, populates
  // this with the commit primitives the EditingProvider's engine calls.
  const commitRef = useRef<CommitPrimitives | undefined>(undefined)

  // Cast at the boundary: the internal Editor and tree operate on `JsonData`,
  // and the generic exists only for the public surface's consumer typing.
  const innerProps = props as unknown as JsonEditorProps<JsonData>

  return (
    <ThemeProvider theme={innerProps.theme ?? defaultTheme}>
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

const getFilterFunction = (propValue: boolean | number | FilterFunction): FilterFunction => {
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

// Combines the replacer or reviver functions from the custom node definitions
// into a single function for the internal `jsonStringify`/`jsonParse`.
const getJsonReplacerFn = <T, U>(
  customNodeDefinitions: CustomNodeDefinition[],
  method: 'stringifyReplacer' | 'parseReviver'
): ((key: string, value: T) => U) | undefined => {
  const replacers: (((value: unknown) => unknown) | ((stringified: string) => unknown))[] =
    // `undefined` gets a hard-coded stringify replacer, because a reviver
    // function can't return undefined, so the restore on parse is handled
    // internally.
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
