import React, { useMemo, useState } from 'react'
import { useTreeState } from './TreeStateProvider'
import { useTheme } from './theme'
import { toPathString } from './ValueNodes'
import { type NodeData, type CollectionKey } from './types'

type Position = 'above' | 'below'

interface DnDProps {
  canDragOnto: boolean
  path: CollectionKey[]
  handleDrop: (position: 'above' | 'below') => void
}

export const useDragNDrop = ({ canDragOnto, path, handleDrop }: DnDProps) => {
  const { getStyles } = useTheme()
  const { dragSource, setDragSource } = useTreeState()
  const [isDragTarget, setIsDragTarget] = useState<Position | false>(false)

  const pathString = toPathString(path)

  // Props added to items being dragged
  const dragSourceProps = useMemo(
    () => ({
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation()
        setDragSource({ path, pathString })
      },
      onDragEnd: (e: React.DragEvent) => {
        e.stopPropagation()
        setDragSource({ path: null, pathString: null })
      },
    }),
    []
  )

  // Props for the items being dropped onto
  const getDropTargetProps = useMemo(
    () => (position: Position) => ({
      onDragOver: (e: React.DragEvent) => {
        e.stopPropagation()
        e.preventDefault()
      },
      onDrop: (e: React.DragEvent) => {
        e.stopPropagation()
        if (!canDragOnto) return
        handleDrop(position)
        setDragSource({ path: null, pathString: null })
        setIsDragTarget(false)
      },
      onDragEnter: (e: React.DragEvent) => {
        e.stopPropagation()
        if (!canDragOnto) return
        if (!pathString.startsWith(dragSource.pathString ?? '')) {
          setIsDragTarget(position)
        }
      },
      onDragExit: (e: React.DragEvent) => {
        e.stopPropagation()
        if (!canDragOnto) return
        setIsDragTarget(false)
      },
    }),
    [dragSource]
  )

  // A dummy component to allow us to detect when dragging onto the *bottom*
  // half of an element -- takes up exactly 50% its container height and is
  // locked to the bottom.
  const BottomDropTarget = useMemo(
    () => (
      <div
        style={{
          height: '50%',
          position: 'absolute',
          width: '100%',
          top: '50%',
          zIndex: path.length,
        }}
        {...getDropTargetProps('below')}
      ></div>
    ),
    [dragSource]
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

  return {
    dragSource,
    dragSourceProps,
    getDropTargetProps,
    BottomDropTarget,
    DropTargetPadding,
  }
}
