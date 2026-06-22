// Helpers for driving native HTML5 drag-and-drop in jsdom.
//
// jsdom does not synthesise `DataTransfer` for drag events and RTL's
// `userEvent` has no DnD API, so we hand-roll the event sequence via
// `fireEvent`.  These helpers exist so each test reads as a single line:
//
//   dragAndDrop(rowFor(container, 'a'), rowFor(container, 'b'))
//
// Source events that the production hook listens for:
//   onDragStart           — on the draggable row
//   onDragOver / onDrop   — on the drop target (the row itself for 'above',
//                            or the absolutely-positioned `.jer-drop-target-bottom`
//                            child for 'below')
//   onDragEnter / onDragExit — purely visual (drop-zone highlight)
//   onDragEnd             — clears the dragSource on the source row
//
// We always fire `dragStart` → `dragOver` → `drop` → `dragEnd` so the
// internal state machine ends up clean for the next test.

import { act, fireEvent } from '@testing-library/react'

// Minimal stub – the production code never reads anything off
// `dataTransfer`, it tracks the source via React context.  jsdom still
// requires the property to be present on the event for `fireEvent.dragStart`
// to not throw, so we provide one.
const makeDataTransfer = () => ({
  data: {} as Record<string, string>,
  setData(format: string, value: string) {
    this.data[format] = value
  },
  getData(format: string) {
    return this.data[format] ?? ''
  },
  clearData() {
    this.data = {}
  },
  setDragImage: () => {},
  dropEffect: 'none',
  effectAllowed: 'all',
  files: [],
  items: [],
  types: [],
})

export type DropPosition = 'above' | 'below'

/**
 * Find the row element for a value or collection node given its rendered key.
 * Matches the visible "key:" label inside `.jer-key-text`, then walks up to
 * the nearest `.jer-component` (the draggable row).
 *
 * When the same key appears more than once in the tree, scope the search with
 * `within` (a parent row) to disambiguate:
 *
 *   rowFor(rowFor(container, 'dst'), 'dup')   // the 'dup' inside 'dst'
 */
export const rowFor = (root: HTMLElement, key: string | number): HTMLElement => {
  const labels = Array.from(root.querySelectorAll('.jer-key-text'))
  const label = labels.find((el) => (el.textContent ?? '').replace(/:$/, '') === String(key))
  if (!label) throw new Error(`rowFor: no row with key "${key}" found`)
  const row = label.closest('.jer-component') as HTMLElement | null
  if (!row) throw new Error(`rowFor: row for "${key}" missing .jer-component ancestor`)
  return row
}

/** Bottom-half drop target rendered as a child of the row during an active drag. */
const bottomTarget = (row: HTMLElement): HTMLElement | null =>
  row.querySelector('.jer-drop-target-bottom')

/**
 * Drive a complete drag-and-drop from `source` to `target`.
 *
 * `position` selects which half of the target row receives the drop:
 *   - 'above' (default) drops onto the row itself
 *   - 'below' drops onto the bottom-half overlay (only present while a drag
 *     is in progress, hence we re-query after `dragStart`)
 *
 * The drop chain inside `JsonEditor` is async (`onMove` → `handleEdit`
 * awaits the user-supplied `onUpdate`), so we wrap in `act` and flush
 * microtasks before returning.  Tests can stay synchronous-looking by
 * `await`-ing this helper.
 *
 * In real browsers, `draggable="false"` cancels the native `dragstart`
 * entirely — nothing bubbles to ancestors.  jsdom's `fireEvent` ignores
 * that attribute, so we replicate the browser behaviour here: if `source`
 * is not actually draggable, the whole gesture is a no-op.
 */
export const dragAndDrop = async (
  source: HTMLElement,
  target: HTMLElement,
  position: DropPosition = 'above'
) => {
  if (source.getAttribute('draggable') !== 'true') return

  const dataTransfer = makeDataTransfer()
  await act(async () => {
    // Production arms the drag on a primary-button mousedown (the Firefox
    // phantom-dragstart guard in `useDragNDrop`). A bare `dragStart` is
    // rejected as unarmed, so we mirror the browser's real grab sequence.
    fireEvent.mouseDown(source, { button: 0 })
    fireEvent.dragStart(source, { dataTransfer })
  })

  // Bottom-half target only mounts after dragStart fires, so re-query.
  const dropEl = position === 'below' ? bottomTarget(target) ?? target : target

  await act(async () => {
    fireEvent.dragEnter(dropEl, { dataTransfer })
    fireEvent.dragOver(dropEl, { dataTransfer })
    fireEvent.drop(dropEl, { dataTransfer })
    // Flush the `onMove` → `handleEdit` async chain.
    await Promise.resolve()
    await Promise.resolve()
  })

  await act(async () => {
    fireEvent.dragEnd(source, { dataTransfer })
  })
}
