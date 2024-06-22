import { useMemo, useState } from 'react'
import { useTreeState } from './TreeStateProvider'
import {
  type CollectionData,
  type CollectionNodeProps,
  type ErrorString,
  type JerError,
  type ValueData,
  type ValueNodeProps,
  ERROR_DISPLAY_TIME,
} from './types'
import { toPathString } from './ValueNodes'
import { filterNode } from './filterHelpers'

// Require:
// - ...props
// -

export interface CommonProps {
  props: CollectionNodeProps | ValueNodeProps
  collapsed: boolean
}

export const useCommon = ({ props, collapsed }: CommonProps) => {
  const {
    data,
    nodeData: incomingNodeData,
    parentData,
    onEdit,
    onError: onErrorCallback,
    showErrorMessages,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    restrictDragFilter,
    searchFilter,
    searchText,
    translate,
  } = props
  const { setCurrentlyEditingElement } = useTreeState()
  const [error, setError] = useState<string | null>(null)

  const nodeData = { ...incomingNodeData, collapsed }
  const { path, key: name, size } = nodeData

  const pathString = toPathString(path)

  const canEdit = useMemo(() => !restrictEditFilter(nodeData), [nodeData])
  const canDelete = useMemo(() => !restrictDeleteFilter(nodeData), [nodeData])
  const canAdd = useMemo(() => !restrictAddFilter(nodeData), [nodeData])
  const canDrag = useMemo(() => !restrictDragFilter(nodeData) && canDelete, [nodeData])

  const showError = (errorString: ErrorString) => {
    if (showErrorMessages) {
      setError(errorString)
      setTimeout(() => setError(null), ERROR_DISPLAY_TIME)
    }
    console.warn('Error', errorString)
  }

  const onError = useMemo(
    () => (error: JerError, errorValue: CollectionData | ValueData | string) => {
      showError(error.message)
      if (onErrorCallback) {
        onErrorCallback({
          currentData: nodeData.fullData,
          errorValue,
          currentValue: data,
          name,
          path,
          error,
        })
      }
    },
    [onErrorCallback, showErrorMessages]
  )

  const handleEditKey = (newKey: string) => {
    setCurrentlyEditingElement(null)
    if (name === newKey) return
    if (!parentData) return
    const parentPath = path.slice(0, -1)
    const existingKeys = Object.keys(parentData)
    if (existingKeys.includes(newKey)) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, newKey)
      return
    }

    // Need to update data in array form to preserve key order
    const newData = Object.fromEntries(
      Object.entries(parentData).map(([key, val]) => (key === name ? [newKey, val] : [key, val]))
    )
    onEdit(newData, parentPath)
  }

  if (!filterNode('collection', nodeData, searchFilter, searchText) && nodeData.level > 0) {
    return {
      pathString,
      nodeData,
      path,
      name,
      size,
      canEdit,
      canDelete,
      canAdd,
      canDrag,
      error,
      setError,
      showError,
      onError,
      renderNull: true,
      handleEditKey,
    }
  }

  // - bunch of Derived values
  // - Maybe? getCustomNode

  return {
    pathString,
    nodeData,
    path,
    name,
    size,
    canEdit,
    canDelete,
    canAdd,
    canDrag,
    error,
    setError,
    showError,
    onError,
    renderNull: false,
    // Others
    handleEditKey,
  }
}
