import React, { useMemo, useState } from 'react'
import { useTreeState } from './TreeStateProvider'
import { toPathString } from './ValueNodes'
import { type CollectionKey } from './types'

type Position = 'above' | 'below'

interface DragNDropProps {
  canDragOnto: boolean
  path: CollectionKey[]
  handleDrop: (position: 'above' | 'below') => void
}

export const useDragNDrop = ({ canDragOnto, path, handleDrop }: DragNDropProps) => {
  const {
    dragState: { dragPathString, dragPath },
    setDragState,
  } = useTreeState()
  const [isDragTarget, setIsDragTarget] = useState<Position | false>(false)

  const pathString = toPathString(path)

  const draggableProps = useMemo(
    () => ({
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation()
        setDragState({ dragPath: path, dragPathString: pathString })
      },
      onDragEnd: (e: React.DragEvent) => {
        e.stopPropagation()
        setDragState({ dragPath: null, dragPathString: null })
      },
    }),
    []
  )

  const getDragTargetProps = useMemo(
    () => (position: Position) => ({
      onDragOver: (e: React.DragEvent) => {
        e.stopPropagation()
        e.preventDefault()
      },
      onDrop: (e: React.DragEvent) => {
        e.stopPropagation()
        if (!canDragOnto) return
        handleDrop(position)
        setDragState({ dragPath: null, dragPathString: null })
        setIsDragTarget(false)
      },
      onDragEnter: (e: React.DragEvent) => {
        e.stopPropagation()
        if (!canDragOnto) return
        if (!pathString.startsWith(dragPathString ?? '')) {
          setIsDragTarget(position)
        }
      },
      onDragExit: (e: React.DragEvent) => {
        e.stopPropagation()
        if (!canDragOnto) return
        setIsDragTarget(false)
      },
    }),
    [dragPathString]
  )

  const dragTargetTopProps = getDragTargetProps('above')

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
        {...getDragTargetProps('below')}
      ></div>
    ),
    [dragPathString]
  )

  const DragTarget: React.FC<{ position: Position }> = ({ position }) => {
    return isDragTarget === position ? <div className="jer-drag-n-drop-padding" /> : null
  }

  return {
    dragPath,
    // isDragTarget,
    getDragTargetProps,
    draggableProps,
    dragTargetTopProps,
    BottomDropTarget,
    DragTarget,
  }
}
