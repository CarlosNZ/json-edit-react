import { useState } from 'react'
import { useTheme, useEditingStore } from '../contexts'
import { useDragSource } from './DragSourceProvider'
import { type Position } from '../types'
// Type-only: a value import here would fold the lazily-loaded engine back
// into the entry chunk (see src/hooks/dragAndDrop.tsx).
import type { DragNDropProps, DragNDropResult } from './dragAndDrop'

// What a node gets while drag is off, or before the engine has arrived: no
// handlers and no drop-zone elements. A single shared instance, so the spreads
// stay referentially stable across renders.
const NO_PROPS = {}
const INERT: DragNDropResult = {
  dragSourceProps: NO_PROPS,
  dropTargetProps: NO_PROPS,
  bottomDropTarget: null,
  dropPaddingAbove: null,
  dropPaddingBelow: null,
}

// Per-node drag-and-drop wiring. Holds the node's own React state and hands it
// to the engine (`buildDragNDrop`), which `DragSourceProvider` loads on demand
// when `allowDrag` is set. The same hooks run on every render whether or not
// the engine is present, so it can arrive mid-life without disturbing the
// hook order.
export const useDragNDrop = (props: DragNDropProps): DragNDropResult => {
  const { engine, dragSource, setDragSource, armed } = useDragSource()
  const { getStyles } = useTheme()
  const editingStore = useEditingStore()
  // Which half of THIS node the in-flight drag is hovering, for the drop-zone
  // highlight. Per-node, so only the hovered node re-renders on enter/exit.
  const [isDragTarget, setIsDragTarget] = useState<Position | false>(false)

  if (!engine) return INERT
  return engine({
    ...props,
    dragSource,
    setDragSource,
    armed,
    editingStore,
    getStyles,
    isDragTarget,
    setIsDragTarget,
  })
}
