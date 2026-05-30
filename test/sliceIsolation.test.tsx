/**
 * Slice-isolation tests for the Tree-state providers.
 *
 * Each provider (Editing, Collapse, DragSource) holds one logical slice of
 * shared tree state. Asserts that an update to one slice does NOT re-render
 * components subscribing to a different slice — i.e., that `useContext` is
 * scoped per-provider and the three contexts are genuinely independent.
 */

import { act, render } from '@testing-library/react'
import { TreeStateProvider, useEditing, useCollapse } from '../src/contexts'
import { useDragSource } from '../src/hooks/DragSourceProvider'
import { type CollectionKey, type CollapseState } from '../src/types'

type DragSourceValue = { path: CollectionKey[] | null }

// Mutable refs the tests poke at to drive each slice. Re-assigned every Harness
// render — the setters from EditingProvider/CollapseProvider aren't yet stable
// across renders (Part 5 fixes that), so always re-read before calling.
const setters: {
  setDrag: ((s: DragSourceValue) => void) | null
  setEdit:
    | ((path: CollectionKey[] | null, cancelOpOrKey?: (() => void) | 'key') => void)
    | null
  setCollapse: ((s: CollapseState | CollapseState[] | null) => void) | null
} = { setDrag: null, setEdit: null, setCollapse: null }

const Harness = () => {
  setters.setDrag = useDragSource().setDragSource
  setters.setEdit = useEditing().setCurrentlyEditingElement
  setters.setCollapse = useCollapse().setCollapseState
  return null
}

const renderCounts = { editing: 0, collapse: 0, drag: 0 }

const EditingOnlyConsumer = () => {
  renderCounts.editing++
  useEditing()
  return null
}

const CollapseOnlyConsumer = () => {
  renderCounts.collapse++
  useCollapse()
  return null
}

const DragOnlyConsumer = () => {
  renderCounts.drag++
  useDragSource()
  return null
}

const renderTree = () =>
  render(
    <TreeStateProvider>
      <Harness />
      <EditingOnlyConsumer />
      <CollapseOnlyConsumer />
      <DragOnlyConsumer />
    </TreeStateProvider>
  )

beforeEach(() => {
  renderCounts.editing = 0
  renderCounts.collapse = 0
  renderCounts.drag = 0
  setters.setDrag = null
  setters.setEdit = null
  setters.setCollapse = null
  // Fake timers needed because CollapseProvider currently schedules a 2-second
  // state-reset setTimeout. Part 4 removes the timer; this `useFakeTimers`
  // call can come out then.
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('Tree-state providers — slice isolation', () => {
  test('setDragSource only re-renders drag-source consumers', () => {
    renderTree()
    const before = { ...renderCounts }

    act(() => {
      setters.setDrag!({ path: ['foo'] })
    })

    expect(renderCounts.drag).toBeGreaterThan(before.drag)
    expect(renderCounts.editing).toBe(before.editing)
    expect(renderCounts.collapse).toBe(before.collapse)
  })

  test('setCollapseState only re-renders collapse consumers', () => {
    renderTree()
    const before = { ...renderCounts }

    act(() => {
      setters.setCollapse!({ collapsed: true, path: [], includeChildren: true })
    })

    expect(renderCounts.collapse).toBeGreaterThan(before.collapse)
    expect(renderCounts.editing).toBe(before.editing)
    expect(renderCounts.drag).toBe(before.drag)

    // Flush the 2-second auto-reset so it doesn't leak past the test boundary.
    // Drains here, not in afterEach, so the assertion above is unaffected.
    act(() => {
      jest.advanceTimersByTime(2100)
    })
  })

  test('setCurrentlyEditingElement only re-renders editing consumers', () => {
    renderTree()
    const before = { ...renderCounts }

    act(() => {
      setters.setEdit!(['some', 'path'])
    })

    expect(renderCounts.editing).toBeGreaterThan(before.editing)
    expect(renderCounts.collapse).toBe(before.collapse)
    expect(renderCounts.drag).toBe(before.drag)
  })
})
