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
  // This node's own delete-permission — stashed on `dragSource` at pickup so a
  // relocate (move OUT of its collection) can be gated at the drop.
  canDelete: boolean
  // The parent collection's permissions, used when THIS node is a drop target:
  // `canDragOnto` = parent editable → a same-collection reorder may land here;
  // `canAddHere` = parent accepts adds → a cross-collection relocate may.
  canDragOnto: boolean
  canAddHere: boolean
  path: CollectionKey[]
  nodeData: NodeData
  onError: (error: JerError, errorValue: CollectionData | string) => unknown
  translate: TranslateFunction
}

export const useDragNDrop = ({
  canDrag,
  canDelete,
  canDragOnto,
  canAddHere,
  path,
  nodeData,
  onError,
  translate,
}: DnDProps) => {
  const { getStyles } = useTheme()
  const { dragSource, setDragSource, armed } = useDragSource()
  const editingStore = useEditingStore()
  const [isDragTarget, setIsDragTarget] = useState<Position | false>(false)

  // Whether the in-flight drag may legally land on THIS node. A drop inserts
  // the dragged item as a sibling of this node, into this node's parent
  // collection, so:
  //   - same collection (source's parent === this node's parent) → REORDER,
  //     allowed when the parent is editable (`canDragOnto`);
  //   - different collection → RELOCATE, allowed when the source is deletable
  //     (`dragSource.canDelete`) AND this collection accepts adds (`canAddHere`).
  // A drop onto the source itself or a descendant is never allowed. The drag
  // highlight and `handleDrop` share this predicate, so a highlighted target
  // always accepts the drop.
  const dropAllowed = (): boolean => {
    if (dragSource.path === null || isDescendantOf(path, dragSource.path)) return false
    const sameCollection = pathsEqual(dragSource.path.slice(0, -1), path.slice(0, -1))
    return sameCollection ? canDragOnto : dragSource.canDelete && canAddHere
  }

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
        // Consume immediately — a drag source can unmount mid-drag (a
        // structural edit remounts it), so `dragend` may never fire to clear
        // it.
        armed.current = false
        e.stopPropagation()
        setDragSource({ path, canDelete })
      },
      onDragEnd: (e: React.DragEvent) => {
        armed.current = false
        e.stopPropagation()
        setDragSource({ path: null, canDelete: false })
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDrag, canDelete, path])

  // Props for the items being dropped onto
  const getDropTargetProps = useMemo(
    () => (position: Position) => {
      // Never a drop target if neither a reorder nor a relocate could ever land
      // here. Whether a given in-flight drag actually may is decided live by
      // `dropAllowed()` in the handlers below.
      if (!canDragOnto && !canAddHere) return {}
      return {
        onDragOver: (e: React.DragEvent) => {
          e.stopPropagation()
          // `preventDefault` is what marks an element droppable (sets the drop
          // cursor and lets `drop` fire). Gate it on the same predicate as the
          // highlight, so an illegal target shows the "no-drop" cursor and
          // doesn't fire a drop that `handleDrop` would only no-op.
          if (dropAllowed()) e.preventDefault()
        },
        onDrop: (e: React.DragEvent) => {
          e.stopPropagation()
          handleDrop(position)
          setDragSource({ path: null, canDelete: false })
          setIsDragTarget(false)
        },
        onDragEnter: (e: React.DragEvent) => {
          e.stopPropagation()
          // Highlight only a target this drag may legally land on (also blocks
          // self/descendant — see `dropAllowed`).
          if (dropAllowed()) setIsDragTarget(position)
        },
        onDragExit: (e: React.DragEvent) => {
          e.stopPropagation()
          setIsDragTarget(false)
        },
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragSource, canDragOnto, canAddHere, path]
  )

  // A dummy component to allow us to detect when dragging onto the *bottom*
  // half of an element -- takes up exactly 50% its container height and is
  // locked to the bottom.
  const BottomDropTarget = useMemo(
    () =>
      dragSource.path !== null && dropAllowed() ? (
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
    [dragSource, canDragOnto, canAddHere, path.length]
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
    // The same predicate the highlight uses, re-checked here because the drop
    // fires independently of the drag-over highlight. It enforces the
    // reorder/relocate permission rules AND the self/descendant guard — without
    // the latter the `move` op would delete the source then re-create it under
    // itself (`createNew`), nesting the collection in a copy of itself. (Firefox
    // fires such a drop; Chrome and Safari suppress it, but this covers all.)
    if (!dropAllowed()) return
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
      // `onError` here, since this handler runs on the DESTINATION node, so
      // its error would show on the wrong place once the node reverts to its
      // origin.
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
