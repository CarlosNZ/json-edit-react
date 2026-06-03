import { createRef, useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { JsonViewer } from '../src/JsonViewer'
import {
  type FilterFunction,
  type JsonEditorHandle,
  type JsonViewerHandle,
  type EditEvent,
} from '../src/types'

const noop = () => {}

describe('JsonEditor — primitives at the root', () => {
  test('renders a string with surrounding quotes', () => {
    render(<JsonEditor data="hello" setData={noop} />)
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  test('renders a number', () => {
    render(<JsonEditor data={42} setData={noop} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('renders boolean true', () => {
    render(<JsonEditor data={true} setData={noop} />)
    expect(screen.getByText('true')).toBeInTheDocument()
  })

  test('renders boolean false', () => {
    render(<JsonEditor data={false} setData={noop} />)
    expect(screen.getByText('false')).toBeInTheDocument()
  })

  test('renders null as the literal word "null"', () => {
    render(<JsonEditor data={null} setData={noop} />)
    expect(screen.getByText('null')).toBeInTheDocument()
  })
})

describe('JsonEditor — collections', () => {
  test('renders an object with primitive values', () => {
    render(<JsonEditor data={{ name: 'Alice', age: 30 }} setData={noop} />)
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
    expect(screen.getByText('"Alice"')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  test('renders an array of primitives, including indices', () => {
    render(<JsonEditor data={['apple', 'banana', 'cherry']} setData={noop} />)
    expect(screen.getByText('"apple"')).toBeInTheDocument()
    expect(screen.getByText('"banana"')).toBeInTheDocument()
    expect(screen.getByText('"cherry"')).toBeInTheDocument()
    // showArrayIndices defaults true; arrayIndexFromOne defaults false
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  test('renders a nested object — deep leaves are reachable on first render', () => {
    render(<JsonEditor data={{ user: { name: 'Bob' } }} setData={noop} />)
    expect(screen.getByText('user')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('"Bob"')).toBeInTheDocument()
  })

  test('renders a deeply nested mixed shape', () => {
    const data = {
      items: [
        { id: 101, label: 'first' },
        { id: 202, label: 'second' },
      ],
    }
    render(<JsonEditor data={data} setData={noop} />)
    expect(screen.getByText('items')).toBeInTheDocument()
    expect(screen.getAllByText('id')).toHaveLength(2)
    expect(screen.getAllByText('label')).toHaveLength(2)
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(screen.getByText('202')).toBeInTheDocument()
    expect(screen.getByText('"first"')).toBeInTheDocument()
    expect(screen.getByText('"second"')).toBeInTheDocument()
  })
})

describe('JsonEditor — empty collections', () => {
  test('empty object renders brackets and a "0 items" count, no child entries', () => {
    const { container } = render(<JsonEditor data={{}} setData={noop} />)
    expect(screen.getByText('{')).toBeInTheDocument()
    expect(screen.getByText('0 items')).toBeInTheDocument()
    expect(container.querySelectorAll('.jer-collection-element')).toHaveLength(0)
  })

  test('empty array renders brackets and a "0 items" count, no child entries', () => {
    const { container } = render(<JsonEditor data={[]} setData={noop} />)
    expect(screen.getByText('[')).toBeInTheDocument()
    expect(screen.getByText('0 items')).toBeInTheDocument()
    expect(container.querySelectorAll('.jer-collection-element')).toHaveLength(0)
  })
})

describe('JsonViewer — read-only contract', () => {
  test('renders the data the same way JsonEditor would', () => {
    render(<JsonViewer data={{ name: 'Alice', age: 30 }} />)
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('"Alice"')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  test('double-clicking a value does not open an edit input', async () => {
    const user = userEvent.setup()
    render(<JsonViewer data={{ greeting: 'hello' }} />)

    await user.dblClick(screen.getByText('"hello"'))

    // No textarea or input means edit mode never opened
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('passing restrictEdit={false} past the type wall does NOT unlock editing', async () => {
    const user = userEvent.setup()
    render(
      <JsonViewer
        data={{ greeting: 'hello' }}
        // @ts-expect-error — restrictEdit is omitted from JsonViewerProps;
        // a JS consumer could still pass it. JsonViewer must clobber it.
        restrictEdit={false}
      />
    )

    await user.dblClick(screen.getByText('"hello"'))

    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('the editorRef handle exposes collapse but not the editing actions', () => {
    // A consumer's imperative startEdit supersedes restrictEdit by design, so
    // a viewer must not expose it — otherwise the read-only contract could be
    // bypassed through the ref. JsonViewer's handle proxies only `collapse`;
    // the editing methods live on a private inner ref and are unreachable.
    const ref = createRef<JsonViewerHandle>()
    const { container } = render(<JsonViewer data={{ outer: { inner: 'hi' } }} editorRef={ref} />)

    // collapse works
    act(() => ref.current!.collapse({ collapsed: true, path: ['outer'], includeChildren: false }))
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons[1]).toHaveClass('jer-rotate-90')

    // editing actions are genuinely absent
    expect((ref.current as Record<string, unknown>).startEdit).toBeUndefined()
    expect((ref.current as Record<string, unknown>).cancelEdit).toBeUndefined()
    expect((ref.current as Record<string, unknown>).confirmEdit).toBeUndefined()
  })
})

describe('JsonEditor — rootName and initial collapse state', () => {
  test('rootName defaults to "root"', () => {
    render(<JsonEditor data={{ x: 1 }} setData={noop} />)
    expect(screen.getByText('root')).toBeInTheDocument()
  })

  test('rootName accepts a custom label', () => {
    render(<JsonEditor data={{ x: 1 }} setData={noop} rootName="myData" />)
    expect(screen.getByText('myData')).toBeInTheDocument()
    expect(screen.queryByText('root')).toBeNull()
  })

  test('collapse={false} (default) renders the root expanded', () => {
    const { container } = render(<JsonEditor data={{ child: 'hi' }} setData={noop} />)
    // The chevron's `jer-rotate-90` class is the visible collapse indicator
    const rootChevron = container.querySelector('.jer-collapse-icon')
    expect(rootChevron).not.toHaveClass('jer-rotate-90')
  })

  test('collapse={true} renders the root collapsed', () => {
    const { container } = render(<JsonEditor data={{ child: 'hi' }} setData={noop} collapse />)
    const rootChevron = container.querySelector('.jer-collapse-icon')
    expect(rootChevron).toHaveClass('jer-rotate-90')
  })

  test('collapse as a level number collapses only at or below that level', () => {
    // collapse={1} → root (level 0) stays expanded, nested (level 1) starts collapsed
    const data = { outer: { inner: 'deep' } }
    const { container } = render(<JsonEditor data={data} setData={noop} collapse={1} />)
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(2)
    expect(chevrons[0]).not.toHaveClass('jer-rotate-90') // root open
    expect(chevrons[1]).toHaveClass('jer-rotate-90') // nested collapsed
  })

  test('collapse={true} does not mount descendants of collapsed nodes (initial-load perf)', () => {
    // Children of a collapsed CollectionNode are gated by `hasBeenOpened.current`
    // and not rendered at all (not just CSS-hidden). This is what makes initial
    // load snappy on large data sets — a deeply-nested tree with `collapse=true`
    // only mounts the root.
    const data = { a: { b: { c: { d: { e: 'deep' } } } } }
    const { container } = render(<JsonEditor data={data} setData={noop} collapse />)
    expect(container.querySelectorAll('.jer-collapse-icon')).toHaveLength(1)
  })

  test('functional collapse: multi-criteria filter applies per node', () => {
    // Filter combines three criteria: key match, array size, and depth. Each
    // criterion is meant to be common in real use (collapse "metadata" blocks,
    // collapse large arrays by default, collapse below level N).
    const data = {
      name: 'Alice',
      metadata: { created: '2024' },
      bigList: [1, 2, 3, 4, 5],
      small: [1, 2],
      deep: { l1: { l2: { l3: 'value' } } },
    }
    const collapseFilter: FilterFunction = ({ key, value, level }) => {
      if (key === 'metadata') return true
      if (Array.isArray(value) && value.length > 3) return true
      if (level > 2) return true
      return false
    }
    const { container } = render(
      <JsonEditor data={data} setData={noop} collapse={collapseFilter} />
    )
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    // DOM order: root, metadata, bigList, small, deep, l1, l2.
    expect(chevrons).toHaveLength(7)
    expect(chevrons[0]).not.toHaveClass('jer-rotate-90') // root — level 0, expand
    expect(chevrons[1]).toHaveClass('jer-rotate-90') // metadata — key match
    expect(chevrons[2]).toHaveClass('jer-rotate-90') // bigList — array size > 3
    expect(chevrons[3]).not.toHaveClass('jer-rotate-90') // small — size 2
    expect(chevrons[4]).not.toHaveClass('jer-rotate-90') // deep — level 1
    expect(chevrons[5]).not.toHaveClass('jer-rotate-90') // l1 — level 2
    expect(chevrons[6]).toHaveClass('jer-rotate-90') // l2 — level 3 > 2
  })

  test('functional collapse: state-dependent filter flips collapse states across the tree', async () => {
    // The filter reads an external mode ("odd" or "even") and opens any node
    // whose `index` parity matches. Toggle the mode and every node flips —
    // newly-open paths mount fresh children that pick up the current filter,
    // and newly-closed paths unmount theirs (CollectionNode's effect on
    // `[collapseFilter]` reassigns `hasBeenOpened.current = !shouldBeCollapsed`,
    // which gates child rendering).
    //
    // Data: four levels deep, three children per level on the open branches,
    // so each level exercises indexes 0/1/2 (even, odd, even).
    const data = {
      a: {
        aa: { aaa: { leaf: 1 }, aab: { leaf: 1 }, aac: { leaf: 1 } },
        ab: { aba: { leaf: 1 }, abb: { leaf: 1 }, abc: { leaf: 1 } },
        ac: { aca: { leaf: 1 }, acb: { leaf: 1 }, acc: { leaf: 1 } },
      },
      b: {
        ba: { baa: { leaf: 1 }, bab: { leaf: 1 }, bac: { leaf: 1 } },
        bb: { bba: { leaf: 1 }, bbb: { leaf: 1 }, bbc: { leaf: 1 } },
        bc: { bca: { leaf: 1 }, bcb: { leaf: 1 }, bcc: { leaf: 1 } },
      },
      c: {
        ca: { caa: { leaf: 1 }, cab: { leaf: 1 }, cac: { leaf: 1 } },
        cb: { cba: { leaf: 1 }, cbb: { leaf: 1 }, cbc: { leaf: 1 } },
        cc: { cca: { leaf: 1 }, ccb: { leaf: 1 }, ccc: { leaf: 1 } },
      },
    }

    const Harness = () => {
      const [mode, setMode] = useState<'odd' | 'even'>('even')
      const filter: FilterFunction = ({ index, level }) => {
        if (level === 0) return false // root always open
        // "open if index parity matches mode" → collapse if it doesn't
        return mode === 'odd' ? index % 2 === 0 : index % 2 !== 0
      }
      return (
        <>
          <button onClick={() => setMode((m) => (m === 'odd' ? 'even' : 'odd'))}>toggle</button>
          <JsonEditor data={data} setData={noop} collapse={filter} />
        </>
      )
    }

    const user = userEvent.setup()
    const { container } = render(<Harness />)

    // Find the chevron for a given key by walking from the key text to its
    // enclosing `.jer-collection-name` row. `.jer-key-text` concatenates the
    // key with a trailing `:` (from the inner `.jer-key-colon` span), so the
    // exact match includes that suffix. Unique keys throughout the data mean
    // each key resolves to exactly one chevron (or null if not mounted).
    const chevron = (key: string) => {
      const keyEl = Array.from(container.querySelectorAll('.jer-key-text')).find(
        (el) => el.textContent === `${key}:`
      )
      return keyEl?.parentElement?.querySelector('.jer-collapse-icon') ?? null
    }
    const isOpen = (el: Element | null) => el !== null && !el.classList.contains('jer-rotate-90')
    const isClosed = (el: Element | null) => el !== null && el.classList.contains('jer-rotate-90')

    // --- mode: 'even' --- open if index 0 or 2; collapse if index 1 ---

    // Level 1: a (0), b (1), c (2) → a and c open, b collapsed.
    expect(isOpen(chevron('a'))).toBe(true)
    expect(isClosed(chevron('b'))).toBe(true)
    expect(isOpen(chevron('c'))).toBe(true)

    // b is closed → its descendants aren't mounted at all (perf optimization).
    expect(chevron('ba')).toBeNull()
    expect(chevron('bb')).toBeNull()

    // Level 2 under a: aa (0), ab (1), ac (2) → aa and ac open, ab collapsed.
    expect(isOpen(chevron('aa'))).toBe(true)
    expect(isClosed(chevron('ab'))).toBe(true)
    expect(isOpen(chevron('ac'))).toBe(true)
    // ab's children not mounted.
    expect(chevron('aba')).toBeNull()
    // Level 3 under aa: aaa (0), aab (1), aac (2).
    expect(isOpen(chevron('aaa'))).toBe(true)
    expect(isClosed(chevron('aab'))).toBe(true)
    expect(isOpen(chevron('aac'))).toBe(true)

    // --- toggle to 'odd' --- open if index 1; collapse if index 0 or 2 ---

    await user.click(screen.getByText('toggle'))

    // Level 1: every flip.
    expect(isClosed(chevron('a'))).toBe(true)
    expect(isOpen(chevron('b'))).toBe(true)
    expect(isClosed(chevron('c'))).toBe(true)

    // a is now closed → its previously-mounted children unmount (the
    // [collapseFilter] effect resets `hasBeenOpened` to false). So `aa`, `ab`,
    // `ac` are gone from the DOM, and their descendants with them.
    expect(chevron('aa')).toBeNull()
    expect(chevron('ab')).toBeNull()
    expect(chevron('aaa')).toBeNull()

    // b is now open → its previously-unmounted children mount fresh and
    // evaluate the current filter at mount time. ba (0) closed, bb (1) open,
    // bc (2) closed.
    expect(isClosed(chevron('ba'))).toBe(true)
    expect(isOpen(chevron('bb'))).toBe(true)
    expect(isClosed(chevron('bc'))).toBe(true)

    // bb (newly open) → its children also mount. Level 3 under bb.
    expect(isClosed(chevron('bba'))).toBe(true)
    expect(isOpen(chevron('bbb'))).toBe(true)
    expect(isClosed(chevron('bbc'))).toBe(true)

    // --- toggle back to 'even' --- state should mirror the initial render ---

    await user.click(screen.getByText('toggle'))

    expect(isOpen(chevron('a'))).toBe(true)
    expect(isClosed(chevron('b'))).toBe(true)
    expect(isOpen(chevron('c'))).toBe(true)
    expect(isOpen(chevron('aaa'))).toBe(true)
    expect(isClosed(chevron('aab'))).toBe(true)
    // b's descendants from the 'odd' phase unmount when b collapses again.
    expect(chevron('bb')).toBeNull()
    expect(chevron('bbb')).toBeNull()
  })

  test('functional collapse: changing the filter cascades expansion to newly-mounted nodes', () => {
    // Start with "everything collapsed" — only root mounts. Then toggle the
    // filter to "expand everything" — root expands, its newly-mounted children
    // evaluate the *current* filter at mount time and stay expanded, which
    // cascades all the way down without needing any broadcast.
    const data = { a: { b: { c: { d: 'leaf' } } } }
    const collapseAll: FilterFunction = () => true
    const expandAll: FilterFunction = () => false

    const { container, rerender } = render(
      <JsonEditor data={data} setData={noop} collapse={collapseAll} />
    )
    // Only root mounted while collapsed.
    expect(container.querySelectorAll('.jer-collapse-icon')).toHaveLength(1)

    rerender(<JsonEditor data={data} setData={noop} collapse={expandAll} />)
    // root + a + b + c — d is the value 'leaf', not a collection.
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(4)
    chevrons.forEach((c) => expect(c).not.toHaveClass('jer-rotate-90'))
  })
})

describe('JsonEditor — edit flow', () => {
  test('double-click a string value enters edit mode with a focused, pre-filled input', async () => {
    const user = userEvent.setup()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} />)

    await user.dblClick(screen.getByText('"hello"'))

    const input = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(input).toBeInTheDocument()
    expect(input).toHaveFocus()
    // The displayed value carries quotes (`"hello"`); the edit input carries the raw value
    expect(input.value).toBe('hello')
  })

  test('typing a new value and pressing Enter calls setData with the updated shape', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi{Enter}')

    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ greeting: 'hi' })
    // Edit mode closes once the update is committed
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('pressing Escape cancels the edit — setData not called, original value still shown', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'discard-me{Escape}')

    expect(setData).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  // Documents current behaviour: there is no document-level outside-click
  // handler. Clicking neutral chrome (e.g. the root key label) while editing
  // is a no-op — the input stays open. Cancelling on outside click would
  // require an explicit listener; this test locks in the current contract.
  test('clicking neutral chrome while editing does NOT close the input', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    await user.click(screen.getByText('root'))

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(setData).not.toHaveBeenCalled()
  })

  test('Tab moves edit to the next value, Shift+Tab to the previous', async () => {
    const user = userEvent.setup()
    render(<JsonEditor data={{ a: 'one', b: 'two', c: 'three' }} setData={noop} />)

    await user.dblClick(screen.getByText('"one"'))
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('one')

    await user.keyboard('{Tab}')
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('two')

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('one')
  })

  test('starting an edit on a second node cancels the first cleanly', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ a: 'one', b: 'two' }} setData={setData} />)

    // Open edit on 'a'
    await user.dblClick(screen.getByText('"one"'))
    const firstInput = screen.getByRole('textbox') as HTMLTextAreaElement
    await user.clear(firstInput)
    await user.type(firstInput, 'partial-edit-not-committed')

    // Without confirming, double-click the second value to switch focus
    await user.dblClick(screen.getByText('"two"'))

    // Exactly one input is open, and it's the second value (not a leaked first one)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(1)
    expect((inputs[0] as HTMLTextAreaElement).value).toBe('two')
    expect(setData).not.toHaveBeenCalled()
  })

  test('clicking the OK icon confirms the edit (same as pressing Enter)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi')

    // .jer-confirm-buttons holds [OK, Cancel] in DOM order
    const okBtn = container.querySelectorAll('.jer-confirm-buttons > div')[0]
    await user.click(okBtn)

    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ greeting: 'hi' })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('clicking the Cancel icon discards the edit (same as pressing Escape)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'discard-me')

    const cancelBtn = container.querySelectorAll('.jer-confirm-buttons > div')[1]
    await user.click(cancelBtn)

    expect(setData).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  // Regression: a `draggable` ancestor — not just the immediate parent, ANY
  // ancestor — suppresses native mouse text-selection / cursor-positioning
  // inside a nested input (Chromium starts a drag on `mousedown` instead). So
  // the entire chain from the open input up to the root must drop `draggable`,
  // not only the editing node. jsdom can't reproduce the native interaction, so
  // we pin the DOM contract: editing flips `draggable` off on the leaf AND its
  // ancestor collection, and restores it once the edit closes.
  test('the editing node and all its draggable ancestors lose `draggable` while the input is open', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <JsonEditor data={{ outer: { inner: 'hello' } }} setData={noop} restrictDrag={false} />
    )

    const leaf = container.querySelector('.jer-value-component') as HTMLElement
    const ancestor = container.querySelector('.jer-collection-component') as HTMLElement
    expect(leaf).toHaveAttribute('draggable', 'true')
    expect(ancestor).toHaveAttribute('draggable', 'true')

    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(leaf).toHaveAttribute('draggable', 'false')
    expect(ancestor).toHaveAttribute('draggable', 'false')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(leaf).toHaveAttribute('draggable', 'true')
    expect(ancestor).toHaveAttribute('draggable', 'true')
  })
})

describe('JsonEditor — structural mutations', () => {
  test('deleting a property removes it from setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ x: 'hi', y: 'bye' }} setData={setData} showIconTooltips />)

    // Scope to the 'x' row to pick the right delete button (multiple rows have one)
    const xRow = screen.getByText('"hi"').closest('.jer-component') as HTMLElement
    const deleteBtn = xRow.querySelector('[title="Delete"]') as HTMLElement
    await user.click(deleteBtn)

    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ y: 'bye' })
  })

  test('adding an element to an array appends a default value', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={['a', 'b']} setData={setData} showIconTooltips />)

    // Only one Add button on the page (root array) — arrays don't prompt for a key
    await user.click(screen.getByTitle('Add'))

    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith(['a', 'b', null])
  })

  test('adding a property to an object: click Add, type a key, press Enter', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ existing: 'value' }} setData={setData} showIconTooltips />
    )

    await user.click(screen.getByTitle('Add'))
    // A new-key input appears; it's pre-populated with a default placeholder key
    const newKeyInput = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    expect(newKeyInput).toBeInTheDocument()
    await user.clear(newKeyInput)
    await user.type(newKeyInput, 'fresh{Enter}')

    expect(setData).toHaveBeenCalledTimes(1)
    // New property takes the default value (null) — that's the editor's contract for fresh keys
    expect(setData).toHaveBeenCalledWith({ existing: 'value', fresh: null })
  })

  test('renaming a key preserves insertion order', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ a: 1, oldName: 2, c: 3 }} setData={setData} />)

    // Double-clicking the key text opens the rename input
    await user.dblClick(screen.getByText('oldName'))
    const keyInput = screen.getByDisplayValue('oldName') as HTMLInputElement
    await user.clear(keyInput)
    await user.type(keyInput, 'newName{Enter}')

    expect(setData).toHaveBeenCalledTimes(1)
    const [updated] = setData.mock.calls[0]
    // Value carries across, AND insertion order is preserved
    expect(updated).toEqual({ a: 1, newName: 2, c: 3 })
    expect(Object.keys(updated)).toEqual(['a', 'newName', 'c'])
  })

  test("changing a value's type fires setData with the converted default", async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    // The type selector is a native <select>, role=combobox
    const typeSelect = screen.getByRole('combobox') as HTMLSelectElement
    await user.selectOptions(typeSelect, 'number')

    expect(setData).toHaveBeenCalledTimes(1)
    // 'hello' → number conversion is NaN, which the editor falls back to 0
    expect(setData).toHaveBeenCalledWith({ x: 0 })
  })
})

describe('JsonEditor — §17 onUpdate event discriminant', () => {
  test('onUpdate receives event:"delete" with the node identity', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => true as const)
    render(
      <JsonEditor data={{ x: 'hi', y: 'bye' }} setData={noop} onUpdate={onUpdate} showIconTooltips />
    )

    const xRow = screen.getByText('"hi"').closest('.jer-component') as HTMLElement
    await user.click(xRow.querySelector('[title="Delete"]') as HTMLElement)

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'delete', key: 'x', path: ['x'], newData: { y: 'bye' } })
    )
  })

  test('onUpdate receives event:"add" with the new node position and value', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => true as const)
    const { container } = render(
      <JsonEditor data={{ existing: 'value' }} setData={noop} onUpdate={onUpdate} showIconTooltips />
    )

    await user.click(screen.getByTitle('Add'))
    const newKeyInput = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    await user.clear(newKeyInput)
    await user.type(newKeyInput, 'fresh{Enter}')

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'add',
        key: 'fresh',
        path: ['fresh'],
        newValue: null,
        newData: { existing: 'value', fresh: null },
        // The payload describes the PRE-add state + the insertion position:
        // value/size unset, and parentData/fullData are the pre-add document
        // (NOT including the new `fresh` key).
        value: undefined,
        size: null,
        parentData: { existing: 'value' },
        fullData: { existing: 'value' },
      })
    )
  })

  test('onUpdate receives event:"rename" with the OLD identity and newKey', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => true as const)
    render(<JsonEditor data={{ a: 1, oldName: 2, c: 3 }} setData={noop} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('oldName'))
    const keyInput = screen.getByDisplayValue('oldName') as HTMLInputElement
    await user.clear(keyInput)
    await user.type(keyInput, 'newName{Enter}')

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'rename',
        key: 'oldName',
        path: ['oldName'],
        newKey: 'newName',
        newData: { a: 1, newName: 2, c: 3 },
      })
    )
  })

  // Move arrives as `event: 'move'` with `newPath` + the source-path NodeData,
  // but exercising it needs a full drag-drop simulation — deferred with the
  // rest of the DnD test gap (#270).
  test.todo('onUpdate receives event:"move" on a drag-drop (needs DnD simulation — #270)')
})

describe('JsonEditor — §17 onEditEvent lifecycle stream', () => {
  // A session ends in confirm* (committed) or cancel* (closed without a commit).
  test('value edit: startEdit → confirmEdit on a real change', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onEditEvent={onEditEvent} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'world{Enter}')

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'confirmEdit'])
  })

  test('value edit: startEdit → cancelEdit on a no-op confirm (no change)', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onEditEvent={onEditEvent} />)

    await user.dblClick(screen.getByText('"hello"'))
    // Confirm without changing anything.
    await user.type(screen.getByRole('textbox'), '{Enter}')

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'cancelEdit'])
  })

  test('value edit: startEdit → cancelEdit on Escape', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onEditEvent={onEditEvent} />)

    await user.dblClick(screen.getByText('"hello"'))
    await user.type(screen.getByRole('textbox'), 'abc{Escape}')

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'cancelEdit'])
  })

  test('key rename: startRename → confirmRename with old + new keys', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(<JsonEditor data={{ a: 1, oldName: 2 }} setData={noop} onEditEvent={onEditEvent} />)

    await user.dblClick(screen.getByText('oldName'))
    const keyInput = screen.getByDisplayValue('oldName') as HTMLInputElement
    await user.clear(keyInput)
    await user.type(keyInput, 'newName{Enter}')

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startRename', 'confirmRename'])
    const confirm = onEditEvent.mock.calls.map(([e]) => e)[1]
    expect(confirm).toMatchObject({
      event: 'confirmRename',
      key: 'oldName',
      path: ['oldName'],
      oldKey: 'oldName',
      newKey: 'newName',
    })
  })

  test('add (object): startAdd → confirmAdd; and startAdd → cancelAdd on Escape', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    const { container } = render(
      <JsonEditor data={{ existing: 'value' }} setData={noop} onEditEvent={onEditEvent} showIconTooltips />
    )

    // Open + confirm
    await user.click(screen.getByTitle('Add'))
    const newKeyInput = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    await user.clear(newKeyInput)
    await user.type(newKeyInput, 'fresh{Enter}')
    expect(onEditEvent.mock.calls.map(([e]) => e.event)).toEqual(['startAdd', 'confirmAdd'])

    // Open + cancel
    onEditEvent.mockClear()
    await user.click(screen.getByTitle('Add'))
    const reopened = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    await user.type(reopened, '{Escape}')
    expect(onEditEvent.mock.calls.map(([e]) => e.event)).toEqual(['startAdd', 'cancelAdd'])
  })

  test('delete fires a single "delete" event', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(
      <JsonEditor data={{ x: 'hi', y: 'bye' }} setData={noop} onEditEvent={onEditEvent} showIconTooltips />
    )

    const xRow = screen.getByText('"hi"').closest('.jer-component') as HTMLElement
    await user.click(xRow.querySelector('[title="Delete"]') as HTMLElement)

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['delete'])
    expect(onEditEvent.mock.calls[0][0]).toMatchObject({ event: 'delete', key: 'x', path: ['x'] })
  })

  test('Tab-commit fires confirmEdit then startEdit(next) — no stray cancelEdit', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(<JsonEditor data={{ a: 'x', b: 'y' }} setData={noop} onEditEvent={onEditEvent} />)

    await user.dblClick(screen.getByText('"x"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'changed{Tab}')

    // The commit is async (`.then`), so `confirmEdit` lands after the synchronous
    // advance to the next node — order is start, start(next), confirm. The
    // load-bearing guard: a `confirmEdit` fired and there's NO stray `cancelEdit`
    // (which would mean the stale cancelOp reverted the just-committed value).
    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toContain('confirmEdit')
    expect(seq.filter((e) => e === 'startEdit')).toHaveLength(2)
    expect(seq).not.toContain('cancelEdit')
  })

  test('node-switch fires cancelEdit for the displaced session before startEdit for the new one', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(
      <JsonEditor data={{ a: 'first', b: 'second' }} setData={noop} onEditEvent={onEditEvent} />
    )

    // Open edit on `a`, then click Edit on `b` while `a` is still active.
    await user.dblClick(screen.getByText('"first"'))
    // Typed-but-uncommitted text on `a`. The displaced session must report as
    // a cancel (not a silent close).
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'edited-a')
    await user.dblClick(screen.getByText('"second"'))

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'cancelEdit', 'startEdit'])
    expect(onEditEvent.mock.calls[0][0]).toMatchObject({ key: 'a' })
    expect(onEditEvent.mock.calls[1][0]).toMatchObject({ event: 'cancelEdit', key: 'a' })
    expect(onEditEvent.mock.calls[2][0]).toMatchObject({ event: 'startEdit', key: 'b' })
  })

  test('editorRef.cancelEdit fires cancelEdit and clears the local edit buffer', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={noop}
        onEditEvent={onEditEvent}
        editorRef={ref}
      />
    )

    await user.dblClick(screen.getByText('"hello"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'typed-but-not-committed')

    // External cancel via the imperative handle.
    act(() => {
      ref.current!.cancelEdit()
    })

    // The lifecycle event fires.
    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'cancelEdit'])

    // And the local buffer was reverted — re-opening the node shows the
    // original value, not the typed-but-uncommitted text.
    await user.dblClick(screen.getByText('"hello"'))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('hello')
  })
})

describe('JsonEditor — restrictions and callbacks', () => {
  test('restrictEdit hides the edit button and blocks dblClick', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={setData}
        restrictEdit
        showIconTooltips
      />
    )

    expect(screen.queryByTitle('Edit')).toBeNull()
    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(setData).not.toHaveBeenCalled()
  })

  test('restrictDelete hides the delete button', () => {
    render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={noop}
        restrictDelete
        showIconTooltips
      />
    )
    expect(screen.queryByTitle('Delete')).toBeNull()
  })

  test('restrictAdd hides the add button', () => {
    render(
      <JsonEditor
        data={{ existing: 'value' }}
        setData={noop}
        restrictAdd
        showIconTooltips
      />
    )
    expect(screen.queryByTitle('Add')).toBeNull()
  })

  test('onUpdate returning false reverts the display and shows an error, without calling setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(() => false as const)
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'rejected{Enter}')

    // onUpdate ran with the attempted new value
    expect(onUpdate).toHaveBeenCalledTimes(1)
    // A reject never commits — nothing was applied, so the editor must NOT write
    // back to external state (writing the pre-edit snapshot here could clobber a
    // newer commit that landed while an async onUpdate was in flight).
    expect(setData).not.toHaveBeenCalled()
    // The node still reverts its own display, and the default error shows.
    expect(screen.getByText('"hello"')).toBeInTheDocument()
    expect(screen.queryByText('"rejected"')).toBeNull()
    expect(screen.getByText('Update unsuccessful')).toBeInTheDocument()
  })

  test('onUpdate returning false on a delete shows the delete-specific message', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => false as const)
    render(
      <JsonEditor data={{ x: 'hi', y: 'bye' }} setData={noop} onUpdate={onUpdate} showIconTooltips />
    )

    const xRow = screen.getByText('"hi"').closest('.jer-component') as HTMLElement
    await user.click(xRow.querySelector('[title="Delete"]') as HTMLElement)

    // Event-specific message, matching the DELETE_ERROR code routed to onError
    expect(screen.getByText('Delete unsuccessful')).toBeInTheDocument()
  })

  test('onUpdate returning false on an add shows the add-specific message', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => false as const)
    const { container } = render(
      <JsonEditor data={{ existing: 'value' }} setData={noop} onUpdate={onUpdate} showIconTooltips />
    )

    await user.click(screen.getByTitle('Add'))
    const newKeyInput = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    await user.clear(newKeyInput)
    await user.type(newKeyInput, 'fresh{Enter}')

    // Event-specific message, matching the ADD_ERROR code routed to onError
    expect(screen.getByText('Adding node unsuccessful')).toBeInTheDocument()
  })

  test('a rejected to-enum type change reverts the type selector (not stuck on the enum)', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => false as const)
    render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={noop}
        onUpdate={onUpdate}
        restrictTypeSelection={['string', { enum: 'Color', values: ['red', 'green', 'blue'] }]}
      />
    )

    // Enter edit mode on the value — the type <select> appears
    await user.dblClick(screen.getByText('"hello"'))
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('string')

    // Switch the type to the enum. 'hello' isn't a valid Color, so the wrapper
    // attempts a commit (the first enum value) which onUpdate rejects.
    await user.selectOptions(select, 'Color')
    expect(onUpdate).toHaveBeenCalled()

    // The rejection reverts the value and closes the edit session.
    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())
    expect(screen.getByText('"hello"')).toBeInTheDocument()

    // Re-open editing: the type selector must reflect the reverted value
    // (`string`), not stay stuck on the enum it was synchronously set to.
    await user.dblClick(screen.getByText('"hello"'))
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('string')
  })

  test('onUpdate returning { error: string } surfaces that string', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => ({ error: 'No can do' }))
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'nope{Enter}')

    expect(screen.getByText('No can do')).toBeInTheDocument()
  })

  test('onUpdate returning { error: JsonEditorError } surfaces the message', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => ({
      error: { code: 'UPDATE_ERROR' as const, message: 'Object-form error' },
    }))
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'nope{Enter}')

    expect(screen.getByText('Object-form error')).toBeInTheDocument()
  })

  test('onUpdate returning { error: "" } (empty message) still rejects — reverts + fires onError', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onError = jest.fn()
    const onUpdate = jest.fn(() => ({ error: '' }))
    render(
      <JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} onError={onError} />
    )

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'rejected{Enter}')

    // An empty error string is a rejection, not a silent success: no commit, the
    // display reverts, and onError fires (with the empty message).
    expect(setData).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UPDATE_ERROR', message: '' }),
      })
    )
    expect(screen.getByText('"hello"')).toBeInTheDocument()
    expect(screen.queryByText('"rejected"')).toBeNull()
  })

  test('onUpdate returning { value } passes the override straight to setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(() => ({ value: { x: 'OVERRIDDEN' } }))
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'whatever{Enter}')

    expect(setData).toHaveBeenCalledTimes(1)
    // The user's typed value is discarded; the override wins
    expect(setData).toHaveBeenCalledWith({ x: 'OVERRIDDEN' })
  })

  test('onUpdate returning null silently cancels: no commit, no error, input reverts', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(() => null)
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'discarded{Enter}')

    expect(onUpdate).toHaveBeenCalledTimes(1)
    // Silent abort: no commit...
    expect(setData).not.toHaveBeenCalled()
    // ...no error message...
    expect(screen.queryByText('Update unsuccessful')).toBeNull()
    // ...and the input reverts to the original (not the typed-but-cancelled value)
    expect(screen.getByText('"hello"')).toBeInTheDocument()
    expect(screen.queryByText('"discarded"')).toBeNull()
  })

  test('a rejected edit reverts the displayed value (independent of the error message)', async () => {
    const user = userEvent.setup()
    // setData is a no-op, so `data` never changes — the revert here is the
    // explicit display reset, not an effect riding a data change.
    const onUpdate = jest.fn(() => false as const)
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'rejected{Enter}')

    expect(screen.getByText('"hello"')).toBeInTheDocument()
    expect(screen.queryByText('"rejected"')).toBeNull()
  })

  test('onUpdate receives event:"edit" with the node identity and new value', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => true as const)
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'world{Enter}')

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'edit',
        key: 'x',
        path: ['x'],
        value: 'hello',
        newValue: 'world',
        newData: { x: 'world' },
      })
    )
  })

  test('async onUpdate resolving with true commits the edit', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(async () => true as const)
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi{Enter}')

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ x: 'hi' })
  })

  test('async onUpdate resolving with false reverts the display and shows an error, without calling setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(async () => false as const)
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi{Enter}')

    // A reject — even an async one — never writes to external state. (This is
    // what prevents a slow rejection from clobbering a newer commit that landed
    // while it was in flight.)
    expect(setData).not.toHaveBeenCalled()
    expect(screen.getByText('"hello"')).toBeInTheDocument()
    expect(screen.getByText('Update unsuccessful')).toBeInTheDocument()
  })

  // A rejected onUpdate promise currently loses the edit silently and leaks an
  // unhandled rejection. Tracked as #271 — promote to a real test once the
  // editor wraps `await updateMethod(...)` in a try/catch and reverts cleanly.
  test.todo('async onUpdate that rejects should revert and show an error (#271)')

  test('restrictEdit as a function selectively allows/blocks per node', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(
      <JsonEditor
        data={{ readonly: 'cant', editable: 'can' }}
        setData={setData}
        restrictEdit={({ key }) => key === 'readonly'}
        showIconTooltips
      />
    )

    const readonlyRow = screen.getByText('"cant"').closest('.jer-component') as HTMLElement
    const editableRow = screen.getByText('"can"').closest('.jer-component') as HTMLElement

    expect(readonlyRow.querySelector('[title="Edit"]')).toBeNull()
    expect(editableRow.querySelector('[title="Edit"]')).not.toBeNull()

    // dblClick on the restricted value does NOT open an input
    await user.dblClick(screen.getByText('"cant"'))
    expect(screen.queryByRole('textbox')).toBeNull()

    // dblClick on the allowed value DOES open an input
    await user.dblClick(screen.getByText('"can"'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('restrictDelete as a function selectively allows/blocks per node', () => {
    render(
      <JsonEditor
        data={{ keep: 'must', drop: 'can' }}
        setData={noop}
        restrictDelete={({ key }) => key === 'keep'}
        showIconTooltips
      />
    )

    const keepRow = screen.getByText('"must"').closest('.jer-component') as HTMLElement
    const dropRow = screen.getByText('"can"').closest('.jer-component') as HTMLElement

    expect(keepRow.querySelector('[title="Delete"]')).toBeNull()
    expect(dropRow.querySelector('[title="Delete"]')).not.toBeNull()
  })

  test('restrictAdd as a function selectively allows/blocks per collection', () => {
    render(
      <JsonEditor
        data={{ closed: { a: 1 }, open: { b: 1 } }}
        setData={noop}
        restrictAdd={({ key }) => key === 'closed'}
        showIconTooltips
      />
    )

    // The closed sub-collection has no Add; the open one does
    const closedCollection = screen.getByText('closed').closest('.jer-component') as HTMLElement
    const openCollection = screen.getByText('open').closest('.jer-component') as HTMLElement

    expect(closedCollection.querySelector('[title="Add"]')).toBeNull()
    expect(openCollection.querySelector('[title="Add"]')).not.toBeNull()
  })
})

describe('JsonEditor — search and filter', () => {
  test('searchText filters values via the default value matcher', () => {
    render(
      <JsonEditor
        data={{ fruit: 'apple', vehicle: 'car', tool: 'hammer' }}
        setData={noop}
        searchText="apple"
      />
    )

    // Only the 'apple' row's value remains; the others are not rendered at all
    expect(screen.getByText('"apple"')).toBeInTheDocument()
    expect(screen.queryByText('"car"')).toBeNull()
    expect(screen.queryByText('"hammer"')).toBeNull()
  })

  test('a custom searchFilter function decides which nodes stay visible', () => {
    render(
      <JsonEditor
        data={{ small: 1, medium: 5, large: 10 }}
        setData={noop}
        // Pass any non-empty searchText to activate filtering — the function ignores it
        searchText="x"
        searchFilter={(nodeData) =>
          typeof nodeData.value === 'number' && nodeData.value >= 5
        }
      />
    )

    expect(screen.queryByText('1')).toBeNull()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  test('Tab and Shift+Tab skip filtered-out nodes', async () => {
    const user = userEvent.setup()
    // 'banana' does NOT contain 'apple'; the other two values do.
    // With searchText='apple', the 'b' row is hidden from the rendered tree.
    render(
      <JsonEditor
        data={{ a: 'apple', b: 'banana', c: 'apple-pie' }}
        setData={noop}
        searchText="apple"
      />
    )

    // Sanity: 'banana' is filtered out before we start
    expect(screen.queryByText('"banana"')).toBeNull()

    await user.dblClick(screen.getByText('"apple"'))
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('apple')

    // Tab from 'a' must skip the hidden 'b' and land on 'c'
    await user.keyboard('{Tab}')
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('apple-pie')

    // Shift+Tab from 'c' must skip 'b' going the other way and land back on 'a'
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('apple')
  })

  test('searchDebounceTime delays the filter — change is invisible until the debounce fires', () => {
    // Default matcher filters by VALUE, so the strings to query for are the values.
    const data = { fruit: 'apple', veg: 'broccoli' }

    // Mount under real timers — JsonEditor's outer wrapper sets docRoot in
    // a mount-time useEffect; fake timers can starve it and the component
    // renders null. Switch to fake timers only after the initial render.
    const { rerender } = render(
      <JsonEditor data={data} setData={noop} searchText="" searchDebounceTime={500} />
    )
    expect(screen.getByText('"apple"')).toBeInTheDocument()
    expect(screen.getByText('"broccoli"')).toBeInTheDocument()

    jest.useFakeTimers()
    try {
      rerender(
        <JsonEditor data={data} setData={noop} searchText="apple" searchDebounceTime={500} />
      )

      // Right after rerender — debounce hasn't fired, 'broccoli' is still rendered
      expect(screen.getByText('"broccoli"')).toBeInTheDocument()

      // Advance partway — still nothing
      act(() => {
        jest.advanceTimersByTime(400)
      })
      expect(screen.getByText('"broccoli"')).toBeInTheDocument()

      // Cross the debounce threshold — filter applies, 'broccoli' disappears
      act(() => {
        jest.advanceTimersByTime(150)
      })
      expect(screen.queryByText('"broccoli"')).toBeNull()
      expect(screen.getByText('"apple"')).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })
})
