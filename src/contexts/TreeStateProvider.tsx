/**
 * Composing wrapper around three slice-specific providers:
 * - EditingProvider — currently-editing element, cancel ops, tab navigation,
 *   previous-value snapshot
 * - CollapseProvider — collapse state and broadcast
 * - DragSourceProvider — drag-and-drop source path
 *
 * These three slices were previously co-mingled in one omnibus context here.
 * They are now split, but this composing wrapper and the composing
 * `useTreeState` hook preserve the existing call-site API so consumers compile
 * unchanged. Part 2 of the §4 refactor narrows each consumer to import only
 * the slice it actually uses.
 */

import React from 'react'
import { EditingProvider, useEditing } from './EditingProvider'
import { CollapseProvider, useCollapse } from './CollapseProvider'
import { DragSourceProvider, useDragSource } from '../hooks/DragSourceProvider'
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

export const useTreeState = () => ({
  ...useEditing(),
  ...useCollapse(),
  ...useDragSource(),
})
