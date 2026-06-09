import React, { useMemo, useState } from 'react'
import { useTheme, useEditingStore } from '../contexts'
import { useDragSource } from './DragSourceProvider'
import { isDescendantOf, pathsEqual } from '../utils/pathTools'
import {
  type NodeData,
  type CollectionKey,
  type CollectionData,
  type JerError,
  type Position,
} from '../types'
import { type TranslateFunction } from '../localisation'

interface DnDProps {
  canDrag: boolean
  canDragOnto: boolean
  path: CollectionKey[]
  nodeData: NodeData
  onError: (error: JerError, errorValue: CollectionData | string) => unknown
  translate: TranslateFunction
}

export const useDragNDrop = ({
  canDrag,
  canDragOnto,
  path,
  nodeData,
  onError,
  translate,
}: DnDProps) => {
  const { getStyles } = useTheme()
  const { dragSource, setDragSource, armed } = useDragSource()
  const editingStore = useEditingStore()
  const [isDragTarget, setIsDragTarget] = useState<Position | false>(false)

  // Props added to items being dragged
  const dragSourceProps = useMemo(() => {
    if (!canDrag) return {}
    return {
      // Arm a drag only on a genuine grab: a primary-button mousedown made
      // while nothing is being edited. Firefox fires a phantom `dragstart` on a
      // node that became `draggable` when an editor closed (e.g. a type-change
      // to object/array/null) — that has no real grab behind it, so it stays
      // disarmed and `onDragStart` rejects it. The editing `<select>`'s own
      // mousedown fires while editing, so it never arms either.
      onMouseDown: (e: React.MouseEvent) => {
        if (e.button === 0 && editingStore.getSnapshot().active === null) armed.current = true
      },
      // A click with no drag: disarm, so a later phantom dragstart can't reuse
      // it. (A real drag fires `dragstart` before any mouseup, so this never
      // races a legitimate grab.)
      onMouseUp: () => {
        armed.current = false
      },
      onDragStart: (e: React.DragEvent) => {
        // Reject an unarmed drag (the Firefox phantom) and — as before — any
        // drag while a node is being edited. Reading the store imperatively
        // (not a render-time flag) keeps edit transitions from re-rendering
        // every draggable node in the tree.
        if (!armed.current || editingStore.getSnapshot().active !== null) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        // Consume immediately — a drag source can unmount mid-drag (a structural
        // edit remounts it), so `dragend` may never fire to clear it.
        armed.current = false
        e.stopPropagation()
        setDragSource({ path })
      },
      onDragEnd: (e: React.DragEvent) => {
        armed.current = false
        e.stopPropagation()
        setDragSource({ path: null })
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDrag, path])

  // Props for the items being dropped onto
  const getDropTargetProps = useMemo(
    () => (position: Position) => {
      if (!canDragOnto) return {}
      return {
        onDragOver: (e: React.DragEvent) => {
          e.stopPropagation()
          e.preventDefault()
        },
        onDrop: (e: React.DragEvent) => {
          e.stopPropagation()
          handleDrop(position)
          setDragSource({ path: null })
          setIsDragTarget(false)
        },
        onDragEnter: (e: React.DragEvent) => {
          e.stopPropagation()
          // Block highlighting when dragging onto self or any descendant of the
          // drag source (reflexive descendant check)
          if (dragSource.path === null || !isDescendantOf(path, dragSource.path)) {
            setIsDragTarget(position)
          }
        },
        onDragExit: (e: React.DragEvent) => {
          e.stopPropagation()
          setIsDragTarget(false)
        },
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragSource, canDragOnto, path]
  )

  // A dummy component to allow us to detect when dragging onto the *bottom*
  // half of an element -- takes up exactly 50% its container height and is
  // locked to the bottom.
  const BottomDropTarget = useMemo(
    () =>
      canDragOnto && dragSource.path !== null ? (
        <div
          className="jer-drop-target-bottom"
          style={{
            height: '50%',
            position: 'absolute',
            width: '100%',
            top: '50%',
            zIndex: path.length,
            // border: '1px dotted green',
          }}
          {...getDropTargetProps('below')}
        ></div>
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragSource, canDragOnto, path.length]
  )

  // "Padding" element displayed either above or below a node to indicate
  // current drop target position
  const DropTargetPadding: React.FC<{ position: Position; nodeData: NodeData }> = ({
    position,
    nodeData,
  }) => {
    return isDragTarget === position ? (
      <div className="jer-drag-n-drop-padding" style={getStyles('dropZone', nodeData)} />
    ) : null
  }

  const handleDrop = (position: Position) => {
    if (dragSource.path === null) return
    // A node can't be moved inside itself: bail if the drop target is
    // the source or any descendant (reflexive, like `onDragEnter`). The
    // drop fires independently of the drag-over highlight, so this gate
    // is needed on the move too — otherwise the `move` op deletes the
    // source then re-creates it under itself (`createNew`), nesting the
    // collection in a copy of itself. (Firefox fires this drop; Chrome
    // and Safari suppress it, but the guard fixes it everywhere.)
    if (isDescendantOf(path, dragSource.path)) return
    const sourceKey = dragSource.path.slice(-1)[0]
    const sourceParent = dragSource.path.slice(0, -1)
    const thisParent = path.slice(0, -1)
    const { parentData } = nodeData
    if (
      typeof sourceKey === 'string' &&
      parentData &&
      !Array.isArray(parentData) &&
      Object.keys(parentData).includes(sourceKey) &&
      sourceKey in parentData &&
      !pathsEqual(sourceParent, thisParent)
    ) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, sourceKey)
    } else {
      // Move is an instant op: the engine fires `move` (with the SOURCE node)
      // and settles. A rejected move reverts and reports via the `updateError`
      // event (which carries the correct SOURCE identity) — NOT a node-local
      // `onError` here, since this handler runs on the DESTINATION node, so its
      // error would show on the wrong place once the node reverts to its origin.
      editingStore.submit({
        op: 'move',
        path: dragSource.path,
        to: { path, position },
        instant: true,
      })
    }
  }

  return {
    dragSourceProps,
    getDropTargetProps,
    BottomDropTarget,
    DropTargetPadding,
    handleDrop,
  }
}
