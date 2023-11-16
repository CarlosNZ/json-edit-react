import { ThemeInput } from './theme'
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
  // showCount?: boolean | FilterFunction
  restrictEdit?: boolean | FilterFunction
  restrictDelete?: boolean | FilterFunction
  restrictAdd?: boolean | FilterFunction
  restrictKeyEdit?: boolean | FilterFunction
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
  path: CollectionKey[]
  name: CollectionKey
  onEdit: OnChangeFunction
  onDelete: OnChangeFunction
  enableClipboard: boolean | CopyFunction
  restrictEditFilter: FilterFunction
  restrictDeleteFilter: FilterFunction
  restrictAddFilter: FilterFunction
  showArrayIndices: boolean
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
  defaultValue: unknown
}

export interface ValueNodeProps extends BaseNodeProps {
  data: string | number | boolean | null
}

export interface CustomNodeProps extends BaseNodeProps {
  customProps: Record<string, unknown>
}

export interface CustomNodeWrapperProps {
  name: CollectionKey
  hideKey: boolean
  children: JSX.Element
  indent?: number
}

export interface CustomNodeDefinition {
  condition: FilterFunction
  element: React.FC
  props?: Record<string, unknown>
  hideKey?: boolean
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
