/**
 * Values and Methods returned from this hook are common to both Collection
 * Nodes and Value Nodes
 */

import React, { useCallback, useRef, useState } from 'react'
import { useEditingSelector, useEditingStore } from '../contexts'
import {
  type CollectionNodeProps,
  type ErrorString,
  type JerError,
  type ThemeableElement,
  type ValueData,
  type ValueNodeProps,
  type JsonData,
} from '../types'
import { getNextOrPrevious } from '../utils/keyboard'
import { pathsEqual, toPathString } from '../utils/pathTools'

interface CommonProps {
  props: CollectionNodeProps | ValueNodeProps
  collapsed?: boolean
}

export const useCommon = ({ props, collapsed }: CommonProps) => {
  const {
    nodeData: incomingNodeData,
    parentData,
    onError: onErrorCallback,
    getLatestData,
    showErrorMessages,
    allowEditFilter,
    allowDeleteFilter,
    allowAddFilter,
    allowDragFilter,
    translate,
    errorDisplayTime,
    sort,
    arrayIndexStart,
    handleKeyboard,
    customNodeData,
  } = props
  const { submit, cancel } = useEditingStore()
  const [error, setError] = useState<string | null>(null)

  const nodeData = { ...incomingNodeData, collapsed }
  const { path, key: name, size } = nodeData

  const pathString = toPathString(path)

  // Per-node editing flags as primitive selectors: this node re-renders only
  // when its OWN boolean flips, so moving an edit between nodes re-renders just
  // the two involved, not the whole tree.
  const isEditing = useEditingSelector((s) => {
    const active = s.active
    return active !== null && active.op === 'edit' && pathsEqual(active.path, path)
  })
  const isEditingKey = useEditingSelector((s) => {
    const active = s.active
    return active !== null && active.op === 'rename' && pathsEqual(active.path, path)
  })
  // True while this node's optimistic commit is in flight: the value is already
  // applied locally, but the consumer's async `onUpdate` hasn't settled yet.
  // Primitive slice keyed on this node's own path, so only this node re-renders
  // when its save starts/finishes. Stays `false` when there's no `onUpdate` (the
  // commit settles synchronously) or for a no-op edit.
  const isPending = useEditingSelector((s) => pathString in s.settling)

  const canEdit = allowEditFilter(nodeData)
  const canDelete = allowDeleteFilter(nodeData)
  const canAdd = allowAddFilter(nodeData)
  // Drag permission no longer depends on global editing state (which would
  // re-render every node when editing starts/ends). "Don't drag while editing"
  // is enforced at drag-start instead (see useDragNDrop), reading the store
  // imperatively.
  const canDrag = allowDragFilter(nodeData) && canDelete

  const showError = (errorString: ErrorString) => {
    if (showErrorMessages) {
      setError(errorString)
      setTimeout(() => setError(null), errorDisplayTime)
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
    (error: JerError, errorValue: JsonData | string) => {
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
    // closure values (`showErrorMessages`, `errorDisplayTime`) are, so onError
    // re-captures a fresh `showError` whenever either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onErrorCallback, showErrorMessages, getLatestData, errorDisplayTime]
  )

  // Stable wrapper around `getNextOrPrevious` against the LIVE document for
  // this node's `path`, so callers (`KeyDisplay`, value-node `tabForward` /
  // `tabBack`) don't need to re-thread `getLatestData` / `path` / `sort`.
  const getNextOrPreviousAtPath = (type: 'next' | 'prev') =>
    getNextOrPrevious(getLatestData(), path, type, sort)

  // Commits a key rename through the store's commit engine. The no-op /
  // duplicate-key checks stay client-side and close the session as a cancel.
  const handleEditKey = (newKey: string) => {
    // No-op rename (unchanged key): close the session without committing.
    if (name === newKey) {
      cancel()
      return
    }
    if (!parentData) return
    if (Object.keys(parentData).includes(newKey)) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, newKey)
      cancel()
      return
    }
    // First-class `event: 'rename'`: the engine fires `submitRename` →
    // `commitRename` (carrying old + new keys) and settles. A rejected
    // settlement reverts and surfaces the error here.
    submit({ op: 'rename', path, newKey }).then((outcome) => {
      if (outcome?.status === 'error') onError(outcome.error, newKey as ValueData)
    })
  }

  // Common DERIVED VALUES (this makes the JSX logic less messy). `isEditing` /
  // `isEditingKey` are the per-node selector subscriptions computed above.
  const isArray = typeof path.slice(-1)[0] === 'number'
  const canEditKey = parentData !== null && canEdit && canAdd && canDelete && !isArray

  const derivedValues = { isEditing, isEditingKey, isPending, isArray, canEditKey }

  const emptyStringKey = name === '' && path.length > 0 ? translate('EMPTY_STRING', nodeData) : null

  // Shared `KeyDisplay` props. Caller supplies `handleCancel`, `getStyles`,
  // and (collection-only) `keyValueArray` + `handleClick`; `useCommon` already
  // owns the rest. Centralizes the prop list so a new `KeyDisplay` field
  // doesn't need to be threaded through both call sites.
  const buildKeyDisplayProps = ({
    handleCancel,
    getStyles,
    keyValueArray,
    handleClick,
  }: {
    handleCancel: () => void
    getStyles: (component: ThemeableElement, nodeData: typeof incomingNodeData) => React.CSSProperties
    keyValueArray?: Array<[string | number, ValueData]>
    handleClick?: (e: React.MouseEvent) => void
  }) => ({
    canEditKey,
    isEditingKey,
    pathString,
    path,
    name,
    arrayIndexStart,
    handleKeyboard,
    handleEditKey,
    handleCancel,
    styles: getStyles('property', nodeData),
    getNextOrPrevious: getNextOrPreviousAtPath,
    emptyStringKey,
    nodeData,
    customNodeData,
    getStyles,
    ...(keyValueArray !== undefined ? { keyValueArray } : {}),
    ...(handleClick !== undefined ? { handleClick } : {}),
  })

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
    getNextOrPreviousAtPath,
    buildKeyDisplayProps,
  }
}
