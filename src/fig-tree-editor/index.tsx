import { useState } from 'react'

type UpdateMethod = (props: {
  newData: object
  currData: object
  newValue: unknown
  currValue: unknown
  name: string
  path: string[]
}) => void | false

type FilterMethod = (input: { name: string; path: string[]; value: unknown }) => boolean

interface EditorProps {
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

const JsonEditor: React.FC<EditorProps> = ({
  data: srcData,
  schema,
  rootName = 'root',
  onUpdate,
  onEdit,
  onDelete,
  onAdd,
  onCopy,
  theme,
  style,
  indent = 4,
  collapse = false,
  restrictEdit = false,
  restrictDelete = false,
  restrictAdd = false,
}) => {
  const [data, setData] = useState<DataNode>(buildDataStructure(srcData, rootName))

  const Component = NodeTypeComponentMap[data.type]

  const onUpdateAll = async () => {}

  const onChange = async (value: DataNode, path: string[]) => {
    // Calculate new data object
    // Run onEdit method
    // If not return false, update local state from new Data
  }

  const onRemove = () => {}

  const onAddNew = () => {}

  const collapseFilter = () => {}

  return (
    <div className="fg-editor-container">
      <Component data={data} />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

interface ComponentProps {
  //   path: string[]
  //   name: string
  onChange: () => {}
  onRemove: () => {}
}

interface ObjectComponentProps extends ComponentProps {
  data: ObjectNode
  onAddNew: () => {}
}

interface StringComponentProps extends ComponentProps {
  data: StringNode
}

export const ObjectComponent: React.FC<ObjectComponentProps> = ({ data, onChange, onRemove }) => {
  const { path, value, key } = data

  return (
    <p>
      <strong>{key}</strong>:<br />
      {value.map((node) => {
        if (node.type === 'string')
          return <StringComponent data={node} onChange={onChange} onRemove={onRemove} />
        else
          return (
            <span>
              TO-DO: {data.type}
              <br />
            </span>
          )
      })}
    </p>
  )
}

const StringComponent: React.FC<StringComponentProps> = ({ data, onChange, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false)
  return (
    <div className="fg-component">
      {isEditing ? (
        // Type selector
        // Input form
        <p>Editing</p>
      ) : (
        <p onDoubleClick={() => setIsEditing(true)}>{`${data.key}: ${data.value}`}</p>
      )}
      {/* Buttons */}
    </div>
  )
}

type DataType = 'object' | 'array' | 'string' | 'float' | 'integer' | 'boolean' | 'null' | 'invalid'

interface BaseNode {
  key: string | number
  type: DataType
  path: (string | number)[]
  isValid?: boolean
}

export interface ObjectNode extends BaseNode {
  type: 'object'
  //   indexMap: Record<string, number>
  value: DataNode[]
}

export interface ArrayNode extends BaseNode {
  type: 'array'
  value: DataNode[]
}

export interface StringNode extends BaseNode {
  type: 'string'
  value: string
}
export interface FloatNode extends BaseNode {
  type: 'float'
  value: number
}

export interface IntNode extends BaseNode {
  type: 'integer'
  value: number
}

export interface BoolNode extends BaseNode {
  type: 'boolean'
  value: boolean
}

export interface NullNode extends BaseNode {
  type: 'null'
  value: null
}

export interface InvalidNode extends BaseNode {
  type: 'invalid'
  value: unknown
}

export type DataNode =
  | ObjectNode
  | ArrayNode
  | StringNode
  | FloatNode
  | IntNode
  | BoolNode
  | NullNode
  | InvalidNode

const buildDataStructure = (value: unknown, key: string | number, path = []): DataNode => {
  if (value === null) return { key, type: 'null', path, value: value }
  if (typeof value === 'string') return { key, type: 'string', path, value }
  if (typeof value === 'boolean') return { key, type: 'boolean', path, value }
  if (typeof value === 'number' && value % 1 === 0) return { key, type: 'integer', path, value }
  if (typeof value === 'number' && value % 1 !== 0) return { key, type: 'float', path, value }
  if (Array.isArray(value))
    return {
      key,
      type: 'array',
      path,
      value: (value as unknown[]).map((val, index) =>
        buildDataStructure(val, index, [...path, index] as any)
      ),
    }
  if (typeof value === 'object') {
    const entries = Object.entries(value as object)
    return {
      key,
      type: 'object',
      path,
      //   indexMap: entries.reduce((acc, ) => {}, {}),
      value: entries.map(([key, val]) =>
        // TO DO -- sort keys
        buildDataStructure(val, key, [...path, key] as any)
      ),
    }
  }

  return { key, value, path, type: 'invalid' }
}

const NodeTypeComponentMap: { [key in DataType]: React.FC<any> } = {
  object: ObjectComponent,
  array: ObjectComponent,
  string: ObjectComponent,
  float: ObjectComponent,
  integer: ObjectComponent,
  boolean: ObjectComponent,
  null: ObjectComponent,
  invalid: ObjectComponent,
}

export default JsonEditor
