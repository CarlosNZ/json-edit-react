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
  onEdit?: UpdateFunction<T>
  onDelete?: UpdateFunction<T>
  onAdd?: UpdateFunction<T>
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
  restrictEdit?: boolean | FilterFunction<T>
  restrictDelete?: boolean | FilterFunction<T>
  restrictAdd?: boolean | FilterFunction<T>
  restrictTypeSelection?: boolean | TypeOptions | TypeFilterFunction<T>
  restrictDrag?: boolean | FilterFunction<T>
  // Soft gate: fires at the start of a user-initiated interaction; return truthy
  // to take it over and suppress the default action. See `EventInterceptFunction`.
  onEventIntercept?: EventInterceptFunction<T>
  searchText?: string
  searchFilter?: 'key' | 'value' | 'all' | SearchFilterFunction<T>
  searchDebounceTime?: number
  keySort?: boolean | CompareFunction
  showArrayIndices?: boolean
  arrayIndexFromOne?: boolean
  showStringQuotes?: boolean
  showIconTooltips?: boolean
  defaultValue?: string | number | boolean | null | object | DefaultValueFunction<T>
  newKeyOptions?: string[] | NewKeyOptionsFunction<T>
  minWidth?: string | number
  maxWidth?: string | number
  rootFontSize?: string | number
  stringTruncate?: number
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
  errorMessageTimeout?: number // ms
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
  /** The node to edit. */
  path: CollectionKey[]
  /**
   * Bypass the node's `restrictEdit` filter (default `false`). When `false`,
   * the filter is evaluated for this node at call time and the edit is a no-op
   * if it's restricted; when `true`, editing starts regardless — the intended
   * use is to lock the tree with `restrictEdit` and imperatively enable a
   * single node.
   */
  overrideRestrictions?: boolean
}

/**
 * Imperative handle exposed via the `editorRef` prop. Lets a consumer drive
 * collapse/expand and editing actions without a state-as-RPC prop.
 *
 * `startEdit` auto-reveals a target that's collapsed below the mount frontier.
 * It respects the `restrictEdit` filter by default; pass `overrideRestrictions`
 * to bypass it. (Key/add/delete modes are tracked as a follow-up.)
 */
export interface JsonEditorHandle {
  /** Collapse/expand a node (or subtree, with `includeChildren`). */
  collapse: (state: CollapseState | CollapseState[]) => void
  /**
   * Put a node into (value) edit mode. Respects `restrictEdit` unless
   * `overrideRestrictions` is set. Returns `false` if the edit was blocked by
   * `restrictEdit` (request not accepted), `true` otherwise.
   */
  startEdit: (options: StartEditOptions) => boolean
  /** Leave edit mode without committing. */
  cancelEdit: () => void
  /** Commit the in-progress edit (equivalent to clicking the tick), then exit. */
  confirmEdit: () => void
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
  | 'onEdit'
  | 'onAdd'
  | 'onDelete'
  | 'onChange'
  | 'restrictEdit'
  | 'restrictAdd'
  | 'restrictDelete'
  | 'restrictDrag'
  | 'restrictTypeSelection'
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
  mode: 'value' | 'key'
  // Set when the edit was started imperatively via the `editorRef` handle.
  // A forced edit overrides the `restrictEdit` filter — the node-skip redirect
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

export interface UpdateFunctionProps<T = JsonData> {
  newData: T
  currentData: T
  newValue: unknown
  currentValue: unknown
  name: CollectionKey
  path: CollectionKey[]
}

export type UpdateFunctionReturn<T = JsonData> = ['error' | 'value', T]

export type UpdateFunction<T = JsonData> = (
  props: UpdateFunctionProps<T>
) =>
  | void
  | ErrorString
  | boolean
  | UpdateFunctionReturn<T>
  | Promise<boolean | ErrorString | void | UpdateFunctionReturn<T>>

export type OnChangeFunction<T = JsonData> = (props: {
  currentData: T
  newValue: ValueData
  currentValue: ValueData
  name: CollectionKey
  path: CollectionKey[]
}) => ValueData

export interface JerError {
  code: 'UPDATE_ERROR' | 'DELETE_ERROR' | 'ADD_ERROR' | 'INVALID_JSON' | 'KEY_EXISTS'
  message: ErrorString
}

export type OnErrorFunction<T = JsonData> = (props: {
  currentData: T
  errorValue: JsonData
  currentValue: JsonData
  name: CollectionKey
  path: CollectionKey[]
  error: JerError
}) => unknown

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
// `allowClipboard` boolean (Cat 1). A failed copy carries `error.message`
// (clipboard failures aren't part of the §17 error-code taxonomy).
export type OnCopyFunction<T = JsonData> = (
  props: NodeData<T> & {
    success: boolean
    stringValue: string
    type: CopyType
    error?: { message: string }
  }
) => void

// Soft gate (Cat 1): a user-initiated action about to start (`start*`) or to
// commit (`confirm*`). Flat `NodeData` plus an `event` discriminant; the
// `confirm*` events carry the pending change. `delete`/`move` are instant — the
// intercept *is* the click (before the one-shot delete) / the drop.
//
// Returning truthy on a `confirm*` event suppresses the commit and leaves the
// edit session open; resume it via `editorRef.confirmEdit()` (which enters below
// the gate) or abandon it via `editorRef.cancelEdit()`. `start*` are gated at the
// explicit open affordances and `confirm*` at the explicit confirm affordances
// (the tick / Enter) — Tab traversal between nodes stays below the gate.
export type InterceptableEvent<T = JsonData> = NodeData<T> &
  (
    | { event: 'startEdit' }
    | { event: 'startRename' }
    | { event: 'startAdd' }
    | { event: 'confirmEdit'; newValue: unknown }
    | { event: 'confirmRename'; newKey: CollectionKey }
    | { event: 'confirmAdd'; newKey: CollectionKey }
    | { event: 'delete' }
    | { event: 'move' }
  )

// `true` (or any non-`void`) = "I'll take it over" (suppress the default
// action); `void`/`false` = proceed. May be async — the library awaits it.
export type EventInterceptFunction<T = JsonData> = (
  e: InterceptableEvent<T>
) => boolean | void | Promise<boolean | void>

export type CompareFunction = (
  a: [string | number, unknown],
  b: [string | number, unknown]
) => number

export type SortFunction = <T>(arr: T[], nodeMap: (input: T) => [string | number, unknown]) => void

export type OnEditEventFunction = (path: (CollectionKey | null)[] | null, isKey: boolean) => void

// Definition to externally set Collapse state -- also passed to OnCollapse
// function
export interface CollapseState {
  path: CollectionKey[]
  collapsed: boolean
  includeChildren: boolean
}

export type OnCollapseFunction = (input: CollapseState) => void

// Internal update
export type InternalUpdateFunction = (
  value: unknown,
  path: CollectionKey[],
  options?: AssignOptions
) => Promise<string | void>

// For drag-n-drop
export type Position = 'above' | 'below'
export type InternalMoveFunction = (
  source: CollectionKey[] | null,
  dest: CollectionKey[],
  position: Position
) => Promise<string | void>

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
  onError?: OnErrorFunction
  showErrorMessages: boolean
  showIconTooltips: boolean
  onMove: InternalMoveFunction
  allowClipboard: boolean
  onCopy?: OnCopyFunction
  onEventIntercept?: EventInterceptFunction
  onEditEvent?: OnEditEventFunction
  restrictEditFilter: FilterFunction
  restrictDeleteFilter: FilterFunction
  restrictAddFilter: FilterFunction
  restrictDragFilter: FilterFunction
  canDragOnto: boolean
  searchFilter?: SearchFilterFunction
  searchText?: string
  restrictTypeSelection: boolean | TypeOptions | TypeFilterFunction
  stringTruncate: number
  indent: number
  arrayIndexFromOne: boolean
  sort: SortFunction
  translate: TranslateFunction
  customNodeDefinitions: CustomNodeDefinition[]
  customNodeData: CustomNodeData
  customButtons: CustomButtonDefinition[]
  errorMessageTimeout: number
  keyboardControls: KeyboardControlsFull
  handleKeyboard: (
    e: React.KeyboardEvent,
    eventMap: Partial<Record<keyof KeyboardControlsFull, () => void>>
  ) => void
  editConfirmRef: React.RefObject<HTMLDivElement | null>
  // Lets `editorRef.confirmEdit()` commit below the `onEventIntercept` gate.
  confirmInterceptBypassRef: React.RefObject<boolean>
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
  showArrayIndices: boolean
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
  // offset for `arrayIndexFromOne`. Use `nodeData.key` for the raw key.
  name: string
  path: CollectionKey[]
  canEditKey: boolean
  handleEditKey: (newKey: string) => void
  setIsEditingKey: () => void
  handleClick?: (e: React.MouseEvent) => void
  styles: React.CSSProperties
  customNodeProps?: T
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
}

export interface CustomNodeProps<T = Record<string, unknown>>
  extends Omit<BaseNodeProps, 'onError'> {
  value: JsonData
  customNodeProps?: T
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
  onError: (error: JerError, errorValue: JsonData | string) => void
}

export interface CustomNodeDefinition<T = Record<string, unknown>, U = Record<string, unknown>> {
  condition: FilterFunction
  element?: React.FC<CustomNodeProps<T>>
  customKey?: React.FC<CustomKeyProps<T>>
  name?: string // appears in "Type" selector
  customNodeProps?: T
  hideKey?: boolean
  defaultValue?: unknown
  showInTypesSelector?: boolean // default false
  showOnEdit?: boolean // default false
  showOnView?: boolean // default true
  showEditTools?: boolean // default true
  passOriginalNode?: boolean // default false

  // For collection nodes only:
  showCollectionWrapper?: boolean // default true
  wrapperElement?: React.FC<CustomNodeProps<U>>
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
  stringTruncate: number
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
