/**
 * Drag-source state for the tree. Holds the path of the node currently being
 * dragged so that the target a drop lands on knows what's coming.
 *
 * Lives in `hooks/` (alongside `useDragNDrop`) rather than `contexts/` because
 * drag is the only consumer.
 */

import React, { createContext, useContext, useMemo, useRef, useState } from 'react'
import { type CollectionKey } from '../types'

interface DragSource {
  path: CollectionKey[] | null
}

interface DragSourceContext {
  dragSource: DragSource
  setDragSource: (newState: DragSource) => void
  // Whether a drag may start: armed by a genuine pointer grab (a primary-button
  // mousedown made while nothing is being edited), consumed on dragstart,
  // cleared on mouseup/dragend. A ref, not state — it flips on every pointer
  // interaction and must never re-render. Guards against the phantom drag
  // Firefox fires when a node becomes `draggable` as an editor closes.
  armed: { current: boolean }
}

const DragSourceProviderContext = createContext<DragSourceContext | null>(null)

interface DragSourceProps {
  children: React.ReactNode
}

export const DragSourceProvider = ({ children }: DragSourceProps) => {
  const [dragSource, setDragSource] = useState<DragSource>({ path: null })
  const armed = useRef(false)
  // `setDragSource` is React's setState ref (stable for the provider's
  // lifetime), and `armed` is a stable ref. The value object's identity flips
  // only when `dragSource` itself changes — i.e. drag start/end.
  const value = useMemo(() => ({ dragSource, setDragSource, armed }), [dragSource])
  return (
    <DragSourceProviderContext.Provider value={value}>
      {children}
    </DragSourceProviderContext.Provider>
  )
}

export const useDragSource = () => {
  const context = useContext(DragSourceProviderContext)
  if (!context) throw new Error('Missing DragSource Context Provider')
  return context
}
