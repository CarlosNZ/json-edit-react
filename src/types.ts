import { ThemeNameKey, ThemeProps } from './themes'

export const ERROR_DISPLAY_TIME = 2500 // ms

export type ThemeInput = ThemeNameKey | Partial<ThemeProps> | [ThemeNameKey, Partial<ThemeProps>]
export interface EditorProps {
  data: object
  schema?: object
  rootName?: string
  onUpdate?: UpdateMethod
  onEdit?: UpdateMethod
  onDelete?: UpdateMethod
  onAdd?: UpdateMethod
  enableClipboard?: boolean | CopyMethod
  theme?: ThemeInput
  style?: React.CSSProperties
  indent?: number
  collapse?: boolean | number | FilterMethod
  showCount?: boolean | FilterMethod
  restrictEdit?: boolean | FilterMethod
  restrictDelete?: boolean | FilterMethod
  restrictAdd?: boolean | FilterMethod
  restrictKeyEdit?: boolean | FilterMethod
  keySort?: boolean | CompareMethod
  showArrayIndices?: boolean
  defaultValue?: unknown
  minWidth?: string | number
  maxWidth?: number
  stringTruncate?: number
}

const ValueDataTypes = ['string', 'number', 'boolean', 'null'] as const
const CollectionDataTypes = ['object', 'array'] as const
export const DataTypes = [...ValueDataTypes, ...CollectionDataTypes] as const

export type CollectionDataType = (typeof CollectionDataTypes)[number]
export type DataType = (typeof DataTypes)[number] | 'invalid'

export type CollectionKey = string | number
export type CollectionData = object | unknown[]

export type ErrorString = string

/**
 * METHODS
 */

export type UpdateMethod = (props: {
  newData: object
  currentData: object
  newValue: unknown
  currentValue: unknown
  name: CollectionKey
  path: CollectionKey[]
}) => void | ErrorString | false

export type FilterMethod = (input: {
  key: CollectionKey
  path: CollectionKey[]
  level: number
  value: unknown
  size: number
}) => boolean

export type CopyType = 'path' | 'value'
export type CopyMethod = (input: {
  key: CollectionKey
  path: CollectionKey[]
  value: unknown
  type: CopyType
}) => void

export type CompareMethod = (a: string, b: string) => number

// Internal update
export type OnChangeMethod = (value: unknown, path: (string | number)[]) => Promise<string | void>

/**
 * NODES
 */

interface BaseNodeProps {
  data: unknown
  path: CollectionKey[]
  name: CollectionKey
  onEdit: OnChangeMethod
  onDelete: OnChangeMethod
  enableClipboard: boolean | CopyMethod
  restrictEditFilter: FilterMethod
  restrictDeleteFilter: FilterMethod
  restrictAddFilter: FilterMethod
  showArrayIndices: boolean
  stringTruncate: number
}

export interface CollectionNodeProps extends BaseNodeProps {
  data: CollectionData
  indent: number
  collapseFilter: FilterMethod
  onAdd: OnChangeMethod
  keySort: boolean | CompareMethod
  defaultValue: unknown
}

export interface ValueNodeProps extends BaseNodeProps {
  data: string | number | boolean | null
}

export interface InputProps {
  value: unknown
  setValue: React.Dispatch<React.SetStateAction<string | number | boolean | null>>
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  handleEdit: () => void
  handleCancel: () => void
  path: CollectionKey[]
  stringTruncate: number
}
