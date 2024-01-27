import { ThemeInput, CompiledStyles } from './theme'
import { LocalisedStrings, TranslateFunction } from './localisation'
import React from 'react'

export const ERROR_DISPLAY_TIME = 2500 // ms

export interface JsonEditorProps {
  data: object
  // schema?: object
  rootName?: string
  onUpdate?: UpdateFunction
  onEdit?: UpdateFunction
  onDelete?: UpdateFunction
  onAdd?: UpdateFunction
  enableClipboard?: boolean | CopyFunction
  theme?: ThemeInput
  icons?: IconReplacements
  className?: string
  indent?: number
  collapse?: boolean | number | FilterFunction
  showCollectionCount?: boolean | 'when-closed'
  restrictEdit?: boolean | FilterFunction
  restrictDelete?: boolean | FilterFunction
  restrictAdd?: boolean | FilterFunction
  restrictTypeSelection?: boolean | DataType[] | TypeFilterFunction
  // restrictKeyEdit?: boolean | FilterFunction
  keySort?: boolean | CompareFunction
  showArrayIndices?: boolean
  defaultValue?: unknown
  minWidth?: string | number
  maxWidth?: string | number
  stringTruncate?: number
  translations?: Partial<LocalisedStrings>
  customNodeDefinitions?: CustomNodeDefinition[]
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

export type UpdateFunction = (props: {
  newData: object
  currentData: object
  newValue: unknown
  currentValue: unknown
  name: CollectionKey
  path: CollectionKey[]
}) => void | ErrorString | false

export interface FilterProps {
  key: CollectionKey
  path: CollectionKey[]
  level: number
  value: unknown
  size: number | null
}

export type FilterFunction = (input: FilterProps) => boolean
export type TypeFilterFunction = (input: FilterProps) => boolean | DataType[]

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
export type OnChangeFunction = (value: unknown, path: (string | number)[]) => Promise<string | void>

/**
 * NODES
 */

interface BaseNodeProps {
  data: unknown
  parentData: CollectionData | null
  path: CollectionKey[]
  name: CollectionKey
  onEdit: OnChangeFunction
  onDelete: OnChangeFunction
  enableClipboard: boolean | CopyFunction
  restrictEditFilter: FilterFunction
  restrictDeleteFilter: FilterFunction
  restrictAddFilter: FilterFunction
  restrictTypeSelection: boolean | DataType[] | TypeFilterFunction
  stringTruncate: number
  indent: number
  translate: TranslateFunction
  customNodeDefinitions: CustomNodeDefinition[]
}

export interface CollectionNodeProps extends BaseNodeProps {
  data: CollectionData
  collapseFilter: FilterFunction
  onAdd: OnChangeFunction
  keySort: boolean | CompareFunction
  showArrayIndices: boolean
  showCollectionCount: boolean | 'when-closed'
  defaultValue: unknown
}

type ValueData = string | number | boolean | null
export interface ValueNodeProps extends BaseNodeProps {
  data: ValueData
  showLabel: boolean
}

export interface CustomNodeProps extends BaseNodeProps {
  value: ValueData | CollectionData
  customProps?: Record<string, unknown>
  parentData: CollectionData | null
  setValue: React.Dispatch<React.SetStateAction<ValueData>>
  handleEdit: () => void
  handleCancel: () => void
  handleKeyPress: (e: React.KeyboardEvent) => void
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  styles: CompiledStyles
}

export interface CustomNodeDefinition {
  condition: FilterFunction
  element: React.FC<CustomNodeProps>
  name?: string // appears in "Type" selector
  customNodeProps?: Record<string, unknown>
  hideKey?: boolean
  defaultValue?: unknown
  showInTypesSelector?: boolean // default false
  showOnEdit?: boolean // default false
  showOnView?: boolean // default true
  showEditTools?: boolean // default true
}

export interface InputProps {
  value: unknown
  setValue: React.Dispatch<React.SetStateAction<ValueData>>
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  handleEdit: () => void
  handleCancel: () => void
  path: CollectionKey[]
  stringTruncate: number
  translate: TranslateFunction
}
