/**
 * Values and Methods returned from this hook are common to both Collection
 * Nodes and Value Nodes
 */

import { useCallback, useRef, useState } from 'react'
import { useEditingSelector, useEditingStore } from '../contexts'
import {
  type CollectionNodeProps,
  type ErrorString,
  type JsonEditorError,
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
    nodeData: incomingNodeData,
    parentData,
    onRename,
    onError: onErrorCallback,
    onEditEvent,
    getLatestData,
    showErrorMessages,
    restrictEditFilter,
    restrictDeleteFilter,
    restrictAddFilter,
    restrictDragFilter,
    translate,
    errorMessageTimeout,
  } = props
  const { closeEdit } = useEditingStore()
  const [error, setError] = useState<string | null>(null)

  const nodeData = { ...incomingNodeData, collapsed }
  const { path, key: name, size } = nodeData

  const pathString = toPathString(path)

  // Per-node editing flags as primitive selectors: this node re-renders only
  // when its OWN boolean flips, so moving an edit between nodes re-renders just
  // the two involved, not the whole tree.
  const isEditing = useEditingSelector((s) => {
    const editing = s.currentlyEditingElement
    return editing !== null && editing.mode === 'value' && pathsEqual(editing.path, path)
  })
  const isEditingKey = useEditingSelector((s) => {
    const editing = s.currentlyEditingElement
    return editing !== null && editing.mode === 'key' && pathsEqual(editing.path, path)
  })

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

  // `onError` keeps a stable identity (it's a node prop, threaded down and
  // compared by the memo), so it can't close over the live document or this
  // node's churning `nodeData` — once `onErrorCallback` is stabilized upstream
  // the closure freezes. Read this node's `NodeData` from a ref-to-latest and
  // the live document from `getLatestData()` (so the flat payload is current).
  const nodeDataRef = useRef(nodeData)
  nodeDataRef.current = nodeData
  const onError = useCallback(
    (error: JsonEditorError, errorValue: JsonData | string) => {
      showError(error.message)
      if (onErrorCallback) {
        onErrorCallback({
          ...nodeDataRef.current,
          fullData: getLatestData(),
          error,
          errorValue,
        })
      }
    },
    // `showError` itself isn't listed (it'd churn onError every render); its
    // closure values (`showErrorMessages`, `errorMessageTimeout`) are, so onError
    // re-captures a fresh `showError` whenever either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onErrorCallback, showErrorMessages, getLatestData, errorMessageTimeout]
  )

  const handleEditKey = (newKey: string) => {
    closeEdit()
    // No-op rename (unchanged key) reports as a cancel (session closed, no change).
    if (name === newKey) {
      onEditEvent?.({ ...nodeData, event: 'cancelRename' })
      return
    }
    if (!parentData) return
    const existingKeys = Object.keys(parentData)
    if (existingKeys.includes(newKey)) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, newKey)
      onEditEvent?.({ ...nodeData, event: 'cancelRename' })
      return
    }

    // A rename is a first-class `event: 'rename'` update — `onRename` rebuilds
    // the parent (preserving key order) and commits the whole document. The
    // session terminates with `confirmRename` (committed) or `cancelRename`
    // (rejected/aborted); `confirmRename` carries the old + new keys. `false` is
    // a silent cancel (consumer returned `null`); a string (including an empty
    // one) is a real error → surface it and report the session as cancelled.
    onRename(path, newKey).then((result) => {
      if (result === false) onEditEvent?.({ ...nodeData, event: 'cancelRename' })
      else if (typeof result === 'string') {
        onError({ code: 'UPDATE_ERROR', message: result }, newKey as ValueData)
        onEditEvent?.({ ...nodeData, event: 'cancelRename' })
      } else onEditEvent?.({ ...nodeData, event: 'confirmRename', oldKey: name, newKey })
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
