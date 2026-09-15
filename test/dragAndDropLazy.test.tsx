/**
 * The on-demand path for the drag-and-drop engine (issue #327): with
 * `allowDrag` off the engine is never loaded, and with it on the nodes are
 * inert until the dynamic `import()` in `DragSourceProvider` resolves, then
 * fully drag-capable — without a remount.
 *
 * The rest of the suite preloads the engine (test/setupTests.ts) so editors
 * mount with drag wired synchronously. This file resets the module registry
 * so the editor it renders gets a `DragSourceProvider` that hasn't seen the
 * engine and really has to `import()` it. Everything React-related is
 * imported AFTER the reset so the test and the editor share one React copy.
 */

// Counts evaluations of the engine module across registries: once for the
// setup-file preload, then once more only if an editor under test loads it.
let engineEvaluations = 0
jest.mock('../src/hooks/dragAndDrop', () => {
  engineEvaluations++
  return jest.requireActual('../src/hooks/dragAndDrop')
})

jest.resetModules()

// Synchronous, at module scope: Testing Library registers its `afterEach`
// cleanup as it loads, which Jest only allows before the tests start.
const { render, act, fireEvent } =
  jest.requireActual<typeof import('@testing-library/react')>('@testing-library/react')
const { JsonEditor } = jest.requireActual<typeof import('../src')>('../src')
const { rowFor, dragAndDrop } = jest.requireActual<typeof import('./dndHelper')>('./dndHelper')

// Lets the provider's `import()` resolve and the resulting state update commit.
const settle = () => act(async () => {})

test('without allowDrag the engine is never loaded', async () => {
  const before = engineEvaluations
  render(<JsonEditor data={{ a: 1, b: 2 }} setData={() => {}} />)
  await settle()
  expect(engineEvaluations).toBe(before)
})

test('with allowDrag the engine loads on demand and drag then works without a remount', async () => {
  const setData = jest.fn()
  const before = engineEvaluations
  const { container } = render(
    <JsonEditor data={{ a: 1, b: 2, c: 3 }} setData={setData} allowDrag />
  )
  const rowA = rowFor(container, 'a')

  // Before the chunk lands: the node is marked draggable (core decides that),
  // but there are no handlers yet, so a drag gesture is inert.
  expect(rowA).toHaveAttribute('draggable', 'true')
  fireEvent.mouseDown(rowA, { button: 0 })
  fireEvent.dragStart(rowA)
  expect(container.querySelector('.jer-drop-target-bottom')).toBeNull()

  await settle()
  expect(engineEvaluations).toBe(before + 1)

  // The same DOM node is still mounted (no remount when the engine arrived)
  // and a full drag now commits a move.
  expect(rowFor(container, 'a')).toBe(rowA)
  await dragAndDrop(rowA, rowFor(container, 'b'), 'below')
  expect(setData).toHaveBeenCalledTimes(1)
  expect(Object.keys(setData.mock.calls[0][0] as object)).toEqual(['b', 'a', 'c'])

  // A second editor mounting afterwards gets the engine synchronously.
  const second = render(<JsonEditor data={{ x: 1, y: 2 }} setData={setData} allowDrag />)
  expect(engineEvaluations).toBe(before + 1)
  await dragAndDrop(rowFor(second.container, 'x'), rowFor(second.container, 'y'), 'below')
  expect(setData).toHaveBeenCalledTimes(2)
})
