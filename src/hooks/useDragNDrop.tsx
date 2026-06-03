import React, { useMemo, useState } from 'react'
import { useTheme, useEditingStore } from '../contexts'
import { useDragSource } from './DragSourceProvider'
import { isDescendantOf, pathsEqual } from '../utils/pathTools'
import {
  type NodeData,
  type CollectionKey,
  type CollectionData,
  type JsonEditorError,
  type Position,
  type InternalMoveFunction,
} from '../types'
import { type TranslateFunction } from '../localisation'

interface DnDProps {
  canDrag: boolean
  canDragOnto: boolean
  path: CollectionKey[]
  nodeData: NodeData
  onMove: InternalMoveFunction
  onError: (error: JsonEditorError, errorValue: CollectionData | string) => unknown
  translate: TranslateFunction
}

export const useDragNDrop = ({
  canDrag,
  canDragOnto,
  path,
  nodeData,
  onMove,
  onError,
  translate,
}: DnDProps) => {
  const { getStyles } = useTheme()
  const { dragSource, setDragSource } = useDragSource()
  const editingStore = useEditingStore()
  const [isDragTarget, setIsDragTarget] = useState<Position | false>(false)

  // Props added to items being dragged
  const dragSourceProps = useMemo(() => {
    if (!canDrag) return {}
    return {
      onDragStart: (e: React.DragEvent) => {
        // Don't allow dragging while any node is being edited. Checked here
        // (reading the store imperatively) rather than via a render-time
        // `canDrag` flag, so starting/ending an edit doesn't re-render every
        // draggable node in the tree.
        if (editingStore.getSnapshot().currentlyEditingElement !== null) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        e.stopPropagation()
        setDragSource({ path })
      },
      onDragEnd: (e: React.DragEvent) => {
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
      onMove(dragSource.path, path, position).then((result) => {
        if (result)
          onError({ code: 'UPDATE_ERROR', message: result }, nodeData.value as CollectionData)
        // `move` onEditEvent fires from the internal `onMove` handler (it owns
        // the SOURCE node's NodeData) — not here, where only the drop target is.
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
