import React, { useMemo, useState } from 'react'
import { useTreeState } from './TreeStateProvider'
import { useTheme } from './theme'
import { toPathString } from './ValueNodes'
import {
  type NodeData,
  type CollectionKey,
  type CollectionData,
  type JerError,
  type Position,
  type InternalMoveFunction,
} from './types'
import { type TranslateFunction } from './localisation'

interface DnDProps {
  canDrag: boolean
  canDragOnto: boolean
  path: CollectionKey[]
  nodeData: NodeData
  onMove: InternalMoveFunction
  onError: (error: JerError, errorValue: CollectionData | string) => unknown
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
  const { dragSource, setDragSource } = useTreeState()
  const [isDragTarget, setIsDragTarget] = useState<Position | false>(false)

  const pathString = toPathString(path)

  // Props added to items being dragged
  const dragSourceProps = useMemo(() => {
    if (!canDrag) return {}
    return {
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation()
        setDragSource({ path, pathString })
      },
      onDragEnd: (e: React.DragEvent) => {
        e.stopPropagation()
        setDragSource({ path: null, pathString: null })
      },
    }
  }, [canDrag])

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
          setDragSource({ path: null, pathString: null })
          setIsDragTarget(false)
        },
        onDragEnter: (e: React.DragEvent) => {
          e.stopPropagation()
          if (!pathString.startsWith(dragSource.pathString ?? '')) {
            setIsDragTarget(position)
          }
        },
        onDragExit: (e: React.DragEvent) => {
          e.stopPropagation()
          setIsDragTarget(false)
        },
      }
    },
    [dragSource, canDragOnto]
  )

  // A dummy component to allow us to detect when dragging onto the *bottom*
  // half of an element -- takes up exactly 50% its container height and is
  // locked to the bottom.
  const BottomDropTarget = useMemo(
    () =>
      canDragOnto && dragSource.pathString !== null ? (
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
    [dragSource, canDragOnto]
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
    const sourceKey = dragSource.path?.slice(-1)[0]
    const sourceBase = dragSource.path?.slice(0, -1).join('.')
    const thisBase = path.slice(0, -1).join('')
    const { parentData } = nodeData
    if (
      typeof sourceKey === 'string' &&
      parentData &&
      !Array.isArray(parentData) &&
      Object.keys(parentData).includes(sourceKey) &&
      sourceKey in parentData &&
      sourceBase !== thisBase
    ) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, sourceKey)
    } else {
      onMove(dragSource.path, path, position).then((error) => {
        if (error)
          onError({ code: 'UPDATE_ERROR', message: error }, nodeData.value as CollectionData)
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
