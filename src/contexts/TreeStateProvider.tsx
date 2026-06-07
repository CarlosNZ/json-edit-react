/**
 * Composing wrapper around three slice-specific providers:
 * - EditingProvider — currently-editing element, cancel ops, tab navigation,
 *   previous-value snapshot
 * - CollapseProvider — collapse state and broadcast
 * - DragSourceProvider — drag-and-drop source path
 *
 * Consumers subscribe to whichever slice they need via `useEditing`,
 * `useCollapse`, or `useDragSource` — there is no merged-shape hook. This is
 * what makes slice isolation actually pay off: a change in one slice no longer
 * forces re-renders of components that only care about another.
 */

import React from 'react'
import { EditingProvider, type CommitPrimitives } from './EditingProvider'
import { CollapseProvider } from './CollapseProvider'
import { DragSourceProvider } from '../hooks/DragSourceProvider'
import {
  type OnEditEventFunction,
  type OnCollapseFunction,
  type BuildNodeDataFromPathRef,
} from '../types'

interface TreeStateProps {
  children: React.ReactNode
  onEditEvent?: OnEditEventFunction
  onCollapse?: OnCollapseFunction
  // Bridges live `NodeData` construction from the inner `Editor` (which owns the
  // data) into these provider contexts, which only know a node's path.
  buildNodeDataFromPathRef: BuildNodeDataFromPathRef
  // The commit primitives the inner `Editor` supplies to the EditingProvider.
  commitRef: React.RefObject<CommitPrimitives | undefined>
}

export const TreeStateProvider = ({
  children,
  onEditEvent,
  onCollapse,
  buildNodeDataFromPathRef,
  commitRef,
}: TreeStateProps) => (
  <EditingProvider
    onEditEvent={onEditEvent}
    buildNodeDataFromPathRef={buildNodeDataFromPathRef}
    commitRef={commitRef}
  >
    <CollapseProvider onCollapse={onCollapse} buildNodeDataFromPathRef={buildNodeDataFromPathRef}>
      <DragSourceProvider>{children}</DragSourceProvider>
    </CollapseProvider>
  </EditingProvider>
)
