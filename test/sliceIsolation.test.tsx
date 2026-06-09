/**
 * Slice-isolation tests for the Tree-state providers.
 *
 * Each provider (Editing, Collapse, DragSource) holds one logical slice of
 * shared tree state. Asserts that an update to one slice does NOT re-render
 * components subscribing to a different slice — i.e., that `useContext` is
 * scoped per-provider and the three contexts are genuinely independent.
 */

import { useState } from 'react'
import { act, render } from '@testing-library/react'
import { TreeStateProvider, useEditing, useCollapse } from '../src/contexts'
import { useDragSource } from '../src/hooks/DragSourceProvider'
import {
  type CollectionKey,
  type CollapseState,
  type BuildNodeDataFromPathRef,
} from '../src/types'

// Slice-isolation tests don't fire observer events, so the NodeData accessor is
// never invoked — a stub ref satisfies the provider prop.
const stubBuildNodeDataFromPathRef: BuildNodeDataFromPathRef = { current: undefined }
// Likewise the commit primitives — never invoked by these slice-isolation
// tests.
const stubCommitRef = { current: undefined }

type DragSourceValue = { path: CollectionKey[] | null }

// Mutable refs the tests poke at to drive each slice. All three setters are
// useCallback-stable in their respective providers — re-assigning per-render
// is purely defensive against that ever changing.
const setters: {
  setDrag: ((s: DragSourceValue) => void) | null
  open: ((path: CollectionKey[]) => void) | null
  setCollapse: ((s: CollapseState | CollapseState[] | null) => void) | null
} = { setDrag: null, open: null, setCollapse: null }

const Harness = () => {
  setters.setDrag = useDragSource().setDragSource
  setters.open = useEditing().open
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
    <TreeStateProvider
      buildNodeDataFromPathRef={stubBuildNodeDataFromPathRef}
      commitRef={stubCommitRef}
    >
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
  setters.open = null
  setters.setCollapse = null
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

    const command: CollapseState = { collapsed: true, path: [], includeChildren: true }
    act(() => {
      setters.setCollapse!(command)
    })

    expect(renderCounts.collapse).toBeGreaterThan(before.collapse)
    expect(renderCounts.editing).toBe(before.editing)
    expect(renderCounts.drag).toBe(before.drag)
  })

  test('startEdit only re-renders editing consumers', () => {
    renderTree()
    const before = { ...renderCounts }

    act(() => {
      setters.open!(['some', 'path'])
    })

    expect(renderCounts.editing).toBeGreaterThan(before.editing)
    expect(renderCounts.collapse).toBe(before.collapse)
    expect(renderCounts.drag).toBe(before.drag)
  })

  test('context value identity is stable across unrelated re-renders (memoized providers)', () => {
    // The three provider value objects are wrapped in `useMemo` over their
    // real inputs. When a parent above the provider re-renders for an
    // unrelated reason, each provider re-runs but its `useMemo` returns the
    // same instance — consumers see byte-for-byte the same context value,
    // which is what lets a downstream `React.memo` wrapper bail out cleanly.
    const seen = { editing: [] as object[], collapse: [] as object[], drag: [] as object[] }

    const Observer = () => {
      seen.editing.push(useEditing())
      seen.collapse.push(useCollapse())
      seen.drag.push(useDragSource())
      return null
    }

    let bumpOuterCounter: () => void = () => {}
    const Outer = () => {
      const [, setCounter] = useState(0)
      bumpOuterCounter = () => setCounter((n) => n + 1)
      return (
        <TreeStateProvider
        buildNodeDataFromPathRef={stubBuildNodeDataFromPathRef}
        commitRef={stubCommitRef}
      >
          <Observer />
        </TreeStateProvider>
      )
    }

    render(<Outer />)
    expect(seen.editing).toHaveLength(1)

    act(() => bumpOuterCounter())
    expect(seen.editing).toHaveLength(2)

    // Identity-stable across the unrelated re-render.
    expect(seen.editing[0]).toBe(seen.editing[1])
    expect(seen.collapse[0]).toBe(seen.collapse[1])
    expect(seen.drag[0]).toBe(seen.drag[1])
  })
})
