/**
 * End-to-end tests for collapse broadcasts via `externalTriggers.collapse`.
 *
 * Pins the public-facing behavior of collapse commands. The current model is
 * state-based with a version counter: each broadcast bumps a version stored
 * in provider state, subscribers compare a `useRef`-tracked last-seen value
 * to apply on mount (cascading through the mount frontier). Commands persist
 * in provider state until the next broadcast — there's no stale-clear timer,
 * so late mounts inherit the most recent broadcast. Drives commands via the
 * public API (`externalTriggers`) rather than poking the provider directly.
 */

import { act, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { type CollapseState } from '../src/types'

const noop = () => {}

// `jer-rotate-90` on the chevron icon = collapsed. Established by the existing
// initial-state tests in JsonEditor.test.tsx (lines 159-180).
const isCollapsed = (chevron: Element | null) => chevron?.classList.contains('jer-rotate-90')

const collapseAll: CollapseState = { collapsed: true, path: [], includeChildren: true }
const expandAll: CollapseState = { collapsed: false, path: [], includeChildren: true }

describe('Collapse broadcasts via externalTriggers', () => {
  test('1. broadcast "Collapse All" collapses every visible CollectionNode', () => {
    const data = { a: { x: 1 }, b: { y: 2 } }
    const { container, rerender } = render(<JsonEditor data={data} setData={noop} />)
    // Pre-broadcast: all chevrons expanded.
    const chevronsBefore = container.querySelectorAll('.jer-collapse-icon')
    chevronsBefore.forEach((c) => expect(isCollapsed(c)).toBe(false))

    rerender(<JsonEditor data={data} setData={noop} externalTriggers={{ collapse: collapseAll }} />)

    const chevronsAfter = container.querySelectorAll('.jer-collapse-icon')
    expect(chevronsAfter.length).toBeGreaterThan(0)
    chevronsAfter.forEach((c) => expect(isCollapsed(c)).toBe(true))
  })

  test('2. broadcast "Expand All" expands every previously-collapsed subscriber', () => {
    const data = { a: { x: 1 }, b: { y: 2 } }
    const { container, rerender } = render(<JsonEditor data={data} setData={noop} />)
    rerender(<JsonEditor data={data} setData={noop} externalTriggers={{ collapse: collapseAll }} />)
    container
      .querySelectorAll('.jer-collapse-icon')
      .forEach((c) => expect(isCollapsed(c)).toBe(true))

    rerender(<JsonEditor data={data} setData={noop} externalTriggers={{ collapse: expandAll }} />)
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons.length).toBeGreaterThan(0)
    chevrons.forEach((c) => expect(isCollapsed(c)).toBe(false))
  })

  test('3. path-scoped command (no includeChildren) collapses only the targeted node', () => {
    const data = { outer: { inner: { leaf: 1 } } }
    const command: CollapseState = { collapsed: true, path: ['outer'], includeChildren: false }
    const { container, rerender } = render(<JsonEditor data={data} setData={noop} />)
    rerender(<JsonEditor data={data} setData={noop} externalTriggers={{ collapse: command }} />)

    // Three chevrons: root, outer, inner. Only `outer` should be collapsed.
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(3)
    expect(isCollapsed(chevrons[0])).toBe(false) // root
    expect(isCollapsed(chevrons[1])).toBe(true) // outer
    expect(isCollapsed(chevrons[2])).toBe(false) // inner (descendant — not targeted)
  })

  test('4. path-scoped command with includeChildren collapses the subtree', () => {
    const data = { outer: { inner: { leaf: 1 } }, sibling: { other: 2 } }
    const command: CollapseState = { collapsed: true, path: ['outer'], includeChildren: true }
    const { container, rerender } = render(<JsonEditor data={data} setData={noop} />)
    rerender(<JsonEditor data={data} setData={noop} externalTriggers={{ collapse: command }} />)

    // Four chevrons: root, outer, inner, sibling. (`leaf` and `other` are
    // primitive values — no collapse icon.)
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(4)
    expect(isCollapsed(chevrons[0])).toBe(false) // root — outside the subtree
    expect(isCollapsed(chevrons[1])).toBe(true) // outer — targeted root
    expect(isCollapsed(chevrons[2])).toBe(true) // inner — descendant of outer
    expect(isCollapsed(chevrons[3])).toBe(false) // sibling — outside the subtree
  })

  test('5. back-to-back identical commands both fire (version always bumps)', async () => {
    const user = userEvent.setup()
    const data = { outer: { x: 1 } }
    const { container, rerender } = render(<JsonEditor data={data} setData={noop} />)

    // First command: collapse `outer`.
    rerender(
      <JsonEditor
        data={data}
        setData={noop}
        externalTriggers={{ collapse: { collapsed: true, path: ['outer'], includeChildren: false } }}
      />
    )
    let chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(isCollapsed(chevrons[1])).toBe(true)

    // User manually re-expands `outer` by clicking its chevron.
    await user.click(chevrons[1])
    chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(isCollapsed(chevrons[1])).toBe(false)

    // Same command, fresh object reference (so `useTriggers` effect re-fires).
    rerender(
      <JsonEditor
        data={data}
        setData={noop}
        externalTriggers={{ collapse: { collapsed: true, path: ['outer'], includeChildren: false } }}
      />
    )
    chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(isCollapsed(chevrons[1])).toBe(true)
  })

  test('6. late mount inherits the most recent broadcast', () => {
    // Fire Collapse-All on a tree without `newChild`, then add `newChild`.
    // The new node should mount collapsed — it inherits the persistent
    // broadcast state. Same `triggers` reference across rerenders so
    // useTriggers does NOT re-broadcast; we're testing what the new mount
    // reads from provider state, not a re-broadcast.
    const dataBefore = { outer: { existing: 1 } }
    const dataAfter = { outer: { existing: 1, newChild: { nested: 'value' } } }
    const triggers = { collapse: collapseAll }

    const { container, rerender } = render(
      <JsonEditor data={dataBefore} setData={noop} externalTriggers={triggers} />
    )
    container
      .querySelectorAll('.jer-collapse-icon')
      .forEach((c) => expect(isCollapsed(c)).toBe(true))

    rerender(<JsonEditor data={dataAfter} setData={noop} externalTriggers={triggers} />)
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(3)
    expect(isCollapsed(chevrons[2])).toBe(true) // newChild inherits Collapse-All
  })

  test('7. data swap mount inherits the most recent broadcast', () => {
    // Fire Collapse-All, then swap to a different data shape so a new key
    // mounts. The newly-mounted CollectionNode inherits the broadcast still
    // held in provider state. (Root stays collapsed because it didn't
    // remount, just rendered new children.)
    const data1 = { a: { x: 1 } }
    const data2 = { b: { y: 2 } }
    const triggers = { collapse: collapseAll }

    const { container, rerender } = render(
      <JsonEditor data={data1} setData={noop} externalTriggers={triggers} />
    )
    container
      .querySelectorAll('.jer-collapse-icon')
      .forEach((c) => expect(isCollapsed(c)).toBe(true))

    rerender(<JsonEditor data={data2} setData={noop} externalTriggers={triggers} />)
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(2)
    expect(isCollapsed(chevrons[0])).toBe(true) // root — retained state
    expect(isCollapsed(chevrons[1])).toBe(true) // b — inherits Collapse-All
  })

  test('8. onCollapse fires once per broadcast command', () => {
    const data = { a: { x: 1 } }
    const onCollapse = jest.fn()
    const command: CollapseState = { collapsed: true, path: ['a'], includeChildren: false }
    const { rerender } = render(<JsonEditor data={data} setData={noop} onCollapse={onCollapse} />)
    rerender(
      <JsonEditor
        data={data}
        setData={noop}
        onCollapse={onCollapse}
        externalTriggers={{ collapse: command }}
      />
    )

    expect(onCollapse).toHaveBeenCalledTimes(1)
    expect(onCollapse).toHaveBeenCalledWith(command)
  })

  test('9. an array of commands applies each command independently', () => {
    const data = { a: { x: 1 }, b: { y: 2 } }
    const commands: CollapseState[] = [
      { collapsed: true, path: ['a'], includeChildren: false },
      { collapsed: true, path: ['b'], includeChildren: false },
    ]
    const { container, rerender } = render(<JsonEditor data={data} setData={noop} />)
    rerender(<JsonEditor data={data} setData={noop} externalTriggers={{ collapse: commands }} />)

    // Three chevrons: root, a, b. Both `a` and `b` should be collapsed.
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(3)
    expect(isCollapsed(chevrons[0])).toBe(false) // root
    expect(isCollapsed(chevrons[1])).toBe(true) // a
    expect(isCollapsed(chevrons[2])).toBe(true) // b
  })

  test('10. commands work after an arbitrary delay between broadcasts', () => {
    // The version counter bumps on every broadcast so consumer effects
    // re-fire regardless of how long ago the previous broadcast was. Pins
    // that there's no implicit time-based behaviour gating broadcasts.
    jest.useFakeTimers()
    try {
      const data = { outer: { x: 1 } }
      const { container, rerender } = render(<JsonEditor data={data} setData={noop} />)
      rerender(
        <JsonEditor
          data={data}
          setData={noop}
          externalTriggers={{ collapse: { collapsed: true, path: ['outer'], includeChildren: false } }}
        />
      )
      expect(isCollapsed(container.querySelectorAll('.jer-collapse-icon')[1])).toBe(true)

      // Wait an arbitrary length of time. Wrapped in act() so any
      // useCollapseTransition animation-completion timers flush.
      act(() => {
        jest.advanceTimersByTime(5_000)
      })

      // Same command, fresh object reference — still applies via version bump.
      rerender(
        <JsonEditor
          data={data}
          setData={noop}
          externalTriggers={{ collapse: { collapsed: true, path: ['outer'], includeChildren: false } }}
        />
      )
      expect(isCollapsed(container.querySelectorAll('.jer-collapse-icon')[1])).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })

  test('13. overlapping commands resolve last-write-wins per node', () => {
    // An array of commands may target the same node multiple times — e.g. a
    // sweeping Collapse-All followed by a targeted expand of one subtree.
    // Each node applies only the LAST matching command. Calling
    // animateCollapse twice in a single effect would mis-fire because the
    // callback closes over render-time `collapsed` and React batches the
    // setState between calls.
    const data = { outer: { inner: { x: 1 } } }
    const commands: CollapseState[] = [
      { collapsed: true, path: [], includeChildren: true }, // collapse everything
      { collapsed: false, path: ['outer'], includeChildren: true }, // ...except the `outer` subtree
    ]
    const { container, rerender } = render(<JsonEditor data={data} setData={noop} />)
    rerender(<JsonEditor data={data} setData={noop} externalTriggers={{ collapse: commands }} />)

    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(3)
    expect(isCollapsed(chevrons[0])).toBe(true) // root — only matched by cmd 1
    expect(isCollapsed(chevrons[1])).toBe(false) // outer — last match is cmd 2 (expand)
    expect(isCollapsed(chevrons[2])).toBe(false) // inner — last match is cmd 2 (subtree of outer)
  })

  test('12. changing collapse prop retires a pending broadcast for late mounts', () => {
    // With `collapse={true}`, only the root mounts (descendants are gated by
    // hasBeenOpened=false). A Collapse-All broadcast fires but only reaches
    // the root (no-op since already collapsed). The consumer then changes
    // `collapse` to false to expand the tree — descendants mount fresh.
    // They should follow the NEW prop (expanded), NOT inherit the stale
    // Collapse-All broadcast that's still in provider state.
    const data = { outer: { inner: { x: 1 } } }
    const triggers = { collapse: collapseAll }

    const { container, rerender } = render(
      <JsonEditor data={data} setData={noop} collapse={true} externalTriggers={triggers} />
    )
    // Only the root is mounted; it's collapsed.
    let chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(1)
    expect(isCollapsed(chevrons[0])).toBe(true)

    // Same triggers reference so useTriggers doesn't re-broadcast — we're
    // testing what the collapse-prop change does to the pending broadcast.
    rerender(
      <JsonEditor data={data} setData={noop} collapse={false} externalTriggers={triggers} />
    )
    // root, outer, inner — all expanded because the prop-change retired
    // the pending broadcast before descendants mounted.
    chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(3)
    chevrons.forEach((c) => expect(isCollapsed(c)).toBe(false))
  })

  test('11. broadcast cascades through the mount frontier (#273 regression)', () => {
    // The bug the version counter exists to fix: with `collapse={2}`, levels
    // 2+ start unmounted (the perf optimization that keeps deep trees cheap).
    // Firing an Expand-All broadcast must reach the unmounted descendants as
    // they mount during the cascade, not stop at the original mount frontier.
    const data = { a: { b: { c: { d: { leaf: 1 } } } } }

    const { container, rerender } = render(
      <JsonEditor data={data} setData={noop} collapse={2} />
    )
    // Pre-broadcast: only the levels above the collapse boundary have rendered
    // chevrons. `b`'s descendants (`c`, `d`) don't mount until `b` opens.
    const chevronsBefore = container.querySelectorAll('.jer-collapse-icon')
    expect(chevronsBefore.length).toBeLessThan(5)

    rerender(
      <JsonEditor
        data={data}
        setData={noop}
        collapse={2}
        externalTriggers={{ collapse: expandAll }}
      />
    )

    // After the cascade: root, a, b, c, d should all be mounted AND expanded.
    const chevronsAfter = container.querySelectorAll('.jer-collapse-icon')
    expect(chevronsAfter).toHaveLength(5)
    chevronsAfter.forEach((c) => expect(isCollapsed(c)).toBe(false))
  })
})
