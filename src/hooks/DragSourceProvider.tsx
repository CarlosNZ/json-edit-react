/**
 * Drag-source state for the tree. Holds the path of the node currently being
 * dragged so that the target a drop lands on knows what's coming.
 *
 * Lives in `hooks/` (alongside `useDragNDrop`) rather than `contexts/` because
 * drag is the only consumer.
 */

import React, { createContext, useContext, useState } from 'react'
import { type CollectionKey } from '../types'

export interface DragSource {
  path: CollectionKey[] | null
}

interface DragSourceContext {
  dragSource: DragSource
  setDragSource: (newState: DragSource) => void
}

const DragSourceProviderContext = createContext<DragSourceContext | null>(null)

interface DragSourceProps {
  children: React.ReactNode
}

export const DragSourceProvider = ({ children }: DragSourceProps) => {
  const [dragSource, setDragSource] = useState<DragSource>({ path: null })
  return (
    <DragSourceProviderContext.Provider value={{ dragSource, setDragSource }}>
      {children}
    </DragSourceProviderContext.Provider>
  )
}

export const useDragSource = () => {
  const context = useContext(DragSourceProviderContext)
  if (!context) throw new Error('Missing DragSource Context Provider')
  return context
}
