/**
 * End-to-end tests for collapse broadcasts via `externalTriggers.collapse`.
 *
 * Pins the public-facing behavior of collapse commands after the §4 Part 4
 * refactor moved CollapseProvider from state-with-`setTimeout`-reset to a
 * pure pub-sub model. Drives commands via the public API (`externalTriggers`)
 * rather than poking the provider directly, so these tests exercise the full
 * path through `useTriggers` → `setCollapseState` → subscriber handlers in
 * each `CollectionNode`.
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
    // Start expanded so every CollectionNode mounts and subscribes. Collapse
    // them all via broadcast, then expand all again — the second broadcast
    // hits the same subscriber set.
    //
    // Note: this test deliberately starts expanded rather than using
    // `collapse={true}` initially. Pub-sub broadcasts only reach mounted
    // subscribers; children of an initially-collapsed parent aren't mounted
    // yet (see CollectionNode.tsx — `hasBeenOpened.current` gates child
    // rendering). For "fully expand an initially-collapsed tree" use cases,
    // consumers should toggle the `collapse` prop. See migration-guide.md.
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

  test('5. back-to-back identical commands both fire (no state-reset gap)', async () => {
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

  test('6. stale command does NOT auto-apply to newly mounted nodes', () => {
    // Fire Collapse-All on a tree without `newChild`, then add `newChild`. The
    // new node should mount in its default (expanded) state — it subscribed
    // after the broadcast and so received nothing. Same `triggers` reference
    // across the two rerenders so the command is NOT re-fired by useTriggers.
    const dataBefore = { outer: { existing: 1 } }
    const dataAfter = { outer: { existing: 1, newChild: { nested: 'value' } } }
    const triggers = { collapse: collapseAll }

    const { container, rerender } = render(
      <JsonEditor data={dataBefore} setData={noop} externalTriggers={triggers} />
    )
    // Every initially-mounted CollectionNode is collapsed.
    container
      .querySelectorAll('.jer-collapse-icon')
      .forEach((c) => expect(isCollapsed(c)).toBe(true))

    // Add a new collection child. Same externalTriggers reference — so the
    // command is NOT re-fired; we're testing what the new mount inherits.
    rerender(<JsonEditor data={dataAfter} setData={noop} externalTriggers={triggers} />)
    // root, outer, newChild — `existing` is a number, no chevron.
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(3)
    expect(isCollapsed(chevrons[2])).toBe(false) // newChild — uses default
  })

  test('7. external data swap after a command does NOT replay it', () => {
    // Fire Collapse-All, then swap to a different data shape so a new key
    // mounts. The newly-mounted CollectionNode subscribes after the broadcast
    // has already fired, so it should use its default state — not the stale
    // command. (Root stays collapsed because it didn't remount, just rendered
    // new children — its subscriber-side state persists.)
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
    // Two chevrons: root (still collapsed from the first broadcast), b (newly
    // mounted — expanded, default state, did NOT replay the stale command).
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(2)
    expect(isCollapsed(chevrons[0])).toBe(true) // root — same instance, retained state
    expect(isCollapsed(chevrons[1])).toBe(false) // b — new mount uses default
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

  test('10. no setTimeout artifacts — commands work after arbitrary delay', () => {
    // The old state-with-reset model relied on a 2-second setTimeout to clear
    // the broadcast so subsequent identical commands could be picked up by
    // useEffect dep-array `===` comparison. Pub-sub has no such timer; this
    // test pins that there's no implicit time-based behaviour to rely on.
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

      // Advance well past the old 2-second window. Wrapped in act() so any
      // timer-driven state updates (e.g. useCollapseTransition's animation
      // completion timer that flips maxHeight back to undefined) commit
      // synchronously rather than triggering "not wrapped in act" warnings.
      act(() => {
        jest.advanceTimersByTime(5_000)
      })

      // Same command (new object reference) still fires.
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
})
