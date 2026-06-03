/**
 * Values and Methods returned from this hook are common to both Collection
 * Nodes and Value Nodes
 */

import React, { useCallback, useRef, useState } from 'react'
import { useEditingSelector, useEditingStore } from '../contexts'
import {
  type CollectionKey,
  type CollectionNodeProps,
  type EditEvent,
  type ErrorString,
  type JsonEditorError,
  type JsonEditorErrorCode,
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
    onEdit,
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
    sort,
    arrayIndexFromOne,
    handleKeyboard,
    customNodeData,
  } = props
  const { closeEdit, setPreviousValue, getSnapshot } = useEditingStore()
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

  // Fires an `onEditEvent` for this node — single source of truth for the
  // `{ ...nodeData, fullData: <live>, event }` shape (replaces the duplicate
  // `emitEditEvent` closures in CollectionNode and ValueNodeWrapper, plus the
  // four inlined copies in `handleEditKey` below). `nodeData` is read live
  // (closure recreated each render); `fullData` is read live from the latest
  // document — same rule as `onError`. `extra` carries the optional payload
  // fields (`oldKey`/`newKey` on `confirmRename`).
  const emitEditEvent = (
    event: EditEvent['event'],
    extra?: { oldKey?: CollectionKey; newKey?: CollectionKey }
  ) => onEditEvent?.({ ...nodeData, fullData: getLatestData(), event, ...extra } as EditEvent)

  // Collapses the three-branch `result === false | string | else` dance after
  // every internal `onEdit` / `onAdd` / `onDelete` / `onRename` call. Single
  // helper so the per-site copies can't drift. Optional callbacks cover the
  // per-site nuances (revert-to-data, extra `closeEdit()` on the error path,
  // success-only side effects); omit `cancelEvent` for "instant" mutations
  // (delete, array add) which have no session to terminate on `false`.
  const handleMutationResult = ({
    result,
    errorCode,
    errorValue,
    cancelEvent,
    confirmEvent,
    confirmExtra,
    onRevert,
    onErrorExtra,
    onConfirmExtra,
  }: {
    result: string | void | false
    errorCode: JsonEditorErrorCode
    errorValue: JsonData
    cancelEvent?: EditEvent['event']
    confirmEvent?: EditEvent['event']
    confirmExtra?: { oldKey?: CollectionKey; newKey?: CollectionKey }
    onRevert?: () => void
    onErrorExtra?: () => void
    onConfirmExtra?: () => void
  }) => {
    if (result === false) {
      onRevert?.()
      if (cancelEvent) emitEditEvent(cancelEvent)
      return
    }
    if (typeof result === 'string') {
      onError({ code: errorCode, message: result }, errorValue)
      onErrorExtra?.()
      onRevert?.()
      if (cancelEvent) emitEditEvent(cancelEvent)
      return
    }
    onConfirmExtra?.()
    if (confirmEvent) emitEditEvent(confirmEvent, confirmExtra)
  }

  // Stable wrapper around `getNextOrPrevious` against the LIVE document for
  // this node's `path`, so callers (`KeyDisplay`, value-node `tabForward` /
  // `tabBack`) don't need to re-thread `getLatestData` / `path` / `sort`.
  const getNextOrPreviousAtPath = (type: 'next' | 'prev') =>
    getNextOrPrevious(getLatestData(), path, type, sort)

  // Reverts a value-node type-change snapshot if one is active. Returns true
  // if a revert fired (caller can skip its own fallback). Used by both
  // CollectionNode's `handleCancel` (no fallback) and ValueNodeWrapper's
  // `revertSession` (which falls back to `revertToData` when no snapshot).
  const revertPreviousValue = () => {
    const previousValue = getSnapshot().previousValue
    setPreviousValue(null)
    if (previousValue !== null) {
      onEdit(previousValue, path)
      return true
    }
    return false
  }

  // Commits a key rename and fires the matching `onEditEvent` (`confirmRename`/
  // `cancelRename`).
  const handleEditKey = (newKey: string) => {
    closeEdit()
    // No-op rename (unchanged key) reports as a cancel (session closed, no change).
    if (name === newKey) {
      emitEditEvent('cancelRename')
      return
    }
    if (!parentData) return
    const existingKeys = Object.keys(parentData)
    if (existingKeys.includes(newKey)) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, newKey)
      emitEditEvent('cancelRename')
      return
    }

    // A rename is a first-class `event: 'rename'` update — `onRename` rebuilds
    // the parent (preserving key order) and commits the whole document. The
    // session terminates with `confirmRename` (committed) or `cancelRename`
    // (rejected/aborted); `confirmRename` carries the old + new keys. `false` is
    // a silent cancel (consumer returned `null`); a string (including an empty
    // one) is a real error → surface it and report the session as cancelled.
    onRename(path, newKey).then((result) =>
      handleMutationResult({
        result,
        errorCode: 'UPDATE_ERROR',
        errorValue: newKey as ValueData,
        cancelEvent: 'cancelRename',
        confirmEvent: 'confirmRename',
        confirmExtra: { oldKey: name, newKey },
      })
    )
  }

  // Common DERIVED VALUES (this makes the JSX logic less messy). `isEditing` /
  // `isEditingKey` are the per-node selector subscriptions computed above.
  const isArray = typeof path.slice(-1)[0] === 'number'
  const canEditKey = parentData !== null && canEdit && canAdd && canDelete && !isArray

  const derivedValues = { isEditing, isEditingKey, isArray, canEditKey }

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
    arrayIndexFromOne,
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
    emitEditEvent,
    handleMutationResult,
    getNextOrPreviousAtPath,
    revertPreviousValue,
    buildKeyDisplayProps,
  }
}
