/**
 * The drag-and-drop engine: everything that makes a node a drag source and a
 * drop target. `allowDrag` is off by default, so this module is loaded on
 * demand — `DragSourceProvider` pulls it in with a dynamic `import()` the
 * first time an editor mounts with drag enabled — and the bundler emits it as
 * its own chunk next to the entry. Consumers who never enable drag never
 * download it (issue #327).
 *
 * Two rules keep the split intact:
 *   - Nothing on the editor path may import a *value* from this module
 *     statically; a static edge folds the chunk back into the entry. Type-only
 *     imports are fine (erased at build). `scripts/verify-treeshake.mjs`
 *     guards this.
 *   - This module exports a plain function, not a hook. `useDragNDrop` owns
 *     the per-node React state and calls `buildDragNDrop` on every render, so
 *     the engine can arrive after a node has mounted without changing that
 *     node's hook order.
 *
 * Registers itself with `DragSourceProvider` as it evaluates, so any editor
 * that mounts afterwards starts with the engine in hand.
 */

import type React from 'react'
import { type useTheme, type useEditingStore } from '../contexts'
import { registerDragAndDropEngine, type DragSource } from './DragSourceProvider'
import { isDescendantOf, pathsEqual } from '../utils/pathTools'
import {
  type NodeData,
  type CollectionKey,
  type CollectionData,
  type JerError,
  type Position,
} from '../types'
import { type TranslateFunction } from '../localisation'

export interface DragNDropProps {
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

// The node-side props plus the React state and store handles `useDragNDrop`
// holds on the engine's behalf.
export interface DragNDropContext extends DragNDropProps {
  dragSource: DragSource
  setDragSource: (newState: DragSource) => void
  armed: { current: boolean }
  editingStore: Pick<ReturnType<typeof useEditingStore>, 'getSnapshot' | 'submit'>
  getStyles: ReturnType<typeof useTheme>['getStyles']
  // Which half of this node the in-flight drag is hovering (drop-zone
  // highlight), or `false`.
  isDragTarget: Position | false
  setIsDragTarget: (position: Position | false) => void
}

export interface DragNDropResult {
  // Spread onto the node's root element to make it a drag source.
  dragSourceProps: React.DOMAttributes<HTMLDivElement>
  // Spread onto the node's root element to make its top half a drop target.
  dropTargetProps: React.DOMAttributes<HTMLDivElement>
  // Overlay covering the bottom half of the node while a drag that may land
  // here is in flight — the "drop below" target. `null` otherwise.
  bottomDropTarget: React.ReactNode
  // The drop-zone highlight shown above/below the node while it's the hovered
  // target. `null` otherwise.
  dropPaddingAbove: React.ReactNode
  dropPaddingBelow: React.ReactNode
}

const NO_PROPS: React.DOMAttributes<HTMLDivElement> = {}

export const buildDragNDrop = ({
  canDrag,
  canDelete,
  canDragOnto,
  canAddHere,
  path,
  nodeData,
  onError,
  translate,
  dragSource,
  setDragSource,
  armed,
  editingStore,
  getStyles,
  isDragTarget,
  setIsDragTarget,
}: DragNDropContext): DragNDropResult => {
  // Whether the in-flight drag may legally land on THIS node. A drop inserts
  // the dragged item as a sibling of this node, into this node's parent
  // collection, so:
  //   - same collection (source's parent === this node's parent) → REORDER,
  //     allowed when the parent is editable (`canDragOnto`);
  //   - different collection → RELOCATE, allowed when the source is deletable
  //     (`dragSource.canDelete`) AND this collection accepts adds
  //     (`canAddHere`).
  // A drop onto the source itself or a descendant is never allowed. The drag
  // highlight and `handleDrop` share this predicate, so a highlighted target
  // always accepts the drop.
  const dropAllowed = (): boolean => {
    if (dragSource.path === null || isDescendantOf(path, dragSource.path)) return false
    const sameCollection = pathsEqual(dragSource.path.slice(0, -1), path.slice(0, -1))
    return sameCollection ? canDragOnto : dragSource.canDelete && canAddHere
  }

  const handleDrop = (position: Position) => {
    if (dragSource.path === null) return
    // The same predicate the highlight uses, re-checked here because the drop
    // fires independently of the drag-over highlight. It enforces the
    // reorder/relocate permission rules AND the self/descendant guard — without
    // the latter the `move` op would delete the source then re-create it under
    // itself (`createNew`), nesting the collection in a copy of itself.
    // (Firefox fires such a drop; Chrome and Safari suppress it, but this
    // covers all.)
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

  // Props added to items being dragged
  const dragSourceProps: React.DOMAttributes<HTMLDivElement> = !canDrag
    ? NO_PROPS
    : {
        // Arm a drag only on a genuine grab: a primary-button mousedown made
        // while nothing is being edited. Firefox fires a phantom `dragstart`
        // on a node that became `draggable` when an editor closed (e.g. a
        // type-change to object/array/null) — that has no real grab behind
        // it, so it stays disarmed and `onDragStart` rejects it. The editing
        // `<select>`'s own mousedown fires while editing, so it never arms
        // either.
        onMouseDown: (e: React.MouseEvent) => {
          if (e.button === 0 && editingStore.getSnapshot().active === null) armed.current = true
        },
        // A click with no drag: disarm, so a later phantom dragstart can't
        // reuse it. (A real drag fires `dragstart` before any mouseup, so this
        // never races a legitimate grab.)
        onMouseUp: () => {
          armed.current = false
        },
        onDragStart: (e: React.DragEvent) => {
          // Reject an unarmed drag (the Firefox phantom) and any drag while a
          // node is being edited. Reading the store imperatively (not a
          // render-time flag) keeps edit transitions from re-rendering every
          // draggable node in the tree.
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

  // Props for the items being dropped onto. Never a drop target if neither a
  // reorder nor a relocate could ever land here; whether a given in-flight
  // drag actually may is decided live by `dropAllowed()` in the handlers.
  const getDropTargetProps = (position: Position): React.DOMAttributes<HTMLDivElement> =>
    !canDragOnto && !canAddHere
      ? NO_PROPS
      : {
          onDragOver: (e: React.DragEvent) => {
            e.stopPropagation()
            // `preventDefault` is what marks an element droppable (sets the
            // drop cursor and lets `drop` fire). Gate it on the same predicate
            // as the highlight, so an illegal target shows the "no-drop"
            // cursor and doesn't fire a drop that `handleDrop` would only
            // no-op.
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
            // Highlight only a target this drag may legally land on (also
            // blocks self/descendant — see `dropAllowed`).
            if (dropAllowed()) setIsDragTarget(position)
          },
          onDragExit: (e: React.DragEvent) => {
            e.stopPropagation()
            setIsDragTarget(false)
          },
        }

  // A dummy element to allow us to detect when dragging onto the *bottom*
  // half of an element -- takes up exactly 50% its container height and is
  // locked to the bottom.
  const bottomDropTarget =
    dragSource.path !== null && dropAllowed() ? (
      <div
        className="jer-drop-target-bottom"
        style={{
          height: '50%',
          position: 'absolute',
          width: '100%',
          top: '50%',
          zIndex: path.length,
        }}
        {...getDropTargetProps('below')}
      ></div>
    ) : null

  // "Padding" element displayed either above or below a node to indicate
  // current drop target position
  const dropPadding = (position: Position) =>
    isDragTarget === position ? (
      <div className="jer-drag-n-drop-padding" style={getStyles('dropZone', nodeData)} />
    ) : null

  return {
    dragSourceProps,
    dropTargetProps: getDropTargetProps('above'),
    bottomDropTarget,
    dropPaddingAbove: dropPadding('above'),
    dropPaddingBelow: dropPadding('below'),
  }
}

registerDragAndDropEngine(buildDragNDrop)
