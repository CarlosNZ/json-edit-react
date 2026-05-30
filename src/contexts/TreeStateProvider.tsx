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
import { EditingProvider } from './EditingProvider'
import { CollapseProvider } from './CollapseProvider'
import { DragSourceProvider } from '../hooks/DragSourceProvider'
import { type OnEditEventFunction, type OnCollapseFunction } from '../types'

interface TreeStateProps {
  children: React.ReactNode
  onEditEvent?: OnEditEventFunction
  onCollapse?: OnCollapseFunction
}

export const TreeStateProvider = ({ children, onEditEvent, onCollapse }: TreeStateProps) => (
  <EditingProvider onEditEvent={onEditEvent}>
    <CollapseProvider onCollapse={onCollapse}>
      <DragSourceProvider>{children}</DragSourceProvider>
    </CollapseProvider>
  </EditingProvider>
)
