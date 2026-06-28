import { type LocalisedStrings, type TranslateFunction } from './localisation'
import { CustomNodeData } from './CustomNode'
import { type SelectProps } from './NativeSelect'

export type JsonData = Record<string, unknown> | Array<unknown> | unknown

export interface JsonEditorProps<T = JsonData> {
  data: T
  setData: (data: T) => void
  rootName?: string
  onUpdate?: UpdateFunction<T>
  onChange?: OnChangeFunction<T>
  onError?: OnErrorFunction<T>
  showErrorMessages?: boolean
  showClipboardButton?: boolean
  theme?: ThemeInput
  className?: string
  id?: string
  indent?: number
  collapse?: boolean | number | FilterFunction<T>
  collapseAnimationTime?: number // ms
  showCollectionCount?: boolean | 'when-collapsed' | 'when-collapsed-or-filtered'
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
  Select?: React.ComponentType<SelectProps>
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
  /**
   * Abort the active session without committing (fires the matching `cancel*`
   * event).
   */
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

export const valueDataTypes = ['string', 'number', 'boolean', 'null'] as const
export const collectionDataTypes = ['object', 'array'] as const
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

// The operation an active/held session represents. Editor ops (`edit`/`rename`/
// `add`) open an inline UI; `delete`/`move` are instant and only occupy the
// active slot while a `hold()` gate is running (phase `held`).
export type EditOperation = 'edit' | 'rename' | 'add' | 'delete' | 'move'

export interface EditingState {
  path: CollectionKey[]
  op: EditOperation
  // `editing` = the inline UI is open (pre-submit); `held` = submitted and a
  // `hold()` gate is running (tree blocked) until `release()`/settlement.
  phase: 'editing' | 'held'
  // Set when the session was started imperatively via the `editorRef` handle.
  // A forced edit overrides the `allowEdit` filter — the node-skip redirect
  // in ValueNodeWrapper leaves it in place instead of bouncing off it.
  force?: boolean
}

export interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

/**
 * FUNCTIONS
 */

/**
 * The definitive error code list — surfaced via the `onError` observer and
 * `UpdateResult.error`.
 */
export type JerErrorCode =
  | 'UPDATE_ERROR' // an edit was rejected, or an internal failure occurred
  | 'ADD_ERROR' // an add was rejected
  | 'DELETE_ERROR' // a delete was rejected
  | 'RENAME_ERROR' // a key rename was rejected
  | 'MOVE_ERROR' // a drag-and-drop move was rejected
  | 'KEY_EXISTS' // a new/renamed key collides with an existing sibling
  | 'INVALID_JSON' // raw JSON typed into the editor failed to parse
  | 'CLIPBOARD_ERROR' // a copy-to-clipboard write failed (onCopy)

/**
 * The one canonical error shape, used everywhere an error is produced or
 * reported.
 */
export interface JerError {
  code: JerErrorCode
  message: string
}

/**
 * The one canonical update result (§17, Category 2). `void`/`undefined`/`true`
 * commit; `false` rejects with a generic error; `null` is a silent abort (no
 * commit, no error); the object form overrides what gets committed, or rejects
 * with a custom `error` (a bare `string` is wrapped into a `JerError`).
 *
 * The two override keys differ in scope:
 * - `value` — the edited node's value, applied at its path. Mirrors the
 *   `newValue` the callback receives. Honoured only for `edit`/`add`; ignored
 *   for `rename`/`move`/`delete` (the commit proceeds unchanged).
 * - `data` — the whole document, applied at the root. Mirrors `newData`. Works
 *   on every event.
 *
 * Returning both is a mistake: `data` (the broader operation) wins and `value`
 * is ignored (with a dev-time warning).
 */
export type UpdateResult<T = JsonData> =
  | true
  | void
  | undefined
  | false
  | null
  | {
      value?: unknown
      data?: T
      error?: string | JerError
    }

/**
 * `NodeData` carries the CURRENT identity/value; the event-specific field
 * carries the NEW bit; `newData` is always the resulting document. `rename` and
 * `move` are first-class events even though both are delete+add under the
 * hood — they arrive via distinct user interactions and carry distinct deltas.
 * For `add`, `NodeData` describes the new node's *position* (`path`/`key`);
 * `value` is unset until commit (matches V1).
 */
export type UpdateFunctionProps<T = JsonData> = NodeData<T> & { newData: T } & (
    | { event: 'edit'; newValue: unknown } // value changes (incl. type change)
    | { event: 'add'; newValue: unknown }
    | { event: 'delete' } // `newData` reflects the removal
    // `NodeData.key`/`path` = OLD; use `newKey` + `newData`. Only object keys
    // are renameable, so always a string
    | { event: 'rename'; newKey: string }
    // `NodeData.path` = source; `newPath` = destination
    | { event: 'move'; newPath: CollectionKey[] }
  )

/**
 * Control object passed as the 2nd arg to `onUpdate`. `hold()` opts this commit
 * out of the default optimistic close — the editor stays open and the tree is
 * blocked ("gate") until the returned `release()` is called (or `onUpdate`
 * settles). MUST be called synchronously, before the first `await`.
 */
export interface UpdateControl {
  hold: () => () => void
}

/**
 * One `onUpdate` — branch on `event`. Fires for user- and command-driven alike.
 */
export type UpdateFunction<T = JsonData> = (
  props: UpdateFunctionProps<T>,
  control: UpdateControl
) => UpdateResult<T> | Promise<UpdateResult<T>>

/** Transform (distinct contract — returns the value, not a result). */
export type OnChangeFunction<T = JsonData> = (
  props: NodeData<T> & { newValue: ValueData }
) => ValueData

/**
 * Observer (Cat 3): after any error condition (Group A codes). Flat `NodeData`.
 */
export type OnErrorFunction<T = JsonData> = (
  props: NodeData<T> & { error: JerError; errorValue: JsonData }
) => void

export type FilterFunction<T = JsonData> = (input: NodeData<T>) => boolean
export type TypeFilterFunction<T = JsonData> = (input: NodeData<T>) => boolean | TypeOptions
export type CustomTextFunction<T = JsonData> = (input: NodeData<T>) => string | null
export type DefaultValueFunction<T = JsonData> = (input: NodeData<T>, newKey?: string) => unknown
export type SearchFilterFunction<T = JsonData> = (
  inputData: NodeData<T>,
  searchText: string
) => boolean
export type NewKeyOptionsFunction<T = JsonData> = (input: NodeData<T>) => string[] | null | void

export type CopyType = 'path' | 'value'

// Observer (Cat 3): fires after a copy-to-clipboard. Enablement is the
// `showClipboardButton` boolean (Cat 1). A failed copy carries a `CLIPBOARD_ERROR`.
export type OnCopyFunction<T = JsonData> = (
  props: NodeData<T> & {
    success: boolean
    stringValue: string
    type: CopyType
    error?: JerError
  }
) => void

export type CompareFunction = (
  a: [string | number, unknown],
  b: [string | number, unknown]
) => number

export type SortFunction = <T>(arr: T[], nodeMap: (input: T) => [string | number, unknown]) => void

/**
 * Observer (Cat 3): the complete interaction-lifecycle stream. Value-edit,
 * key-rename and add sessions open with a `start*`, then `submit*` (the user
 * committed; a `hold()` gate may run), then terminate with `commit*` (applied —
 * editor closed) or `cancel*` (closed without applying — Esc/✗, or a `null`
 * gate). `delete`/`move` are instant (one event at commit). When `onUpdate`
 * runs, the background settlement reports `updateSuccess` / `updateError`
 * after the `commit*`/`delete`/`move`. `commitRename` carries `{ oldKey, newKey
 * }`; `updateError` carries the `error`. Both settlement events carry the
 * `operation` so interleaved background settlements can be correlated. Absorbs
 * the old `onRenameProperty` (§12).
 */
export type EditEvent<T = JsonData> = NodeData<T> &
  (
    | { event: 'startEdit' }
    | { event: 'submitEdit' }
    | { event: 'commitEdit' }
    | { event: 'cancelEdit' }
    | { event: 'startRename' }
    | { event: 'submitRename' }
    | { event: 'commitRename'; oldKey: CollectionKey; newKey: CollectionKey }
    | { event: 'cancelRename' }
    | { event: 'startAdd' }
    | { event: 'submitAdd' }
    | { event: 'commitAdd' }
    | { event: 'cancelAdd' }
    | { event: 'delete' }
    | { event: 'move' }
    | { event: 'updateSuccess'; operation: EditOperation }
    | { event: 'updateError'; operation: EditOperation; error: JerError }
  )

export type OnEditEventFunction<T = JsonData> = (e: EditEvent<T>) => void

// Definition to externally set Collapse state -- the `editorRef.collapse`
// command input (NOT the OnCollapse observer payload, which is flat NodeData).
export interface CollapseState {
  path: CollectionKey[]
  collapsed: boolean
  includeChildren: boolean
}

/**
 * Observer (Cat 3): on collapse/expand (user click or `editorRef.collapse`).
 */
export type OnCollapseFunction<T = JsonData> = (
  props: NodeData<T> & { collapsed: boolean; includeChildren: boolean }
) => void

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

export interface KeyEvent {
  key: string
  modifier?: React.ModifierKey | React.ModifierKey[]
}
// Any control can be set to `null` to disable it — the key then falls through
// to its native browser behaviour (e.g. Tab resumes normal focus traversal).
export interface KeyboardControls {
  confirm?: KeyEvent | string | null // value node defaults, key entry
  cancel?: KeyEvent | string | null // all "Cancel" operations
  objectConfirm?: KeyEvent | string | null
  objectLineBreak?: KeyEvent | string | null
  stringConfirm?: KeyEvent | string | null
  stringLineBreak?: KeyEvent | string | null // for Value nodes
  booleanConfirm?: KeyEvent | string | null
  booleanToggle?: KeyEvent | string | null
  numberConfirm?: KeyEvent | string | null
  numberUp?: KeyEvent | string | null
  numberDown?: KeyEvent | string | null
  tabForward?: KeyEvent | string | null
  tabBack?: KeyEvent | string | null
  clipboardModifier?: React.ModifierKey | React.ModifierKey[] | null
  collapseModifier?: React.ModifierKey | React.ModifierKey[] | null
}

export type KeyboardControlsFull = Omit<
  Required<{ [Property in keyof KeyboardControls]: KeyEvent | null }>,
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
  // Visible direct-child count under the current search filter. `number` on
  // tracked collections while a filter is active; `null` on render-path
  // NodeData when either no filter is active or this isn't a tracked
  // collection (e.g. a leaf). `undefined` only when the NodeData wasn't
  // built by the render path — i.e. the `searchFilter` callback (which the
  // visibility walk invokes before counts are known) or NodeData built via
  // `buildNodeData` for the editorRef handle / onCollapse / onEditEvent
  // bridges. Consumers can use `!= null` to gate on "has a real count".
  visibleSize?: number | null
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
  onError?: OnErrorFunction
  showErrorMessages: boolean
  showIconTooltips: boolean
  showClipboardButton: boolean
  onCopy?: OnCopyFunction
  onEditEvent?: OnEditEventFunction
  allowEditFilter: FilterFunction
  allowDeleteFilter: FilterFunction
  allowAddFilter: FilterFunction
  allowDragFilter: FilterFunction
  // The parent collection's permissions, as seen by a child that's a drop
  // target. `canDragOnto` = parent is editable → a same-collection REORDER may
  // land here. `canAddHere` = parent accepts adds → a cross-collection RELOCATE
  // may land here. A relocate additionally needs the dragged node's own
  // delete-permission (carried on `dragSource`). See useDragNDrop.
  canDragOnto: boolean
  canAddHere: boolean
  allowTypeSelection: boolean | TypeOptions | TypeFilterFunction
  stringTruncateLength: number
  indent: number
  arrayIndexStart: number
  sort: SortFunction
  translate: TranslateFunction
  customNodeDefinitions: CustomNodeDefinition[]
  customNodeData: CustomNodeData
  customButtons: CustomButtonDefinition[]
  Select: React.ComponentType<SelectProps>
  errorDisplayTime: number
  keyboardControls: KeyboardControlsFull
  handleKeyboard: (
    e: React.KeyboardEvent,
    eventMap: Partial<Record<keyof KeyboardControlsFull, () => void>>
  ) => void
  editConfirmRef: React.RefObject<HTMLButtonElement | null>
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
  showArrayIndexes: boolean
  showCollectionCount: boolean | 'when-collapsed' | 'when-collapsed-or-filtered'
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
  startEditingKey: () => void
  handleClick?: (e: React.MouseEvent) => void
  styles: React.CSSProperties
  componentProps?: T
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
}

export interface CustomComponentProps<T = Record<string, unknown>> extends Omit<
  BaseNodeProps,
  // `data` is omitted: it duplicated `value` (and `nodeData.value`). Read the
  // node's value via `value` — see its doc below.
  'onError' | 'data'
> {
  // The node's current value: the live edit buffer while this node is being
  // edited, so your component renders what the user is typing. The committed
  // value (what's in `data`/`setData`) is always on `nodeData.value`.
  value: JsonData
  componentProps?: T
  parentData: CollectionData | null
  // Writes into the node's edit buffer. Accepts any `JsonData` so
  // `renderCollectionAsValue` components can buffer object values; primitive
  // editors just pass strings/numbers/booleans.
  setValue: (value: JsonData) => void
  handleEdit: (value?: unknown) => void
  handleCancel: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  isEditing: boolean
  // True while this node's optimistic commit is in flight — the edited value
  // is already applied locally, but the consumer's async `onUpdate` hasn't
  // settled yet. Use it to show a "saving"/pending state. Always `false` when
  // there's no `onUpdate` (the commit settles synchronously) or for a no-op
  // edit.
  isPending: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  children?: React.JSX.Element | React.JSX.Element[] | null
  originalNode?: React.JSX.Element
  originalNodeKey?: React.JSX.Element
  canEdit: boolean
  keyboardCommon: Partial<Record<keyof KeyboardControlsFull, () => void>>
  // No error-reporter prop: a custom component rejects invalid input by
  // throwing from its definition's `fromStandardType`, which the editor catches
  // (rejects the commit, keeps the editor open, shows the message inline, and
  // fires the consumer's `onError`). The consumer's flat `onError` observer is
  // omitted above so it isn't mistaken for a per-component reporter.
}

// Props received by a `wrapperComponent` — the standard node machinery plus the
// `wrapperProps` configured on the definition (delivered here, not as
// `componentProps`).
export interface CustomWrapperProps<U = Record<string, unknown>> extends Omit<
  CustomComponentProps,
  'componentProps'
> {
  wrapperProps?: U
}

export interface CustomNodeDefinition<T = Record<string, unknown>, U = Record<string, unknown>> {
  condition: FilterFunction
  component?: React.FC<CustomComponentProps<T>>
  keyComponent?: React.FC<CustomKeyProps<T>>
  name?: string // appears in "Type" selector
  componentProps?: T // shared by `component` and `keyComponent`
  showKey?: boolean // default true
  // Seeds the node's value when switching TO this type. May be a value, or a
  // function `(nodeData) => value` called on each switch — use the function
  // form for a fresh or lazy default (e.g. `() => new Date()`) rather than one
  // fixed when the module loads. Typed `unknown` because a custom type's value
  // needn't be JSON (e.g. `bigint`, `symbol`, `Date`).
  defaultValue?: unknown
  showInTypeSelector?: boolean // default false
  // `showOnView`/`showOnEdit` default to rendering the custom node in view mode
  // and the standard editor while editing — the common case. Set `showOnEdit`
  // for nodes that need a custom editor too (e.g. a date picker).
  showOnEdit?: boolean // default false
  showOnView?: boolean // default true
  // Switching TO this type in the type selector opens the node for editing —
  // the buffer is seeded with `defaultValue`, this definition's component
  // renders in edit state, a single commit happens on confirm, and Esc
  // cancels — instead of committing `defaultValue` instantly. Requires
  // `component` + `showOnEdit`.
  editOnTypeSwitch?: boolean // default false
  showEditTools?: boolean // default true
  // Opt-in (default false) because it makes the editor build the original
  // node's JSX up-front to pass as `originalNode`/`originalNodeKey` — wasted
  // work for custom nodes that fully replace the rendering.
  passOriginalNode?: boolean // default false

  // For collection nodes only:
  showCollectionWrapper?: boolean // default true
  wrapperComponent?: React.FC<CustomWrapperProps<U>>
  wrapperProps?: U
  renderCollectionAsValue?: boolean

  // For JSON stringify/parse
  stringifyReplacer?: (value: unknown) => unknown
  parseReviver?: (stringified: string) => unknown

  // Demotes the custom value to a primitive seed when the type selector
  // switches this node to a standard type; core's generic coercion takes it
  // from there per target type.
  toStandardType?: (value: unknown) => ValueData
  // The inverse: converts a standard-typed value into this type's value. Runs
  // at every confirm of a custom edit (the ✓ button, Enter, Tab,
  // `editorRef.confirm()`) to turn the edit buffer — usually the editor's
  // string — into the value to commit; THROW to reject the confirm: nothing
  // commits, the session stays open, and the thrown message surfaces via
  // `onError` (inline error + observer callback). Also runs on an
  // `editOnTypeSwitch` switch to seed the editor from the node's current
  // value (a throw there isn't a reject — the seed falls back to
  // `defaultValue`, the same as switching with no hook). Must pass
  // already-correct values through unchanged — the buffer holds the raw
  // committed value until the editor's first keystroke.
  fromStandardType?: (value: unknown, nodeData: NodeData, componentProps?: T) => unknown
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
  Select: React.ComponentType<SelectProps>
}

/**
 * THEMES
 */

// ─── Theme: authored input ───────────────────────────────────────────────────

/** Every individually-themeable part of the UI. */
export type ThemeableElement =
  | 'container'
  | 'collection'
  | 'collectionInner'
  | 'collectionElement'
  | 'headerRow'
  | 'valueRow'
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

/**
 * A style function: derives CSS from a node's data at render time. May return
 * `null` / `undefined` to contribute nothing — useful as a conditional layer.
 */
export type StyleFunction = (nodeData: NodeData) => React.CSSProperties | null | undefined

/**
 * One unit of a `ThemeElementValue`. A bare string is resolved against the
 * theme's `fragments` first; otherwise it's a raw CSS value applied to the
 * element's default property (`color`, or `backgroundColor` / `borderColor` for
 * a few elements). e.g. `"#FFF"`, `{ fontWeight: "bold" }`, a style function.
 */
export type ThemeValueUnit = string | React.CSSProperties | StyleFunction

/**
 * The value applied to a single element: one unit, or an array of units merged
 * left → right (later wins per property; functions always apply after statics).
 * e.g. `"smaller"`, `["smaller", { fontWeight: "bold" }]`.
 */
export type ThemeElementValue = ThemeValueUnit | ThemeValueUnit[]

/**
 * Named, reusable style tokens, referenced by name from any
 * `ThemeElementValue` string.
 */
export type ThemeFragments = Record<string, string | React.CSSProperties>

/**
 * The styles map — inherently partial, so supply only the elements you want to
 * override.
 */
export type ThemeStyles = Partial<
  Record<Exclude<ThemeableElement, 'inputHighlight'>, ThemeElementValue>
> & {
  /**
   * The text-selection highlight colour, applied via a `::selection` rule and
   * surfaced as a CSS custom property. Only a background colour is consumed, so
   * — unlike every other element — it's a plain colour string rather than the
   * general element-value union.
   */
  inputHighlight?: string
}

/**
 * A themeable icon glyph. Core renders the wrapping `<svg>` itself, so it can
 * normalise size and apply the theme's icon styling. Supply only what goes
 * inside the `<svg>`, plus the attributes core can't infer.
 */
export interface IconDefinition {
  /**
   * Inner SVG markup — `<path>`/`<circle>`/`<g>`… pasted from a source icon,
   * minus its outer `<svg>` tag.
   */
  content: React.ReactNode
  /** From the source `<svg>`. Defaults to '0 0 24 24' (by far the most common). */
  viewBox?: string
  /**
   * Pass-through `<svg>` attributes — only needed for stroke-based icons
   * (Lucide/Feather/…): `{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }`.
   * Colour flows in from the theme via `currentColor`; don't set size here —
   * use `scale` (below).
   */
  svgProps?: React.SVGProps<SVGSVGElement>
  /**
   * Per-glyph size correction, multiplied onto the core size baseline
   * (`ICON_TEXT_SIZE_RATIO`). Default 1 = the standard icon size, so a normal
   * full-bleed glyph needs no `scale` at all. This is OUR field — NOT the CSS
   * `scale` property or an SVG `transform`; core reads it to compute the
   * rendered em size and it never reaches the DOM. Use it only to compensate
   * for a glyph whose artwork under/over-fills its viewBox relative to the rest
   * of the set: e.g. `scale: 1.3` renders 30% bigger.
   */
  scale?: number
}

/**
 * A theme's icon glyphs. Keyed by the bare icon name; the matching paint lives
 * in `styles` under `icon` + PascalCase (e.g. `collection` ↔ `iconCollection`).
 */
export interface ThemeIcons {
  add?: IconDefinition
  edit?: IconDefinition
  delete?: IconDefinition
  copy?: IconDefinition
  ok?: IconDefinition
  cancel?: IconDefinition
  collection?: IconDefinition
}

/** A full theme definition. */
export interface Theme {
  displayName?: string
  fragments?: ThemeFragments
  icons?: ThemeIcons
  styles: ThemeStyles
}

/**
 * Object passed to the main `theme` prop: a full `Theme`, just its `styles`, or
 * an array of either. In an array, later entries layer over earlier ones.
 */
export type ThemeInput = Theme | ThemeStyles | Array<Theme | ThemeStyles>

// ─── Theme: compiled output ──────────────────────────────────────────────────

// Per element, after groups are fanned onto members and themes merged in array
// order: a pre-merged static base plus the ordered functions to apply on top.
// Compile-time intermediate (`fns` is composed into one closure for
// CompiledStyles).
export interface ElementStyle {
  base: React.CSSProperties
  fns: StyleFunction[]
}
export type ResolvedStyles = Record<ThemeableElement, ElementStyle>

// A compiled style function. Unlike `StyleFunction` it never returns null — it
// always merges the static base with each function's output into a concrete
// object.
export type CompiledStyleFunction = (nodeData: NodeData) => React.CSSProperties

// The compiled theme. Partial: an element no theme styles has no entry, so the
// map carries only what's styled. `getStyles` fills the gap with `{}` at read
// time.
export type CompiledStyles = Partial<
  Record<ThemeableElement, React.CSSProperties | CompiledStyleFunction>
>
