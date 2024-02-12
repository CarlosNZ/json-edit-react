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

export type UpdateFunction = (props: {
  newData: object
  currentData: object
  newValue: unknown
  currentValue: unknown
  name: CollectionKey
  path: CollectionKey[]
}) => void | ErrorString | false

export type FilterFunction = (input: NodeData) => boolean
export type TypeFilterFunction = (input: NodeData) => boolean | DataType[]
export type CustomTextFunction = (input: NodeData) => string | null

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

export interface NodeData {
  key: CollectionKey
  path: CollectionKey[]
  level: number
  value: unknown
  size: number | null
}

interface BaseNodeProps {
  data: unknown
  parentData: CollectionData | null
  nodeData: NodeData
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

type ValueData = string | number | boolean
export interface ValueNodeProps extends BaseNodeProps {
  data: ValueData
  showLabel: boolean
}

export interface CustomNodeProps<T = Record<string, unknown>> extends BaseNodeProps {
  value: ValueData | CollectionData
  customNodeProps?: T
  parentData: CollectionData | null
  setValue: React.Dispatch<React.SetStateAction<ValueData>>
  handleEdit: () => void
  handleCancel: () => void
  handleKeyPress: (e: React.KeyboardEvent) => void
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  styles: CompiledStyles
}

export interface CustomNodeDefinition<T = Record<string, unknown>> {
  condition: FilterFunction
  element: React.FC<CustomNodeProps<T>>
  name?: string // appears in "Type" selector
  customNodeProps?: Record<string, unknown>
  hideKey?: boolean
  defaultValue?: unknown
  showInTypesSelector?: boolean // default false
  showOnEdit?: boolean // default false
  showOnView?: boolean // default true
  showEditTools?: boolean // default true
}

export type CustomTextDefinitions = Partial<{ [key in keyof LocalisedStrings]: CustomTextFunction }>

export interface InputProps {
  value: unknown
  setValue: React.Dispatch<React.SetStateAction<ValueData>>
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  handleEdit: () => void
  handleCancel: () => void
  path: CollectionKey[]
  stringTruncate: number
  nodeData: NodeData
  translate: TranslateFunction
}
