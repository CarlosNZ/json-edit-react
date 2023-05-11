/**
 * MAIN
 */

export interface EditorProps {
  data: object
  schema?: object
  rootName?: string
  onUpdate?: UpdateMethod
  onEdit?: UpdateMethod
  onDelete?: UpdateMethod
  onAdd?: UpdateMethod
  onCopy?: (value: unknown) => void
  theme?: any // UPDATE
  style?: object // UPDATE
  indent?: number
  collapse?: boolean | number | FilterMethod
  restrictEdit?: FilterMethod | boolean
  restrictDelete?: FilterMethod | boolean
  restrictAdd?: FilterMethod | boolean
  keySort?: boolean // OR Comparator Method
}

export const DataTypes = ['object', 'array', 'string', 'number', 'boolean', 'null'] as const

export type DataType = (typeof DataTypes)[number] | 'invalid'

/**
 * METHODS
 */

export type UpdateMethod = (props: {
  newData: object
  currentData: object
  newValue: unknown
  currentValue: unknown
  name: string
  path: string[]
}) => void | false

export type OnChangeMethod = <T>(value: T, path: string[]) => Promise<string | void>

export type FilterMethod = (input: { name: string; path: string[]; value: unknown }) => boolean

/**
 * NODES
 */

interface BaseNodeProps {
  data: unknown
  path: string[]
  name: string
  onEdit: OnChangeMethod
  onDelete?: OnChangeMethod
}

export interface ObjectNodeProps extends BaseNodeProps {
  data: object
  onAdd?: OnChangeMethod
}

export interface ValueNodeProps extends BaseNodeProps {
  data: string
}

export interface InputProps {
  value: string
  setValue: React.Dispatch<React.SetStateAction<string>>
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  handleEdit: () => void
  handleCancel: () => void
  path: string[]
}
