/**
 * Values and Methods returned from this hook are common to both Collection
 * Nodes and Value Nodes
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
  // Primitive slice keyed on this node's own path, so only this node
  // re-renders when its save starts/finishes. Stays `false` when there's no
  // `onUpdate` (the commit settles synchronously) or for a no-op edit.
  const isPending = useEditingSelector((s) => pathString in s.settling)

  const canEdit = allowEditFilter(nodeData)
  const canDelete = allowDeleteFilter(nodeData)
  const canAdd = allowAddFilter(nodeData)
  // Drag permission is just "can this node be picked up". It no longer depends
  // on delete-permission: `canDelete` only gates moving a node OUT of its
  // collection (a relocate), which is checked at the drop instead (see
  // useDragNDrop). Reordering within a collection needs no delete. Nor does it
  // depend on global editing state (which would re-render every node when
  // editing starts/ends) — "don't drag while editing" is enforced at drag-start
  // instead, reading the store imperatively.
  const canDrag = allowDragFilter(nodeData)

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

  // Tab-viability predicate: a candidate leaf is a valid Tab target only
  // if it would be visible AND editable. Visibility comes from the
  // precomputed `filterState.visiblePaths` Set; editability is the
  // existing `allowEditFilter(nodeData)`. Closures over the live filter
  // state, so a search keystroke that re-builds the state implicitly
  // re-builds the predicate (via useCallback identity), but only when
  // those inputs actually change — the §16 memo invariants hold.
  //
  // Hooks-rules note: we read the WHOLE filter state via
  // `useRawFilterState` (not per-path `useNodeVisible`) because the
  // predicate is invoked for many candidate paths during a single Tab,
  // and we can't call hooks inside a loop.
  const filterState = useRawFilterState()
  const isViableTarget = useCallback(
    (candidate: NodeData) => {
      const visible =
        filterState === null || filterState.visiblePaths.has(toPathString(candidate.path))
      return visible && allowEditFilter(candidate)
    },
    [filterState, allowEditFilter]
  )

  // Stable wrapper around `getNextOrPrevious` against the LIVE document for
  // this node's `path`, so callers (`KeyDisplay`, value-node `tabForward` /
  // `tabBack`) don't need to re-thread `getLatestData` / `path` / `sort`.
  // Threads `isViableTarget` so Tab skips filtered-out / non-editable
  // leaves up front instead of landing on them and bouncing.
  const getNextOrPreviousAtPath = (type: 'next' | 'prev') =>
    getNextOrPrevious(getLatestData(), path, type, sort, isViableTarget)

  // Commits a key rename through the store's commit engine. `onCommit` lets a
  // commit-on-displace / Tab open the next node at the commit moment.
  const handleEditKey = (newKey: string, onCommit?: () => void) => {
    if (!parentData) return
    // Duplicate key (and not the unchanged key itself) can't commit: surface
    // the error and keep the session open WITHOUT running `onCommit`, so a
    // displacing switch is blocked (like an invalid value/JSON edit). Esc/✗
    // remain the escape hatch.
    if (name !== newKey && Object.keys(parentData).includes(newKey)) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, newKey)
      return
    }
    // First-class `event: 'rename'`: the engine fires `submitRename` →
    // `commitRename` (carrying old + new keys) and settles. An unchanged key is
    // a no-op (`buildCommit` flags it) — `commitRename`, no `onUpdate`. A
    // rejected settlement reverts and surfaces the error here.
    submit({ op: 'rename', path, newKey, onCommit }).then((outcome) => {
      if (outcome?.status === 'error') onError(outcome.error, newKey as ValueData)
    })
  }

  // Common DERIVED VALUES (this makes the JSX logic less messy). `isEditing` /
  // `isEditingKey` are the per-node selector subscriptions computed above.
  const isArray = typeof path.slice(-1)[0] === 'number'
  // A rename is a delete of the old key + an add of the new one to the PARENT
  // collection, so it's gated as exactly that: this node is deletable, and the
  // parent accepts a new property (`canAddHere` = the parent's `allowAdd`,
  // threaded down). `allowEdit` plays no part — a value-locked key still
  // renames. Never the root, never an array index.
  const canEditKey = parentData !== null && !isArray && canDelete && canAddHere

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
