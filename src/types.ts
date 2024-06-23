import { type LocalisedStrings, type TranslateFunction } from './localisation'

export const ERROR_DISPLAY_TIME = 2500 // ms

export interface JsonEditorProps {
  data: object
  // schema?: object
  rootName?: string
  onUpdate?: UpdateFunction
  onEdit?: UpdateFunction
  onDelete?: UpdateFunction
  onAdd?: UpdateFunction
  onChange?: OnChangeFunction
  onError?: OnErrorFunction
  showErrorMessages?: boolean
  enableClipboard?: boolean | CopyFunction
  theme?: ThemeInput
  icons?: IconReplacements
  className?: string
  id?: string
  indent?: number
  collapse?: boolean | number | FilterFunction
  showCollectionCount?: boolean | 'when-closed'
  restrictEdit?: boolean | FilterFunction
  restrictDelete?: boolean | FilterFunction
  restrictAdd?: boolean | FilterFunction
  restrictTypeSelection?: boolean | DataType[] | TypeFilterFunction
  restrictDrag?: boolean | FilterFunction
  // restrictKeyEdit?: boolean | FilterFunction
  searchText?: string
  searchFilter?: 'key' | 'value' | 'all' | SearchFilterFunction
  searchDebounceTime?: number
  keySort?: boolean | CompareFunction
  showArrayIndices?: boolean
  showStringQuotes?: boolean
  defaultValue?: unknown
  minWidth?: string | number
  maxWidth?: string | number
  rootFontSize?: string | number
  stringTruncate?: number
  translations?: Partial<LocalisedStrings>
  customNodeDefinitions?: CustomNodeDefinition[]
  customText?: CustomTextDefinitions
}

const ValueDataTypes = ['string', 'number', 'boolean', 'null'] as const
const CollectionDataTypes = ['object', 'array'] as const
export const DataTypes = [...ValueDataTypes, ...CollectionDataTypes] as const

export type CollectionDataType = (typeof CollectionDataTypes)[number]
export type DataType = (typeof DataTypes)[number] | 'invalid'

export type CollectionKey = string | number
export type CollectionData = object | unknown[]

export type ErrorString = string

export interface IconReplacements {
  add?: JSX.Element
  edit?: JSX.Element
  delete?: JSX.Element
  copy?: JSX.Element
  ok?: JSX.Element
  cancel?: JSX.Element
  chevron?: JSX.Element
}

/**
 * FUNCTIONS
 */

export interface UpdateFunctionProps {
  newData: object
  currentData: object
  newValue: unknown
  currentValue: unknown
  name: CollectionKey
  path: CollectionKey[]
}

export type UpdateFunction = (
  props: UpdateFunctionProps
) => void | ErrorString | false | Promise<false | ErrorString | void>

export type OnChangeFunction = (props: {
  currentData: object
  newValue: ValueData
  currentValue: ValueData
  name: CollectionKey
  path: CollectionKey[]
}) => ValueData

export interface JerError {
  code: 'UPDATE_ERROR' | 'DELETE_ERROR' | 'ADD_ERROR' | 'INVALID_JSON' | 'KEY_EXISTS'
  message: ErrorString
}

export type OnErrorFunction = (props: {
  currentData: object
  errorValue: ValueData | CollectionData
  currentValue: ValueData | CollectionData
  name: CollectionKey
  path: CollectionKey[]
  error: JerError
}) => unknown

export type FilterFunction = (input: NodeData) => boolean
export type TypeFilterFunction = (input: NodeData) => boolean | DataType[]
export type CustomTextFunction = (input: NodeData) => string | null
export type DefaultValueFunction = (input: NodeData) => unknown
export type SearchFilterFunction = (inputData: NodeData, searchText: string) => boolean
export type SearchFilterInputFunction = (
  inputData: Partial<NodeData>,
  searchText: string
) => boolean

export type CopyType = 'path' | 'value'
export type CopyFunction = (input: {
  key: CollectionKey
  path: CollectionKey[]
  value: unknown
  stringValue: string
  type: CopyType
}) => void

export type CompareFunction = (a: string, b: string) => number

// Internal update
export type InternalUpdateFunction = (
  value: unknown,
  path: CollectionKey[]
) => Promise<string | void>

// For drag-n-drop
export type Position = 'above' | 'below'
export type InternalMoveFunction = (
  source: CollectionKey[] | null,
  dest: CollectionKey[],
  position: Position
) => Promise<string | void>

/**
 * NODES
 */

export interface NodeData {
  key: CollectionKey
  path: CollectionKey[]
  level: number
  index: number
  value: unknown
  size: number | null
  parentData: object | null
  fullData: object
  collapsed?: boolean
}
interface BaseNodeProps {
  data: unknown
  parentData: CollectionData | null
  nodeData: NodeData
  onEdit: InternalUpdateFunction
  onDelete: InternalUpdateFunction
  onError?: OnErrorFunction
  showErrorMessages: boolean
  onMove: InternalMoveFunction
  enableClipboard: boolean | CopyFunction
  restrictEditFilter: FilterFunction
  restrictDeleteFilter: FilterFunction
  restrictAddFilter: FilterFunction
  restrictDragFilter: FilterFunction
  canDragOnto: boolean
  searchFilter?: SearchFilterFunction
  searchText?: string
  restrictTypeSelection: boolean | DataType[] | TypeFilterFunction
  stringTruncate: number
  indent: number
  translate: TranslateFunction
  customNodeDefinitions: CustomNodeDefinition[]
}

export interface CollectionNodeProps extends BaseNodeProps {
  data: CollectionData
  collapseFilter: FilterFunction
  onAdd: InternalUpdateFunction
  keySort: boolean | CompareFunction
  showArrayIndices: boolean
  showCollectionCount: boolean | 'when-closed'
  showStringQuotes: boolean
  defaultValue: unknown
}

export type ValueData = string | number | boolean
export interface ValueNodeProps extends BaseNodeProps {
  data: ValueData
  showLabel: boolean
  showStringQuotes: boolean
  onChange?: OnChangeFunction
}

export interface CustomNodeProps<T = Record<string, unknown>> extends BaseNodeProps {
  value: ValueData | CollectionData
  customNodeProps?: T
  parentData: CollectionData | null
  setValue: (value: ValueData) => void
  handleEdit: () => void
  handleCancel: () => void
  handleKeyPress: (e: React.KeyboardEvent) => void
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  getStyles: (element: ThemeableElement, nodeData: NodeData) => React.CSSProperties
  children?: JSX.Element | JSX.Element[] | null
}

export interface CustomNodeDefinition<T = Record<string, unknown>, U = Record<string, unknown>> {
  condition: FilterFunction
  element?: React.FC<CustomNodeProps<T>>
  name?: string // appears in "Type" selector
  customNodeProps?: T
  hideKey?: boolean
  defaultValue?: unknown
  showInTypesSelector?: boolean // default false
  showOnEdit?: boolean // default false
  showOnView?: boolean // default true
  showEditTools?: boolean // default true
  // For collection nodes only:
  showCollectionWrapper?: boolean // default true
  wrapperElement?: React.FC<CustomNodeProps<U>>
  wrapperProps?: Record<string, unknown>
}

export type CustomTextDefinitions = Partial<{ [key in keyof LocalisedStrings]: CustomTextFunction }>

export interface InputProps {
  value: unknown
  setValue: (value: ValueData) => void
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  handleEdit: () => void
  handleCancel: () => void
  path: CollectionKey[]
  stringTruncate: number
  showStringQuotes: boolean
  nodeData: NodeData
  translate: TranslateFunction
}

/**
 * THEMES
 */

const themeableElements = [
  'container',
  'collection',
  'collectionInner',
  'collectionElement',
  'dropZone',
  'property',
  'bracket',
  'itemCount',
  'string',
  'number',
  'boolean',
  'null',
  'input',
  'inputHighlight',
  'error',
  'iconCollection',
  'iconEdit',
  'iconDelete',
  'iconAdd',
  'iconCopy',
  'iconOk',
  'iconCancel',
] as const

export type ThemeableElement = (typeof themeableElements)[number]

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

// Same as "Theme", but we know every property in styles is defined
export interface DefaultTheme extends Theme {
  displayName: 'Default'
  styles: ThemeStyles
}

// All the fragments and shorthand defined in Theme is compiled into a single
// CSS "Style" object before being passed to components
export type CompiledStyles = Record<ThemeableElement, ThemeFunction | React.CSSProperties>

export type ThemeName =
  | 'default'
  | 'githubDark'
  | 'githubLight'
  | 'monoDark'
  | 'monoLight'
  | 'candyWrapper'
  | 'psychedelic'

// Value(s) passed to "setTheme" function
export type ThemeInput =
  | ThemeName
  | Theme
  | Partial<ThemeStyles>
  | Array<ThemeName | Theme | Partial<ThemeStyles>>
