import { type JSX } from 'react'
import { type AssignOptions } from './utils/assign'
import { type LocalisedStrings, type TranslateFunction } from './localisation'
import { CustomNodeData } from './CustomNode'

export type JsonData = Record<string, unknown> | Array<unknown> | unknown

export interface JsonEditorProps<T = JsonData> {
  data: T
  setData: (data: T) => void
  rootName?: string
  onUpdate?: UpdateFunction<T>
  onChange?: OnChangeFunction<T>
  onError?: OnErrorFunction<T>
  showErrorMessages?: boolean
  allowClipboard?: boolean
  theme?: ThemeInput
  icons?: IconReplacements
  className?: string
  id?: string
  indent?: number
  collapse?: boolean | number | FilterFunction<T>
  collapseAnimationTime?: number // ms
  showCollectionCount?: boolean | 'when-closed'
  allowEdit?: boolean | FilterFunction<T>
  allowDelete?: boolean | FilterFunction<T>
  allowAdd?: boolean | FilterFunction<T>
  allowTypeSelection?: boolean | TypeOptions | TypeFilterFunction<T>
  allowDrag?: boolean | FilterFunction<T>
  searchText?: string
  searchFilter?: 'key' | 'value' | 'all' | SearchFilterFunction<T>
  searchDebounceTime?: number
  sortKeys?: boolean | CompareFunction
  showArrayIndexes?: boolean
  arrayIndexStart?: number
  showStringQuotes?: boolean
  showIconTooltips?: boolean
  defaultValue?: string | number | boolean | null | object | DefaultValueFunction<T>
  newKeyOptions?: string[] | NewKeyOptionsFunction<T>
  minWidth?: string | number
  maxWidth?: string | number
  baseFontSize?: string | number
  stringTruncateLength?: number
  translations?: Partial<LocalisedStrings>
  // Using "any" here, as internal props don't matter, the generic is just for
  // enforcing consistency between the component and the definition that uses it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customNodeDefinitions?: CustomNodeDefinition<Record<string, any>, Record<string, any>>[]
  customText?: CustomTextDefinitions
  customButtons?: CustomButtonDefinition[]
  jsonParse?: (input: string, reviver?: (key: string, value: string) => unknown) => JsonData
  jsonStringify?: (input: JsonData, replacer?: (key: string, value: unknown) => unknown) => string
  TextEditor?: React.FC<TextEditorProps>
  errorDisplayTime?: number // ms
  keyboardControls?: KeyboardControls
  insertAtTop?: boolean | 'array' | 'object'
  collapseClickZones?: Array<'left' | 'header' | 'property'>
  // Additional events
  onEditEvent?: OnEditEventFunction
  onCollapse?: OnCollapseFunction
  onCopy?: OnCopyFunction<T>
  // Imperative handle — see `JsonEditorHandle`. Attach with `useRef` and the
  // `editorRef` prop (a plain ref-valued prop, not the `ref` attribute, so the
  // component stays a generic function with full type inference).
  editorRef?: React.Ref<JsonEditorHandle>
}

export interface StartEditOptions {
  /** The target node to open a value-edit session on. */
  path: CollectionKey[]
  /**
   * Bypass `allowEdit` (default `false`). When `false`, the filter is
   * evaluated for this node at call time and `startEdit` is a no-op (returning
   * `'RESTRICTED'`) if editing isn't permitted; when `true`, the session opens
   * regardless — the intended use is to lock the tree and imperatively enable a
   * single node. Skips ONLY the filter, never `onUpdate`: the consumer's
   * `onUpdate` still runs (and may veto) at `confirm()`.
   */
  overrideRestrictions?: boolean
}

/**
 * The result of `editorRef.startEdit`: `true` if it opens a value-edit session,
 * or the reason it doesn't — `'PATH_NOT_FOUND'` (target gone) or `'RESTRICTED'`
 * (`allowEdit` blocked it, and `overrideRestrictions` wasn't set).
 */
export type StartEditResult = true | 'RESTRICTED' | 'PATH_NOT_FOUND'

/**
 * Imperative handle exposed via the `editorRef` prop. The commands drive editor
 * *UI* a consumer can't otherwise reach — they open a value-edit session,
 * confirm/cancel it, or collapse nodes. They deliberately do NOT mutate data
 * directly: the consumer owns `data`/`setData`, so changing a value is just
 * `setData(newData)` and the editor reflects it.
 */
export interface JsonEditorHandle {
  /** Collapse/expand a node (or subtree, with `includeChildren`). */
  collapse: (state: CollapseState | CollapseState[]) => void
  /**
   * Open a value-edit session at a node. Respects `allowEdit` unless
   * `overrideRestrictions` is set; auto-reveals a target collapsed below the
   * mount frontier. Returns `true` if it opened, else why not — see
   * `StartEditResult`.
   */
  startEdit: (options: StartEditOptions) => StartEditResult
  /** Commit the active session (clicks the live confirm control), then exit. */
  confirm: () => void
  /** Abort the active session without committing (fires the matching `cancel*` event). */
  cancel: () => void
}

/**
 * The `editorRef` handle for `JsonViewer` — collapse only; editing is not
 * exposed in a read-only context.
 */
export type JsonViewerHandle = Pick<JsonEditorHandle, 'collapse'>

export type JsonViewerProps<T = JsonData> = Omit<
  JsonEditorProps<T>,
  | 'setData'
  | 'onUpdate'
  | 'onChange'
  | 'allowEdit'
  | 'allowAdd'
  | 'allowDelete'
  | 'allowDrag'
  | 'allowTypeSelection'
  | 'editorRef'
> & {
  /** Collapse-only imperative handle — see `JsonViewerHandle`. */
  editorRef?: React.Ref<JsonViewerHandle>
}

const valueDataTypes = ['string', 'number', 'boolean', 'null'] as const
const collectionDataTypes = ['object', 'array'] as const
export const standardDataTypes = [...valueDataTypes, ...collectionDataTypes] as const

export type CollectionDataType = (typeof collectionDataTypes)[number]
export type DataType = (typeof standardDataTypes)[number] | 'invalid'

export type CollectionKey = string | number
export type CollectionData = object | unknown[]

export interface EnumDefinition {
  enum: string
  values: string[]
  matchPriority?: number
}

export type TypeOptions = Array<DataType | string | EnumDefinition>

export type ErrorString = string

export type TabDirection = 'next' | 'prev'

export interface EditingState {
  path: CollectionKey[]
  // `value` = editing a leaf/raw value; `key` = renaming a key; `add` = an open
  // add session on a collection (`path` is the collection being added into).
  mode: 'value' | 'key' | 'add'
  // Set when the session was started imperatively via the `editorRef` handle.
  // A forced edit overrides the `allowEdit` filter — the node-skip redirect
  // in ValueNodeWrapper leaves it in place instead of bouncing off it.
  force?: boolean
}

export interface IconReplacements {
  add?: JSX.Element
  edit?: JSX.Element
  delete?: JSX.Element
  copy?: JSX.Element
  ok?: JSX.Element
  cancel?: JSX.Element
  chevron?: JSX.Element
}

export interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

/**
 * FUNCTIONS
 */

/** The definitive error code list — surfaced via the `onError` observer and `UpdateResult.error`. */
export type JsonEditorErrorCode =
  | 'UPDATE_ERROR' // an edit was rejected, or an internal failure occurred
  | 'ADD_ERROR' // an add was rejected
  | 'DELETE_ERROR' // a delete was rejected
  | 'RENAME_ERROR' // a key rename was rejected
  | 'MOVE_ERROR' // a drag-and-drop move was rejected
  | 'KEY_EXISTS' // a new/renamed key collides with an existing sibling
  | 'INVALID_JSON' // raw JSON typed into the editor failed to parse
  | 'CLIPBOARD_ERROR' // a copy-to-clipboard write failed (onCopy)

/** The one canonical error shape, used everywhere an error is produced or reported. */
export interface JsonEditorError {
  code: JsonEditorErrorCode
  message: string
}

/**
 * The one canonical update result (§17, Category 2). `void`/`undefined`/`true`
 * commit; `false` rejects with a generic error; `null` is a silent abort (no
 * commit, no error); the object form overrides the committed `value` or rejects
 * with a custom `error` (a bare `string` is wrapped into a `JsonEditorError`).
 */
export type UpdateResult<T = JsonData> =
  | true
  | void
  | undefined
  | false
  | null
  | {
      value?: T
      error?: string | JsonEditorError
    }

/**
 * `NodeData` carries the CURRENT identity/value; the event-specific field
 * carries the NEW bit; `newData` is always the resulting document. `rename` and
 * `move` are first-class events even though both are delete+add under the hood —
 * they arrive via distinct user interactions and carry distinct deltas. For
 * `add`, `NodeData` describes the new node's *position* (`path`/`key`); `value`
 * is unset until commit (matches V1).
 */
export type UpdateFunctionProps<T = JsonData> = NodeData<T> & { newData: T } & (
    | { event: 'edit'; newValue: unknown } // value changes (incl. type change)
    | { event: 'add'; newValue: unknown }
    | { event: 'delete' } // `newData` reflects the removal
    | { event: 'rename'; newKey: string } // `NodeData.key`/`path` = OLD; use `newKey` + `newData`. Only object keys are renameable, so always a string
    | { event: 'move'; newPath: CollectionKey[] } // `NodeData.path` = source; `newPath` = destination
  )

/** One `onUpdate` — branch on `event`. Fires for user- and command-driven alike. */
export type UpdateFunction<T = JsonData> = (
  props: UpdateFunctionProps<T>
) => UpdateResult<T> | Promise<UpdateResult<T>>

/** Transform (distinct contract — returns the value, not a result). */
export type OnChangeFunction<T = JsonData> = (
  props: NodeData<T> & { newValue: ValueData }
) => ValueData

/** Observer (Cat 3): after any error condition (Group A codes). Flat `NodeData`. */
export type OnErrorFunction<T = JsonData> = (
  props: NodeData<T> & { error: JsonEditorError; errorValue: JsonData }
) => void

export type FilterFunction<T = JsonData> = (input: NodeData<T>) => boolean
export type TypeFilterFunction<T = JsonData> = (input: NodeData<T>) => boolean | TypeOptions
export type CustomTextFunction<T = JsonData> = (input: NodeData<T>) => string | null
export type DefaultValueFunction<T = JsonData> = (input: NodeData<T>, newKey?: string) => unknown
export type SearchFilterFunction<T = JsonData> = (
  inputData: NodeData<T>,
  searchText: string
) => boolean
export type SearchFilterInputFunction<T = JsonData> = (
  inputData: Partial<NodeData<T>>,
  searchText: string
) => boolean
export type NewKeyOptionsFunction<T = JsonData> = (input: NodeData<T>) => string[] | null | void

export type CopyType = 'path' | 'value'

// Observer (Cat 3): fires after a copy-to-clipboard. Enablement is the
// `allowClipboard` boolean (Cat 1). A failed copy carries a `CLIPBOARD_ERROR`.
export type OnCopyFunction<T = JsonData> = (
  props: NodeData<T> & {
    success: boolean
    stringValue: string
    type: CopyType
    error?: JsonEditorError
  }
) => void

export type CompareFunction = (
  a: [string | number, unknown],
  b: [string | number, unknown]
) => number

export type SortFunction = <T>(arr: T[], nodeMap: (input: T) => [string | number, unknown]) => void

/**
 * Observer (Cat 3): the complete interaction-lifecycle stream. Value-edit,
 * key-rename and add sessions each open with a `start*`, then terminate with
 * `confirm*` (committed) or `cancel*` (closed without a commit — incl. a no-op
 * confirm or a rejected/aborted change). `delete`/`move` are instant (one event
 * on commit). `confirmRename` carries `{ oldKey, newKey }`. Absorbs the old
 * `onRenameProperty` (§12).
 */
export type EditEvent<T = JsonData> = NodeData<T> &
  (
    | { event: 'startEdit' }
    | { event: 'confirmEdit' }
    | { event: 'cancelEdit' }
    | { event: 'startRename' }
    | { event: 'confirmRename'; oldKey: CollectionKey; newKey: CollectionKey }
    | { event: 'cancelRename' }
    | { event: 'startAdd' }
    | { event: 'confirmAdd' }
    | { event: 'cancelAdd' }
    | { event: 'delete' }
    | { event: 'move' }
  )

export type OnEditEventFunction<T = JsonData> = (e: EditEvent<T>) => void

// Definition to externally set Collapse state -- the `editorRef.collapse`
// command input (NOT the OnCollapse observer payload, which is flat NodeData).
export interface CollapseState {
  path: CollectionKey[]
  collapsed: boolean
  includeChildren: boolean
}

/** Observer (Cat 3): on collapse/expand (user click or `editorRef.collapse`). */
export type OnCollapseFunction<T = JsonData> = (
  props: NodeData<T> & { collapsed: boolean; includeChildren: boolean }
) => void

// Internal update. Resolves to an error message (`string`), `false` (the
// consumer returned `null` — silent cancel; revert the display, no error), or
// `void` (committed).
type InternalResult = Promise<string | void | false>
export type InternalUpdateFunction = (
  value: unknown,
  path: CollectionKey[],
  options?: AssignOptions
) => InternalResult

// Key rename (a first-class `event: 'rename'` update). `path`/`newKey` are the
// OLD node path and the new key.
export type InternalRenameFunction = (path: CollectionKey[], newKey: string) => InternalResult

// Builds a node's full `NodeData` from its path against the LIVE document.
// Bridged via a ref from the inner `Editor` into the editing/collapse providers
// (its ancestors), so observer events fired from those contexts (`onEditEvent`
// start*/cancel*, `onCollapse` broadcast) can carry a flat `NodeData`.
export type BuildNodeDataFromPath = (path: CollectionKey[]) => NodeData
// `.current` is assigned in JsonEditor; that's fine — under the pinned
// @types/react 19, `RefObject.current` is mutable (and `MutableRefObject` is
// deprecated), so `RefObject` is the correct, non-deprecated type here.
export type BuildNodeDataFromPathRef = React.RefObject<BuildNodeDataFromPath | undefined>

// For drag-n-drop
export type Position = 'above' | 'below'
export type InternalMoveFunction = (
  source: CollectionKey[] | null,
  dest: CollectionKey[],
  position: Position
) => InternalResult

export interface KeyEvent {
  key: string
  modifier?: React.ModifierKey | React.ModifierKey[]
}
export interface KeyboardControls {
  confirm?: KeyEvent | string // value node defaults, key entry
  cancel?: KeyEvent | string // all "Cancel" operations
  objectConfirm?: KeyEvent | string
  objectLineBreak?: KeyEvent | string
  stringConfirm?: KeyEvent | string
  stringLineBreak?: KeyEvent | string // for Value nodes
  booleanConfirm?: KeyEvent | string
  booleanToggle?: KeyEvent | string
  numberConfirm?: KeyEvent | string
  numberUp?: KeyEvent | string
  numberDown?: KeyEvent | string
  tabForward?: KeyEvent | string
  tabBack?: KeyEvent | string
  clipboardModifier?: React.ModifierKey | React.ModifierKey[]
  collapseModifier?: React.ModifierKey | React.ModifierKey[]
}

export type KeyboardControlsFull = Omit<
  Required<{ [Property in keyof KeyboardControls]: KeyEvent }>,
  'clipboardModifier' | 'collapseModifier'
> & {
  clipboardModifier: React.ModifierKey[]
  collapseModifier: React.ModifierKey[]
}

/**
 * NODES
 */

export interface NodeData<T = JsonData> {
  key: CollectionKey
  path: CollectionKey[]
  level: number
  index: number
  value: JsonData
  size: number | null
  parentData: object | null
  fullData: T
  collapsed?: boolean
}
interface BaseNodeProps {
  data: unknown
  parentData: CollectionData | null
  nodeData: NodeData
  // Reads the latest whole document at call time — for event-time reads
  // (onChange `currentData`, Tab `getNextOrPrevious`) that need the live tree,
  // not the `nodeData.fullData` prop a memoized sibling keeps stale after a
  // commit elsewhere. Stable identity, so it doesn't weaken the node memo.
  getLatestData: () => JsonData
  onEdit: InternalUpdateFunction
  onDelete: InternalUpdateFunction
  onRename: InternalRenameFunction
  onError?: OnErrorFunction
  showErrorMessages: boolean
  showIconTooltips: boolean
  onMove: InternalMoveFunction
  allowClipboard: boolean
  onCopy?: OnCopyFunction
  onEditEvent?: OnEditEventFunction
  allowEditFilter: FilterFunction
  allowDeleteFilter: FilterFunction
  allowAddFilter: FilterFunction
  allowDragFilter: FilterFunction
  canDragOnto: boolean
  searchFilter?: SearchFilterFunction
  searchText?: string
  allowTypeSelection: boolean | TypeOptions | TypeFilterFunction
  stringTruncateLength: number
  indent: number
  arrayIndexStart: number
  sort: SortFunction
  translate: TranslateFunction
  customNodeDefinitions: CustomNodeDefinition[]
  customNodeData: CustomNodeData
  customButtons: CustomButtonDefinition[]
  errorDisplayTime: number
  keyboardControls: KeyboardControlsFull
  handleKeyboard: (
    e: React.KeyboardEvent,
    eventMap: Partial<Record<keyof KeyboardControlsFull, () => void>>
  ) => void
  editConfirmRef: React.RefObject<HTMLDivElement | null>
  jsonStringify: (
    data: JsonData,
    // eslint-disable-next-line
    replacer?: (this: any, key: string, value: unknown) => string
  ) => string
}

export interface CollectionNodeProps extends BaseNodeProps {
  mainContainerRef: React.RefObject<Element>
  data: CollectionData
  collapseFilter: FilterFunction
  collapseAnimationTime: number
  onAdd: InternalUpdateFunction
  showArrayIndexes: boolean
  showCollectionCount: boolean | 'when-closed'
  showStringQuotes: boolean
  defaultValue: unknown
  newKeyOptions?: string[] | NewKeyOptionsFunction
  jsonParse: (
    input: string,
    // eslint-disable-next-line
    reviver?: (this: any, key: string, value: string) => unknown
  ) => JsonData
  insertAtTop: { object: boolean; array: boolean }
  TextEditor?: React.FC<TextEditorProps>
  onCollapse?: OnCollapseFunction
  collapseClickZones: Array<'left' | 'header' | 'property'>
}

export type ValueData = string | number | boolean
export interface ValueNodeProps extends BaseNodeProps {
  data: ValueData
  showLabel: boolean
  showStringQuotes: boolean
  onChange?: OnChangeFunction
}

export interface CustomKeyProps<T = Record<string, unknown>> {
  nodeData: NodeData
  // The displayed key — already a string, and for array indices already
  // offset for `arrayIndexStart`. Use `nodeData.key` for the raw key.
  name: string
  path: CollectionKey[]
  canEditKey: boolean
  handleEditKey: (newKey: string) => void
  setIsEditingKey: () => void
  handleClick?: (e: React.MouseEvent) => void
  styles: React.CSSProperties
  componentProps?: T
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
}

export interface CustomComponentProps<T = Record<string, unknown>>
  extends Omit<BaseNodeProps, 'onError'> {
  value: JsonData
  componentProps?: T
  parentData: CollectionData | null
  setValue: (value: ValueData) => void
  handleEdit: (value?: unknown) => void
  handleCancel: () => void
  handleKeyPress: (e: React.KeyboardEvent) => void
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  children?: JSX.Element | JSX.Element[] | null
  originalNode?: JSX.Element
  originalNodeKey?: JSX.Element
  canEdit: boolean
  keyboardCommon: Partial<Record<keyof KeyboardControlsFull, () => void>>
  onError: (error: JsonEditorError, errorValue: JsonData | string) => void
}

// Props received by a `wrapperComponent` — the standard node machinery plus the
// `wrapperProps` configured on the definition (delivered here, not as
// `componentProps`).
export interface CustomWrapperProps<U = Record<string, unknown>>
  extends Omit<CustomComponentProps, 'componentProps'> {
  wrapperProps?: U
}

export interface CustomNodeDefinition<T = Record<string, unknown>, U = Record<string, unknown>> {
  condition: FilterFunction
  component?: React.FC<CustomComponentProps<T>>
  keyComponent?: React.FC<CustomKeyProps<T>>
  name?: string // appears in "Type" selector
  componentProps?: T // shared by `component` and `keyComponent`
  showKey?: boolean // default true
  defaultValue?: unknown
  showInTypeSelector?: boolean // default false
  // `showOnView`/`showOnEdit` default to rendering the custom node in view mode
  // and the standard editor while editing — the common case. Set `showOnEdit`
  // for nodes that need a custom editor too (e.g. a date picker).
  showOnEdit?: boolean // default false
  showOnView?: boolean // default true
  showEditTools?: boolean // default true
  // Opt-in (default false) because it makes the editor build the original node's
  // JSX up-front to pass as `originalNode`/`originalNodeKey` — wasted work for
  // custom nodes that fully replace the rendering.
  passOriginalNode?: boolean // default false

  // For collection nodes only:
  showCollectionWrapper?: boolean // default true
  wrapperComponent?: React.FC<CustomWrapperProps<U>>
  wrapperProps?: Record<string, unknown>
  renderCollectionAsValue?: boolean

  // For JSON stringify/parse
  stringifyReplacer?: (value: unknown) => unknown
  parseReviver?: (stringified: string) => unknown
}

export type CustomTextDefinitions = Partial<{ [key in keyof LocalisedStrings]: CustomTextFunction }>

export interface CustomButtonDefinition {
  Element: React.FC<{ nodeData: NodeData }>
  onClick: (nodeData: NodeData, e: React.MouseEvent) => void
}

export interface InputProps {
  value: unknown
  setValue: (value: ValueData) => void
  canEdit: boolean
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  handleEdit: () => void
  path: CollectionKey[]
  stringTruncateLength: number
  showStringQuotes: boolean
  nodeData: NodeData
  translate: TranslateFunction
  handleKeyboard: (
    e: React.KeyboardEvent,
    eventMap: Partial<Record<keyof KeyboardControlsFull, () => void>>
  ) => void
  keyboardCommon: Partial<Record<keyof KeyboardControlsFull, () => void>>
}

/**
 * THEMES
 */

// Object passed to main "theme" prop
export type ThemeInput = Theme | Partial<ThemeStyles> | Array<Theme | Partial<ThemeStyles>>

export type ThemeableElement =
  | 'container'
  | 'collection'
  | 'collectionInner'
  | 'collectionElement'
  | 'dropZone'
  | 'property'
  | 'bracket'
  | 'itemCount'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'input'
  | 'inputHighlight'
  | 'error'
  | 'iconCollection'
  | 'iconEdit'
  | 'iconDelete'
  | 'iconAdd'
  | 'iconCopy'
  | 'iconOk'
  | 'iconCancel'

export type ThemeFunction = (nodeData: NodeData) => React.CSSProperties | null | undefined

export type ThemeValue =
  | string
  | React.CSSProperties
  | Array<string | React.CSSProperties | ThemeFunction>
  | ThemeFunction
// e.g. "#FFFFF", {backgroundColor: "grey"}, ["smaller", {fontWeight: "bold"}]

export type ThemeStyles = Record<ThemeableElement, ThemeValue>

type Fragments = Record<string, React.CSSProperties | string>
export interface Theme {
  displayName?: string
  fragments?: Fragments
  styles: Partial<ThemeStyles>
}

// All the fragments and shorthand defined in Theme is compiled into a single
// CSS "Style" object before being passed to components
export type CompiledStyles = Record<ThemeableElement, ThemeFunction | React.CSSProperties>
