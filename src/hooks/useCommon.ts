/**
 * Values and methods common to both collection nodes and value nodes.
 */

import React, { useCallback, useRef, useState } from 'react'
import {
  useEditingSelector,
  useEditingStore,
  useRawFilterState,
  useVisibleChildCount,
} from '../contexts'
import {
  type CollectionNodeProps,
  type ErrorString,
  type JerError,
  type NodeData,
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
    canAddHere,
    translate,
    errorDisplayTime,
    sort,
    arrayIndexStart,
    handleKeyboard,
    customNodeData,
  } = props
  const { submit } = useEditingStore()
  const [error, setError] = useState<string | null>(null)

  const nodeData = {
    ...incomingNodeData,
    collapsed,
    visibleSize: useVisibleChildCount(incomingNodeData.path),
  }
  const { path, key: name, size } = nodeData

  const pathString = toPathString(path)

  // Per-node editing flags as primitive selectors, so this node re-renders
  // only when its OWN boolean flips: moving an edit between nodes re-renders
  // just the two involved, not the whole tree.
  const isEditing = useEditingSelector((s) => {
    const active = s.active
    return active !== null && active.op === 'edit' && pathsEqual(active.path, path)
  })
  const isEditingKey = useEditingSelector((s) => {
    const active = s.active
    return active !== null && active.op === 'rename' && pathsEqual(active.path, path)
  })
  // True while this node's optimistic commit is in flight: the value is applied
  // locally but the consumer's async `onUpdate` hasn't settled. A primitive
  // slice keyed on this node's own path, so only this node re-renders when its
  // save starts or finishes. Stays `false` with no `onUpdate`, and for a no-op
  // edit.
  const isPending = useEditingSelector((s) => pathString in s.settling)

  const canEdit = allowEditFilter(nodeData)
  const canDelete = allowDeleteFilter(nodeData)
  const canAdd = allowAddFilter(nodeData)
  // Drag permission is only "can this node be picked up". Moving a node OUT of
  // its collection also needs `canDelete`, checked at the drop (see
  // useDragNDrop); reordering within a collection doesn't. "Don't drag while
  // editing" is enforced at drag-start by reading the store imperatively, so
  // this deliberately doesn't subscribe to editing state — that would re-render
  // every node whenever an edit starts or ends.
  const canDrag = allowDragFilter(nodeData)

  const showError = (errorString: ErrorString) => {
    if (showErrorMessages) {
      setError(errorString)
      setTimeout(() => setError(null), errorDisplayTime)
    }
    console.warn('Error', errorString)
  }

  // `onError` keeps a stable identity — it's a node prop, threaded down and
  // compared by the memo — so it can't close over the live document or this
  // node's churning `nodeData`: `onErrorCallback` is stabilised upstream, which
  // would freeze the closure. This node's `NodeData` comes from a
  // ref-to-latest and the live document from `getLatestData()`.
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
    // `showError` itself isn't listed, since it would churn `onError` every
    // render. Its closure values are, so `onError` re-captures a fresh
    // `showError` whenever either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onErrorCallback, showErrorMessages, getLatestData, errorDisplayTime]
  )

  // Tab-viability predicate: a candidate leaf is a valid Tab target only if it
  // would be visible AND editable. It closes over the live filter state, so a
  // search keystroke that rebuilds that state rebuilds the predicate, but only
  // when those inputs actually change. The whole filter state is read via
  // `useRawFilterState` rather than per-path `useNodeVisible`, because the
  // predicate runs over many candidate paths in a single Tab and hooks can't be
  // called in a loop.
  const filterState = useRawFilterState()
  const isViableTarget = useCallback(
    (candidate: NodeData) => {
      const visible =
        filterState === null || filterState.visiblePaths.has(toPathString(candidate.path))
      return visible && allowEditFilter(candidate)
    },
    [filterState, allowEditFilter]
  )

  // Wrapper around `getNextOrPrevious` against the LIVE document for this
  // node's `path`, so callers don't re-thread `getLatestData`/`path`/`sort`. It
  // passes `isViableTarget`, so Tab skips filtered-out or non-editable leaves
  // up front rather than landing on them and bouncing.
  const getNextOrPreviousAtPath = (type: 'next' | 'prev') =>
    getNextOrPrevious(getLatestData(), path, type, sort, isViableTarget)

  // Commits a key rename through the store's commit engine. `onCommit` lets a
  // commit-on-displace / Tab open the next node at the commit moment.
  const handleEditKey = (newKey: string, onCommit?: () => void) => {
    if (!parentData) return
    // A duplicate key (as opposed to the unchanged key itself) can't commit:
    // surface the error and keep the session open WITHOUT running `onCommit`,
    // blocking a displacing switch as an invalid value or JSON edit does. Esc
    // and ✗ remain the escape hatch.
    if (name !== newKey && Object.keys(parentData).includes(newKey)) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, newKey)
      return
    }
    // The engine fires `submitRename` → `commitRename`, carrying old and new
    // keys, then settles. An unchanged key is a no-op flagged by `buildCommit`:
    // `commitRename` fires with no `onUpdate`. A rejected settlement reverts
    // and surfaces the error here.
    submit({ op: 'rename', path, newKey, onCommit }).then((outcome) => {
      if (outcome?.status === 'error') onError(outcome.error, newKey as ValueData)
    })
  }

  // Common DERIVED VALUES (this makes the JSX logic less messy). `isEditing` /
  // `isEditingKey` are the per-node selector subscriptions computed above.
  const isArray = typeof path.slice(-1)[0] === 'number'
  // A rename is a delete of the old key plus an add of the new one to the
  // PARENT collection, so it's gated as exactly that: this node is deletable
  // and the parent accepts a new property (`canAddHere` is the parent's
  // `allowAdd`, threaded down). `allowEdit` plays no part — a value-locked key
  // still renames. Never the root, never an array index.
  const canEditKey = parentData !== null && !isArray && canDelete && canAddHere

  const derivedValues = { isEditing, isEditingKey, isPending, isArray, canEditKey }

  const emptyStringKey = name === '' && path.length > 0 ? translate('EMPTY_STRING', nodeData) : null

  // Shared `KeyDisplay` props. The caller supplies `handleCancel`, `getStyles`
  // and, for collections, `keyValueArray` + `handleClick`; the rest lives here,
  // so a new `KeyDisplay` field doesn't have to be threaded through both call
  // sites.
  const buildKeyDisplayProps = ({
    handleCancel,
    getStyles,
    keyValueArray,
    handleClick,
  }: {
    handleCancel: () => void
    getStyles: (
      component: ThemeableElement,
      nodeData: typeof incomingNodeData
    ) => React.CSSProperties
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
