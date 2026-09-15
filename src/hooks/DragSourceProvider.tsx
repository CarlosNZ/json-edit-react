/**
 * Drag-source state for the tree. Holds the path of the node currently being
 * dragged so that the target a drop lands on knows what's coming, and loads
 * the drag-and-drop engine on demand.
 *
 * Lives in `hooks/` (alongside `useDragNDrop`) rather than `contexts/` because
 * drag is the only consumer.
 */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { type CollectionKey } from '../types'

export interface DragSource {
  path: CollectionKey[] | null
  // The source node's delete-permission, stashed at pickup so any drop target
  // can decide a relocate (move OUT of the source collection) without
  // re-deriving the source's `NodeData`. Irrelevant to a same-collection
  // reorder. `false` while idle.
  canDelete: boolean
}

// The engine's entry point, typed against the lazy module itself so the two
// can't drift. Type-only (`typeof import(...)` is erased), so this file has no
// static edge to the chunk.
type DragNDropEngine = typeof import('./dragAndDrop').buildDragNDrop

interface DragSourceContext {
  dragSource: DragSource
  setDragSource: (newState: DragSource) => void
  // Whether a drag may start: armed by a genuine pointer grab (a primary-button
  // mousedown made while nothing is being edited), consumed on dragstart,
  // cleared on mouseup/dragend. A ref, not state — it flips on every pointer
  // interaction and must never re-render. Guards against the phantom drag
  // Firefox fires when a node becomes `draggable` as an editor closes.
  armed: { current: boolean }
  // The drag-and-drop engine, or `null` until `allowDrag` is set and the chunk
  // has arrived. Nodes render inert (no handlers, no drop zones) without it.
  engine: DragNDropEngine | null
}

const DragSourceProviderContext = createContext<DragSourceContext | null>(null)

// The engine module calls this as it evaluates. Module-level, so once any
// editor on the page has loaded the chunk, every provider mounting afterwards
// (or toggling `allowDrag` on) starts with the engine in hand.
let loadedEngine: DragNDropEngine | null = null
export const registerDragAndDropEngine = (engine: DragNDropEngine) => {
  loadedEngine = engine
}

interface DragSourceProps {
  children: React.ReactNode
  allowDrag?: boolean
}

export const DragSourceProvider = ({ children, allowDrag = false }: DragSourceProps) => {
  const [dragSource, setDragSource] = useState<DragSource>({ path: null, canDelete: false })
  const armed = useRef(false)
  const [engine, setEngine] = useState<DragNDropEngine | null>(() =>
    allowDrag ? loadedEngine : null
  )

  // Load the engine the first time drag is enabled. Evaluating the module
  // registers it (above); the updater form of the setter is required because
  // the engine is itself a function. Once loaded it stays: an editor that
  // turns `allowDrag` off again simply renders its nodes with `canDrag` false.
  useEffect(() => {
    if (!allowDrag || engine !== null) return
    let cancelled = false
    import('./dragAndDrop').then(() => {
      if (!cancelled) setEngine(() => loadedEngine)
    })
    return () => {
      cancelled = true
    }
  }, [allowDrag, engine])

  // `setDragSource` is React's setState ref (stable for the provider's
  // lifetime), and `armed` is a stable ref. The value object's identity flips
  // only when `dragSource` itself changes — i.e. drag start/end — plus once
  // when the engine arrives.
  const value = useMemo(() => ({ dragSource, setDragSource, armed, engine }), [dragSource, engine])
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
