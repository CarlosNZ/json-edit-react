/**
 * Values and Methods returned from this hook are common to both Collection
 * Nodes and Value Nodes
 */

import { useCallback, useState } from 'react'
import { useEditingSelector, useEditingStore } from '../contexts'
import {
  type CollectionNodeProps,
  type ErrorString,
  type JerError,
  type ValueData,
  type ValueNodeProps,
  type JsonData,
} from '../types'
import { pathsEqual, toPathString } from '../utils/pathTools'

interface CommonProps {
  props: CollectionNodeProps | ValueNodeProps
  collapsed?: boolean
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
    translate,
    errorMessageTimeout,
  } = props
  const { cancelEdit } = useEditingStore()
  const [error, setError] = useState<string | null>(null)

  const nodeData = { ...incomingNodeData, collapsed }
  const { path, key: name, size } = nodeData

  const pathString = toPathString(path)

  // Per-node editing flags as primitive selectors: this node re-renders only
  // when its OWN boolean flips, so moving an edit between nodes re-renders just
  // the two involved, not the whole tree.
  const isEditing = useEditingSelector(
    (s) => s.currentlyEditingElement?.mode === 'value' && pathsEqual(s.currentlyEditingElement.path, path)
  )
  const isEditingKey = useEditingSelector(
    (s) => s.currentlyEditingElement?.mode === 'key' && pathsEqual(s.currentlyEditingElement.path, path)
  )

  const canEdit = !restrictEditFilter(nodeData)
  const canDelete = !restrictDeleteFilter(nodeData)
  const canAdd = !restrictAddFilter(nodeData)
  // Drag permission no longer depends on global editing state (which would
  // re-render every node when editing starts/ends). "Don't drag while editing"
  // is enforced at drag-start instead (see useDragNDrop), reading the store
  // imperatively.
  const canDrag = !restrictDragFilter(nodeData) && canDelete

  const showError = (errorString: ErrorString) => {
    if (showErrorMessages) {
      setError(errorString)
      setTimeout(() => setError(null), errorMessageTimeout)
    }
    console.warn('Error', errorString)
  }

  const onError = useCallback(
    (error: JerError, errorValue: JsonData | string) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onErrorCallback, showErrorMessages]
  )

  const handleEditKey = (newKey: string) => {
    cancelEdit()
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
    onEdit(newData, parentPath).then((error) => {
      if (error) {
        onError({ code: 'UPDATE_ERROR', message: error }, newKey as ValueData)
      }
    })
  }

  // Common DERIVED VALUES (this makes the JSX logic less messy). `isEditing` /
  // `isEditingKey` are the per-node selector subscriptions computed above.
  const isArray = typeof path.slice(-1)[0] === 'number'
  const canEditKey = parentData !== null && canEdit && canAdd && canDelete && !isArray

  const derivedValues = { isEditing, isEditingKey, isArray, canEditKey }

  const emptyStringKey = name === '' && path.length > 0 ? translate('EMPTY_STRING', nodeData) : null

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
    showError,
    onError,
    setError,
    handleEditKey,
    derivedValues,
    emptyStringKey,
  }
}
