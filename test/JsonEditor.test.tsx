import { createRef, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { JsonViewer } from '../src/JsonViewer'
import {
  type FilterFunction,
  type JsonEditorHandle,
  type JsonViewerHandle,
  type EditEvent,
  type UpdateFunction,
  type OnChangeFunction,
  type JsonData,
} from '../src/types'

const noop = () => {}

// A promise whose resolution the test drives, to control when a background
// `onUpdate` settlement lands (the optimistic-vs-settled timing the v2 model
// hinges on).
const makeDeferred = <T = unknown,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

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
    // showArrayIndexes defaults true; arrayIndexStart defaults 0
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  test('arrayIndexStart offsets the displayed array index labels', () => {
    const { rerender } = render(
      <JsonEditor data={['apple', 'banana', 'cherry']} setData={noop} arrayIndexStart={1} />
    )
    // 1-based: labels are 1, 2, 3 (no "0")
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('0')).toBeNull()

    // Accepts any number, not just 0 | 1 — labels become 7, 8, 9
    rerender(<JsonEditor data={['apple', 'banana', 'cherry']} setData={noop} arrayIndexStart={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  test('showArrayIndexes={false} hides array index labels', () => {
    render(<JsonEditor data={['apple', 'banana']} setData={noop} showArrayIndexes={false} />)
    expect(screen.getByText('"apple"')).toBeInTheDocument()
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.queryByText('1')).toBeNull()
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

  test('passing allowEdit={true} past the type wall does NOT unlock editing', async () => {
    const user = userEvent.setup()
    render(
      <JsonViewer
        data={{ greeting: 'hello' }}
        // @ts-expect-error — allowEdit is omitted from JsonViewerProps;
        // a JS consumer could still pass it. JsonViewer must clobber it.
        allowEdit={true}
      />
    )

    await user.dblClick(screen.getByText('"hello"'))

    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('the editorRef handle exposes collapse but not the editing actions', () => {
    // A consumer's imperative startEdit supersedes allowEdit by design, so
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
    expect((ref.current as Record<string, unknown>).cancel).toBeUndefined()
    expect((ref.current as Record<string, unknown>).confirm).toBeUndefined()
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
    // collapse={1} → root (level 0) stays expanded, nested (level 1) starts
    // collapsed
    const data = { outer: { inner: 'deep' } }
    const { container } = render(<JsonEditor data={data} setData={noop} collapse={1} />)
    const chevrons = container.querySelectorAll('.jer-collapse-icon')
    expect(chevrons).toHaveLength(2)
    expect(chevrons[0]).not.toHaveClass('jer-rotate-90') // root open
    expect(chevrons[1]).toHaveClass('jer-rotate-90') // nested collapsed
  })

  test('collapse={true} does not mount descendants of collapsed nodes (initial-load perf)', () => {
    // Children of a collapsed CollectionNode are gated by
    // `hasBeenOpened.current` and not rendered at all (not just CSS-hidden).
    // This is what makes initial load snappy on large data sets — a
    // deeply-nested tree with `collapse=true` only mounts the root.
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
    expect(chevrons[0]).not.toHaveClass('jer-rotate-90') // root — level 0
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
    // `[collapseFilter]` reassigns
    // `hasBeenOpened.current = !shouldBeCollapsed`, which gates child
    // rendering).
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
    // The displayed value carries quotes (`"hello"`); the edit input carries
    // the raw value
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

  test('typing into a number editor keeps the numeric input (no mid-edit flip to a textarea)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(<JsonEditor data={{ count: 42 }} setData={setData} />)

    await user.dblClick(screen.getByText('42'))
    expect(container.querySelector('input.jer-input-number')).not.toBeNull()
    expect(container.querySelector('textarea.jer-input-text')).toBeNull()

    // A number's edit buffer is a string mid-keystroke ("-", "1."), so the
    // rendered editor must follow the edit *type*, not the buffer value's
    // runtime type. If it followed the buffer it would flip to the string
    // textarea on the first character — and that freshly-mounted textarea
    // re-selects its content on focus, swallowing the character just typed.
    const input = container.querySelector('input.jer-input-number') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '123')
    expect(container.querySelector('input.jer-input-number')).not.toBeNull()
    expect(container.querySelector('textarea.jer-input-text')).toBeNull()
    expect((container.querySelector('input.jer-input-number') as HTMLInputElement).value).toBe('123')

    await user.keyboard('{Enter}')
    expect(setData).toHaveBeenCalledWith({ count: 123 })
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

  test('starting an edit on a second node commits the first (changed) edit', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ a: 'one', b: 'two' }} setData={setData} />)

    // Open edit on 'a' and change it (no Enter/Tab).
    await user.dblClick(screen.getByText('"one"'))
    const firstInput = screen.getByRole('textbox') as HTMLTextAreaElement
    await user.clear(firstInput)
    await user.type(firstInput, 'committed-on-switch')

    // Displacing by double-clicking the second value commits 'a' (like Tab),
    // then opens 'b'.
    await user.dblClick(screen.getByText('"two"'))

    // The changed edit on 'a' committed...
    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ a: 'committed-on-switch', b: 'two' })

    // ...and exactly one input is open — the second value (not a leaked first
    // one).
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(1)
    expect((inputs[0] as HTMLTextAreaElement).value).toBe('two')
  })

  test('clicking the OK icon confirms the edit (same as pressing Enter)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi')

    // The controls are real buttons now, so query by accessible role + name
    const okBtn = screen.getByRole('button', { name: 'OK' })
    await user.click(okBtn)

    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ greeting: 'hi' })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('clicking the Cancel icon discards the edit (same as pressing Escape)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'discard-me')

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelBtn)

    expect(setData).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  // The clickable controls are real <button>s (not <div onClick>) so assistive
  // tech announces them as actionable and labels them. They carry tabIndex={-1}
  // to stay out of the editor's field-to-field Tab flow (Enter/Escape on the
  // field itself drive confirm/cancel).
  test('confirm/cancel controls are labelled <button>s kept out of the Tab order', async () => {
    const user = userEvent.setup()
    const { container } = render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} />)

    await user.dblClick(screen.getByText('"hello"'))

    const confirmButtons = container.querySelectorAll('.jer-confirm-buttons > button')
    expect(confirmButtons).toHaveLength(2)
    confirmButtons.forEach((btn) => {
      expect(btn.tagName).toBe('BUTTON')
      expect(btn).toHaveAttribute('type', 'button')
      expect(btn).toHaveAttribute('tabindex', '-1')
    })
    expect(confirmButtons[0]).toHaveAttribute('aria-label', 'OK')
    expect(confirmButtons[1]).toHaveAttribute('aria-label', 'Cancel')
    // No visible tooltip by default (showIconTooltips is off)
    expect(confirmButtons[0]).toHaveAttribute('title', '')
    expect(confirmButtons[1]).toHaveAttribute('title', '')
  })

  // Regression: the confirm/cancel buttons must honour `showIconTooltips` the
  // same way the edit icons do — the `title` (visible browser tooltip), gated
  // on the prop, is separate from the always-present `aria-label`.
  test('confirm/cancel buttons show a title tooltip when showIconTooltips is enabled', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <JsonEditor data={{ greeting: 'hello' }} setData={noop} showIconTooltips />
    )

    await user.dblClick(screen.getByText('"hello"'))

    const confirmButtons = container.querySelectorAll('.jer-confirm-buttons > button')
    expect(confirmButtons[0]).toHaveAttribute('title', 'OK')
    expect(confirmButtons[1]).toHaveAttribute('title', 'Cancel')
  })

  test('edit/delete icon controls are labelled <button>s kept out of the Tab order', () => {
    const { container } = render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} />)

    const editButton = container.querySelector('[aria-label="Edit"]') as HTMLElement
    const deleteButton = container.querySelector('[aria-label="Delete"]') as HTMLElement
    ;[editButton, deleteButton].forEach((btn) => {
      expect(btn).not.toBeNull()
      expect(btn.tagName).toBe('BUTTON')
      expect(btn).toHaveAttribute('type', 'button')
      expect(btn).toHaveAttribute('tabindex', '-1')
    })
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
      <JsonEditor data={{ outer: { inner: 'hello' } }} setData={noop} allowDrag={true} />
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

  test('allowDrag defaults to false — nodes are not draggable without it', () => {
    const { container } = render(
      <JsonEditor data={{ outer: { inner: 'hello' } }} setData={noop} />
    )
    const leaf = container.querySelector('.jer-value-component') as HTMLElement
    expect(leaf).toHaveAttribute('draggable', 'false')
  })

  // Regression: dropping a collection onto a node INSIDE itself fired a `move`
  // that deleted the source then re-created it under its own key via
  // `createNew` — nesting the collection inside a copy of itself ({ outer: {
  // outer: … } }). `onDragEnter` already refused to highlight a self/descendant
  // target, but `handleDrop` didn't re-check, so a drop still committed the
  // corrupting move.
  test('dropping a collection onto its own descendant is a no-op, not a self-nest', () => {
    const setData = jest.fn()
    render(
      <JsonEditor data={{ outer: { inner: 'hello' }, sibling: 1 }} setData={setData} allowDrag />
    )

    const outerRow = screen.getByText('outer').closest('.jer-component') as HTMLElement
    const innerRow = screen.getByText('"hello"').closest('.jer-component') as HTMLElement

    // Grab `outer` (the mousedown arms the drag — a bare dragstart is rejected
    // as a phantom), then drop it onto its own child `inner`.
    fireEvent.mouseDown(outerRow)
    fireEvent.dragStart(outerRow)
    fireEvent.drop(innerRow)

    // A node can't be moved inside itself — the drop must be rejected outright,
    // leaving the document untouched (no self-nesting move committed).
    expect(setData).not.toHaveBeenCalled()
  })

  // Regression: an open edit whose node then UNMOUNTS — e.g. the consumer swaps
  // the entire `data` out from under it, so the edited path no longer exists —
  // must not wedge editing. The session stays `active` pointing at the vanished
  // path until the next editing action; previously that next `open()` threw
  // while building `NodeData` for the gone path to fire `cancelEdit` (only with
  // an `onEditEvent` consumer), so NO further node could ever be edited. A
  // search-filtered node keeps editing alive because it only renders `null`
  // (stays mounted, path survives) — this covers the true-unmount case.
  test('editing still works after the edited node unmounts (dataset swap)', async () => {
    const user = userEvent.setup()
    const Harness = () => {
      const [data, setData] = useState<JsonData>({ greeting: 'hello' })
      return (
        <>
          <button onClick={() => setData({ farewell: 'goodbye' })}>swap</button>
          {/* `onEditEvent` is what triggered the wedge: the displaced
              session's `cancelEdit` built NodeData from the now-gone path. */}
          <JsonEditor data={data} setData={setData} onEditEvent={noop} />
        </>
      )
    }
    render(<Harness />)

    // Open an edit on the original node.
    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    // Swap the whole dataset — the edited node ('greeting') unmounts.
    await user.click(screen.getByText('swap'))
    // The session belonged to a node that's gone, so no editor should linger.
    expect(screen.queryByRole('textbox')).toBeNull()

    // The store must not be wedged: a node in the NEW dataset still edits.
    await user.dblClick(screen.getByText('"goodbye"'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  // Regression: when a consumer `onChange` TRANSFORMS the typed value (here it
  // strips characters that aren't letters/spaces), React rewrites the
  // controlled textarea to the transformed string, which natively drops the
  // caret at the end. Editing mid-string — with a pre-existing illegal char
  // that gets stripped on the first keystroke — must keep the caret beside the
  // just-typed character, not fling it to the end.
  test('caret stays put when onChange transforms the value mid-edit (no jump to end)', async () => {
    const user = userEvent.setup()
    const onChange: OnChangeFunction = ({ newValue }) =>
      (newValue as string).replace(/[^a-zA-Z\s]/g, '')
    render(<JsonEditor data={{ name: 'Mrs. Dennis Schulist' }} setData={noop} onChange={onChange} />)

    await user.dblClick(screen.getByText('"Mrs. Dennis Schulist"'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('Mrs. Dennis Schulist')

    // Place the caret inside "Den|nis" (index 8) and type 'x'. The keystroke
    // yields "Mrs. Denxnis Schulist" (caret 9); the consumer strips the
    // pre-existing '.', so the committed value loses a char BEFORE the caret.
    await user.type(textarea, 'x', { initialSelectionStart: 8, initialSelectionEnd: 8 })

    expect(textarea.value).toBe('Mrs Denxnis Schulist')
    // Caret lands right after the typed 'x' (index 8), NOT at the end (20).
    expect(textarea.selectionStart).toBe(8)
    expect(textarea.selectionStart).not.toBe(textarea.value.length)
  })
})

describe('JsonEditor — structural mutations', () => {
  test('deleting a property removes it from setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ x: 'hi', y: 'bye' }} setData={setData} showIconTooltips />)

    // Scope to the 'x' row to pick the right delete button (multiple rows have
    // one)
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

    // Only one Add button on the page (root array) — arrays don't prompt for a
    // key
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
    // A new-key input appears; it's pre-populated with a default placeholder
    // key
    const newKeyInput = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    expect(newKeyInput).toBeInTheDocument()
    await user.clear(newKeyInput)
    await user.type(newKeyInput, 'fresh{Enter}')

    expect(setData).toHaveBeenCalledTimes(1)
    // New property takes the default value (null) — that's the editor's
    // contract for fresh keys
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
    const { container } = render(<JsonEditor data={{ x: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    // The type selector is a native <select>, role=combobox
    const typeSelect = screen.getByRole('combobox') as HTMLSelectElement
    await user.selectOptions(typeSelect, 'number')

    // Primitive ↔ primitive type change is LOCAL — the buffer coerces but
    // nothing commits until the real submit (a single commit, not one per type
    // toggle).
    expect(setData).not.toHaveBeenCalled()

    // Commit (OK button) writes the converted default. 'hello' → number is NaN,
    // which the editor falls back to 0. .jer-confirm-buttons holds [OK,
    // Cancel].
    await user.click(container.querySelectorAll('.jer-confirm-buttons > button')[0])
    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ x: 0 })
  })

  test('switching the value type renders the matching input, not the committed type', async () => {
    const user = userEvent.setup()
    const { container } = render(<JsonEditor data={{ x: 'hello' }} setData={noop} />)
    const typeSelect = () => container.querySelector('select[name="x-type-select"]') as HTMLSelectElement

    await user.dblClick(screen.getByText('"hello"'))
    // String value → the string textarea editor.
    expect(container.querySelector('textarea.jer-input-text')).not.toBeNull()

    // → number: the numeric input replaces the string textarea (the local type
    // change coerces the buffer; the input must follow the buffer, not `data`).
    await user.selectOptions(typeSelect(), 'number')
    expect(container.querySelector('input.jer-input-number')).not.toBeNull()
    expect(container.querySelector('textarea.jer-input-text')).toBeNull()

    // → boolean: the checkbox input.
    await user.selectOptions(typeSelect(), 'boolean')
    expect(container.querySelector('input.jer-input-boolean')).not.toBeNull()
    expect(container.querySelector('input.jer-input-number')).toBeNull()

    // → back to string: the textarea returns (regression — it used to stay
    // stuck on the committed type's input, e.g. a numeric input for a string
    // value).
    await user.selectOptions(typeSelect(), 'string')
    expect(container.querySelector('textarea.jer-input-text')).not.toBeNull()
    expect(container.querySelector('input.jer-input-boolean')).toBeNull()
  })

  test('changing type null → string pre-fills an empty editor, not the literal "null"', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(<JsonEditor data={{ x: null }} setData={setData} />)

    await user.dblClick(screen.getByText('null'))
    await user.selectOptions(screen.getByRole('combobox'), 'string')

    // A null source has no string representation worth editing — the buffer
    // must be empty, not String(null).
    const input = container.querySelector('textarea.jer-input-text') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('')

    await user.type(input, 'typed{Enter}')
    expect(setData).toHaveBeenCalledWith({ x: 'typed' })
  })

  test('changing the type to null commits immediately and closes the editor', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(<JsonEditor data={{ x: 'hello' }} setData={setData} />)

    await user.dblClick(screen.getByText('"hello"'))
    await user.selectOptions(container.querySelector('select[name="x-type-select"]') as HTMLSelectElement, 'null')

    // `null` has no value to edit, so selecting it commits straight away — no
    // OK/Enter needed — and the editor closes (the type selector disappears).
    expect(setData).toHaveBeenCalledWith({ x: null })
    expect(container.querySelector('select[name="x-type-select"]')).toBeNull()
  })

  test('changing the type to object commits a collection immediately and re-renders as one', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    // Controlled, so `x` actually becomes an object and re-renders as a
    // collection.
    const Controlled = () => {
      const [data, setLocal] = useState<JsonData>({ x: 'hello' })
      return (
        <JsonEditor
          data={data}
          setData={(d) => {
            setData(d)
            setLocal(d)
          }}
        />
      )
    }
    const { container } = render(<Controlled />)

    await user.dblClick(screen.getByText('"hello"'))
    await user.selectOptions(
      container.querySelector('select[name="x-type-select"]') as HTMLSelectElement,
      'object'
    )

    // Like `null`, a to-collection change commits straight away (no OK/Enter)
    // with the converted default ({ [DEFAULT_NEW_KEY]: value }) and closes the
    // editor — so `handleEdit` never sees an 'object' dataType.
    expect(setData).toHaveBeenCalledWith({ x: { key: 'hello' } })
    expect(container.querySelector('select[name="x-type-select"]')).toBeNull()

    // `x` now renders as a collection: the new child key appears (it had no key
    // as a string value node), proving the value re-rendered through
    // CollectionNode.
    expect(await screen.findByText('key')).toBeInTheDocument()
  })

  test('changing the type to array commits a collection immediately and re-renders as one', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const Controlled = () => {
      const [data, setLocal] = useState<JsonData>({ x: 'hello' })
      return (
        <JsonEditor
          data={data}
          setData={(d) => {
            setData(d)
            setLocal(d)
          }}
        />
      )
    }
    const { container } = render(<Controlled />)

    await user.dblClick(screen.getByText('"hello"'))
    await user.selectOptions(
      container.querySelector('select[name="x-type-select"]') as HTMLSelectElement,
      'array'
    )

    // To-array wraps the value ([value]) and commits + closes, same as
    // object/null — `handleEdit` never sees an 'array' dataType.
    expect(setData).toHaveBeenCalledWith({ x: ['hello'] })
    expect(container.querySelector('select[name="x-type-select"]')).toBeNull()

    // `x` now renders as an array collection: a square open-bracket appears
    // (the root object only contributes a `{`), proving it re-rendered as a
    // collection.
    await waitFor(() => {
      const openBrackets = Array.from(container.querySelectorAll('.jer-bracket-open')).map(
        (el) => el.textContent
      )
      expect(openBrackets).toContain('[')
    })
  })

  test('changing the type to object launches the new collection expanded, overriding a collapse level (#217)', async () => {
    const user = userEvent.setup()
    const Controlled = () => {
      const [data, setLocal] = useState<JsonData>({ x: 'hello' })
      return <JsonEditor data={data} setData={(d) => setLocal(d)} collapse={1} />
    }
    render(<Controlled />)

    await user.dblClick(screen.getByText('"hello"'))
    await user.selectOptions(screen.getByRole('combobox'), 'object')

    // The committed { key: 'hello' } collection at depth 1 would mount
    // collapsed under collapse={1}; the type-change broadcast expands it so
    // the just-created contents are immediately visible.
    expect(await screen.findByText('key')).toBeInTheDocument()
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
      expect.objectContaining({ event: 'delete', key: 'x', path: ['x'], newData: { y: 'bye' } }),
      expect.anything()
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
      }),
      expect.anything()
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
      }),
      expect.anything()
    )
  })

  // Move arrives as `event: 'move'` with `newPath` + the source-path NodeData,
  // but exercising it needs a full drag-drop simulation — deferred with the
  // rest of the DnD test gap (#270).
  test.todo('onUpdate receives event:"move" on a drag-drop (needs DnD simulation — #270)')
})

describe('JsonEditor — §17 onEditEvent lifecycle stream', () => {
  // A session ends in confirm* (committed) or cancel* (closed without a
  // commit).
  test('value edit: startEdit → confirmEdit on a real change', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onEditEvent={onEditEvent} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'world{Enter}')

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'submitEdit', 'commitEdit'])
  })

  test('value edit: startEdit → commitEdit on a no-op confirm (no change)', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onEditEvent={onEditEvent} />)

    await user.dblClick(screen.getByText('"hello"'))
    // Confirm without changing anything — a no-op commit (§5): commitEdit, no
    // update*.
    await user.type(screen.getByRole('textbox'), '{Enter}')

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'submitEdit', 'commitEdit'])
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
    expect(seq).toEqual(['startRename', 'submitRename', 'commitRename'])
    const commit = onEditEvent.mock.calls.map(([e]) => e)[2]
    expect(commit).toMatchObject({
      event: 'commitRename',
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
    expect(onEditEvent.mock.calls.map(([e]) => e.event)).toEqual(['startAdd', 'submitAdd', 'commitAdd'])

    // Open + cancel
    onEditEvent.mockClear()
    await user.click(screen.getByTitle('Add'))
    const reopened = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    await user.type(reopened, '{Escape}')
    expect(onEditEvent.mock.calls.map(([e]) => e.event)).toEqual(['startAdd', 'cancelAdd'])
  })

  test('add (object): a rejected confirm commits optimistically then reverts with updateError', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    const onUpdate = jest.fn(() => false as const)
    const { container } = render(
      <JsonEditor
        data={{ existing: 'value' }}
        setData={noop}
        onUpdate={onUpdate}
        onEditEvent={onEditEvent}
        showIconTooltips
      />
    )

    await user.click(screen.getByTitle('Add'))
    const newKeyInput = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    await user.clear(newKeyInput)
    await user.type(newKeyInput, 'fresh{Enter}')

    // Optimistic add (§ new model): the session commits (commitAdd), then the
    // rejected settlement reverts the node and reports updateError.
    await waitFor(() =>
      expect(onEditEvent.mock.calls.map(([e]) => e.event)).toEqual([
        'startAdd',
        'submitAdd',
        'commitAdd',
        'updateError',
      ])
    )
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

    // No onUpdate, so the commit applies synchronously: startEdit(a),
    // submitEdit(a), commitEdit(a) → open(b) → startEdit(b). Load-bearing: a
    // commitEdit fired and there's NO stray cancelEdit (which would mean a
    // stale revert clobbered the just-committed value).
    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toContain('commitEdit')
    expect(seq.filter((e) => e === 'startEdit')).toHaveLength(2)
    expect(seq).not.toContain('cancelEdit')
  })

  test('node-switch commits the displaced (changed) session before startEdit for the new one', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(
      <JsonEditor data={{ a: 'first', b: 'second' }} setData={noop} onEditEvent={onEditEvent} />
    )

    // Open edit on `a`, then click Edit on `b` while `a` is still active.
    await user.dblClick(screen.getByText('"first"'))
    // Typed-but-uncommitted change on `a`. Displacing commits it (like Tab),
    // not cancels it.
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'edited-a')
    await user.dblClick(screen.getByText('"second"'))

    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'submitEdit', 'commitEdit', 'startEdit'])
    expect(onEditEvent.mock.calls[0][0]).toMatchObject({ event: 'startEdit', key: 'a' })
    expect(onEditEvent.mock.calls[2][0]).toMatchObject({ event: 'commitEdit', key: 'a' })
    expect(onEditEvent.mock.calls[3][0]).toMatchObject({ event: 'startEdit', key: 'b' })
  })

  test('editorRef.cancel fires cancelEdit and clears the local edit buffer', async () => {
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
      ref.current!.cancel()
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

describe('JsonEditor — commit-on-displace (clicking another node while editing)', () => {
  // Displacing an open edit by opening another node behaves like Tab: a changed
  // edit commits, an unchanged one closes via commit* (no setData), and an
  // edit that can't commit blocks the switch and stays open with its error.
  // The object-add session is the one exception — it cancels (you can't Tab out
  // of a new-key edit either).

  test('displacing an UNCHANGED value edit commits quietly (no setData) and opens the new node', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(<JsonEditor data={{ a: 'one', b: 'two' }} setData={setData} onEditEvent={onEditEvent} />)

    await user.dblClick(screen.getByText('"one"'))
    // No change to the buffer, then displace.
    await user.dblClick(screen.getByText('"two"'))

    // No mutation, but the session closed via commit (not cancel), and 'b'
    // opened.
    expect(setData).not.toHaveBeenCalled()
    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit', 'submitEdit', 'commitEdit', 'startEdit'])
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(1)
    expect((inputs[0] as HTMLTextAreaElement).value).toBe('two')
  })

  test('displacing a collection edit with INVALID JSON is blocked: editor stays open with its error, new node not opened', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    const { container } = render(
      <JsonEditor
        data={{ obj: { x: 1 }, other: 'val' }}
        setData={setData}
        onEditEvent={onEditEvent}
        showIconTooltips
      />
    )

    // Open the raw-JSON editor on the `obj` collection (its header Edit pencil
    // is the first within its component subtree).
    const objComponent = screen.getByText('obj').closest('.jer-component') as HTMLElement
    await user.click(objComponent.querySelector('[title="Edit"]') as HTMLElement)
    const textarea = container.querySelector('textarea.jer-collection-text-area') as HTMLTextAreaElement
    await user.clear(textarea)
    await user.type(textarea, 'abc') // not valid JSON

    // Attempt to displace onto another node — blocked by the parse failure.
    await user.dblClick(screen.getByText('"val"'))

    expect(setData).not.toHaveBeenCalled()
    // The collection editor is still the only open input, preserving the bad
    // text, with its error shown; 'other' did not open.
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(1)
    expect((inputs[0] as HTMLTextAreaElement).value).toBe('abc')
    expect(container.querySelector('.jer-error-slug')).toHaveTextContent('Invalid JSON')
    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startEdit']) // no commit, no startEdit for 'other'
  })

  test('displacing a key rename (changed) commits the rename, then opens the new node', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(
      <JsonEditor data={{ oldName: 1, other: 99 }} setData={setData} onEditEvent={onEditEvent} />
    )

    await user.dblClick(screen.getByText('oldName'))
    const keyInput = screen.getByDisplayValue('oldName') as HTMLInputElement
    await user.clear(keyInput)
    await user.type(keyInput, 'newName')

    // Displace by double-clicking another node's value.
    await user.dblClick(screen.getByText('99'))

    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith({ newName: 1, other: 99 })
    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startRename', 'submitRename', 'commitRename', 'startEdit'])
  })

  test('displacing an UNCHANGED key rename fires commitRename (no setData) and opens the new node', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(
      <JsonEditor data={{ oldName: 1, other: 99 }} setData={setData} onEditEvent={onEditEvent} />
    )

    await user.dblClick(screen.getByText('oldName'))
    // No change to the key, then displace.
    await user.dblClick(screen.getByText('99'))

    expect(setData).not.toHaveBeenCalled()
    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startRename', 'submitRename', 'commitRename', 'startEdit'])
  })

  test('displacing a key rename to a DUPLICATE key is blocked — rename stays open with error, new node not opened', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ a: 1, oldName: 2, other: 3 }} setData={setData} />
    )

    await user.dblClick(screen.getByText('oldName'))
    const keyInput = screen.getByDisplayValue('oldName') as HTMLInputElement
    await user.clear(keyInput)
    await user.type(keyInput, 'a') // 'a' already exists

    await user.dblClick(screen.getByText('3')) // try to displace onto 'other'

    expect(setData).not.toHaveBeenCalled()
    // The rename input is still open showing 'a', the error renders, and
    // 'other' did not open.
    expect(screen.getByDisplayValue('a')).toBeInTheDocument()
    expect(container.querySelector('.jer-error-slug')).toHaveTextContent('Key already exists')
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('displacing an object add session cancels the add (no commit) and opens the new node', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    const { container } = render(
      <JsonEditor data={{ existing: 'value' }} setData={setData} onEditEvent={onEditEvent} showIconTooltips />
    )

    await user.click(screen.getByTitle('Add'))
    const newKeyInput = container.querySelector('input.jer-input-new-key') as HTMLInputElement
    await user.clear(newKeyInput)
    await user.type(newKeyInput, 'wip')

    // Displace by double-clicking the existing value.
    await user.dblClick(screen.getByText('"value"'))

    expect(setData).not.toHaveBeenCalled()
    const seq = onEditEvent.mock.calls.map(([e]) => e.event)
    expect(seq).toEqual(['startAdd', 'cancelAdd', 'startEdit'])
  })
})

describe('JsonEditor — optimistic commit + gate (v2 editing model)', () => {
  test('hold() keeps the editor open and blocks the tree until release(), then commits', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    const deferred = makeDeferred()
    let release: (() => void) | undefined
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(
      (_props, control) => {
        release = control.hold()
        return deferred.promise as ReturnType<UpdateFunction>
      }
    )
    render(
      <JsonEditor
        data={{ a: 'one', b: 'two' }}
        setData={noop}
        onUpdate={onUpdate}
        onEditEvent={onEditEvent}
      />
    )

    await user.dblClick(screen.getByText('"one"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'changed{Enter}')

    // Submitted but HELD: the editor stays open, the stream has reached
    // submitEdit (not commitEdit), and `onUpdate` ran with the attempted value.
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(onEditEvent.mock.calls.map(([e]) => e.event)).toEqual(['startEdit', 'submitEdit'])

    // The gate blocks the tree — a dblClick on another node can't open it.
    await user.dblClick(screen.getByText('"two"'))
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('changed')

    // Releasing applies + closes (commitEdit); the background settlement then
    // resolves successfully (updateSuccess).
    act(() => release?.())
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
    await act(async () => {
      deferred.resolve(true)
    })
    expect(onEditEvent.mock.calls.map(([e]) => e.event)).toEqual([
      'startEdit',
      'submitEdit',
      'commitEdit',
      'updateSuccess',
    ])
  })

  test('concurrent optimistic commits: a late failure reverts only its own node (per-commit token)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const deferreds: Array<ReturnType<typeof makeDeferred>> = []
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(() => {
      const d = makeDeferred()
      deferreds.push(d)
      return d.promise as ReturnType<UpdateFunction>
    })
    render(<JsonEditor data={{ a: 'one', b: 'two' }} setData={setData} onUpdate={onUpdate} />)

    // Edit 'a' → 'A', Tab to 'b' (commit-a optimistic + pending).
    await user.dblClick(screen.getByText('"one"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'A{Tab}')

    // Edit 'b' → 'B', Enter (commit-b optimistic + pending, on top of a='A').
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'B{Enter}')

    expect(onUpdate).toHaveBeenCalledTimes(2)
    expect(setData).toHaveBeenNthCalledWith(1, { a: 'A', b: 'two' })
    expect(setData).toHaveBeenNthCalledWith(2, { a: 'A', b: 'B' })

    // commit-a fails late while commit-b succeeds. The revert of 'a' reads the
    // LIVE doc (already carrying b='B') and resets ONLY 'a' — b is untouched.
    await act(async () => {
      deferreds[0].resolve(false)
      deferreds[1].resolve(true)
    })

    await waitFor(() => expect(setData).toHaveBeenLastCalledWith({ a: 'one', b: 'B' }))
  })

  test('re-editing a node during settlement: a stale failure does not clobber the reopened buffer', async () => {
    const user = userEvent.setup()
    const deferred = makeDeferred()
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(
      () => deferred.promise as ReturnType<UpdateFunction>
    )
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} onUpdate={onUpdate} />)

    // Commit-1 of 'x' → 'first' (optimistic + pending).
    await user.dblClick(screen.getByText('"hello"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'first{Enter}')

    // Reopen 'x' and type a new value while commit-1 is still settling.
    await user.dblClick(screen.getByText('"first"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'second')

    // commit-1 now fails. Because the user is actively re-editing 'x', the
    // stale rejection must NOT revert the open buffer — it stays 'second'.
    await act(async () => {
      deferred.resolve(false)
    })

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('second')
  })

  test('hold() on a delete defers the removal until release()', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    const deferred = makeDeferred()
    let release: (() => void) | undefined
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(
      (_props, control) => {
        release = control.hold()
        return deferred.promise as ReturnType<UpdateFunction>
      }
    )
    render(
      <JsonEditor
        data={{ x: 'hi', y: 'bye' }}
        setData={setData}
        onUpdate={onUpdate}
        onEditEvent={onEditEvent}
        showIconTooltips
      />
    )

    const xRow = screen.getByText('"hi"').closest('.jer-component') as HTMLElement
    await user.click(xRow.querySelector('[title="Delete"]') as HTMLElement)

    // Gated: the delete hasn't applied (no setData) and no 'delete' event yet.
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(setData).not.toHaveBeenCalled()
    expect(onEditEvent).not.toHaveBeenCalled()

    // Release applies the removal and fires 'delete'.
    act(() => release?.())
    expect(setData).toHaveBeenCalledWith({ y: 'bye' })

    // The background settlement then resolves successfully.
    await act(async () => {
      deferred.resolve(true)
    })
    expect(onEditEvent.mock.calls.map(([e]) => e.event)).toEqual(['delete', 'updateSuccess'])
  })

  test('a synchronously rejected delete shows the error in place and never touches external state', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(() => false as const)
    // Controlled, so an optimistic removal would actually unmount the node (as
    // in a real app) — the regression this guards against.
    const Controlled = () => {
      const [data, setLocal] = useState<Record<string, number>>({ a: 1, b: 2, c: 3 })
      return (
        <JsonEditor
          data={data}
          setData={(d) => {
            setData(d)
            setLocal(d as Record<string, number>)
          }}
          onUpdate={onUpdate}
          showIconTooltips
        />
      )
    }
    render(<Controlled />)

    const bRow = screen.getByText('2').closest('.jer-component') as HTMLElement
    await user.click(bRow.querySelector('[title="Delete"]') as HTMLElement)

    // Sync validation rejects before the optimistic-apply timer fires, so the
    // node is never removed: the inline error renders on it (V1-like) and
    // external state is untouched — no optimistic remove + revert churn.
    await waitFor(() => expect(screen.getByText('Delete unsuccessful')).toBeInTheDocument())
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(setData).not.toHaveBeenCalled()
  })

  test('a rejected SLOW delete restores the removed key to its original position, not the end', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const deferred = makeDeferred()
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(
      // Pending past the optimistic-apply timer.
      () => deferred.promise as ReturnType<UpdateFunction>
    )
    render(
      <JsonEditor data={{ a: 1, b: 2, c: 3 }} setData={setData} onUpdate={onUpdate} showIconTooltips />
    )

    // Delete the MIDDLE key 'b'. The slow onUpdate hasn't settled, so it
    // applies optimistically once the timer fires (b removed).
    const bRow = screen.getByText('2').closest('.jer-component') as HTMLElement
    await user.click(bRow.querySelector('[title="Delete"]') as HTMLElement)
    await waitFor(() => expect(setData).toHaveBeenLastCalledWith({ a: 1, c: 3 }))

    // Now it rejects: the revert must put 'b' back in its original slot, so key
    // order stays ['a','b','c'] — not append it to the end (['a','c','b']).
    await act(async () => {
      deferred.resolve(false)
    })
    await waitFor(() => {
      const last = setData.mock.calls[setData.mock.calls.length - 1][0] as Record<string, unknown>
      expect(Object.keys(last)).toEqual(['a', 'b', 'c'])
    })
  })
})

describe('JsonEditor — restrictions and callbacks', () => {
  test('allowEdit={false} hides the edit button and blocks dblClick', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} allowEdit={false} showIconTooltips />)

    expect(screen.queryByTitle('Edit')).toBeNull()
    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(setData).not.toHaveBeenCalled()
  })

  test('allowDelete={false} hides the delete button', () => {
    render(<JsonEditor data={{ x: 'hello' }} setData={noop} allowDelete={false} showIconTooltips />)
    expect(screen.queryByTitle('Delete')).toBeNull()
  })

  test('allowAdd={false} hides the add button', () => {
    render(
      <JsonEditor data={{ existing: 'value' }} setData={noop} allowAdd={false} showIconTooltips />
    )
    expect(screen.queryByTitle('Add')).toBeNull()
  })

  test('onUpdate returning false reverts the display and shows an error', async () => {
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
    // Optimistic model: the edit applies immediately, then the rejection
    // reverts it — so the LAST write restores the original and external state
    // nets out unchanged. (The per-commit token ensures a late rejection
    // reverts only its own node, never clobbering a newer commit that landed
    // while it was settling.)
    expect(setData).toHaveBeenLastCalledWith({ x: 'hello' })
    // The node reverts its own display, and the default error shows.
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

  test('onUpdate returning false on a rename shows the rename-specific message and code', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => false as const)
    const onError = jest.fn()
    render(
      <JsonEditor data={{ oldName: 2 }} setData={noop} onUpdate={onUpdate} onError={onError} />
    )

    await user.dblClick(screen.getByText('oldName'))
    const keyInput = screen.getByDisplayValue('oldName') as HTMLInputElement
    await user.clear(keyInput)
    await user.type(keyInput, 'newName{Enter}')

    // Event-specific message...
    expect(screen.getByText('Rename unsuccessful')).toBeInTheDocument()
    // ...matching the RENAME_ERROR code routed to onError
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'RENAME_ERROR' }) })
    )
  })

  // A rejected move would surface 'Move unsuccessful' (code MOVE_ERROR), but
  // exercising it needs a full drag-drop simulation — deferred with the rest of
  // the DnD test gap (#270), like the move happy-path above.
  test.todo('onUpdate returning false on a move shows the move-specific message (needs DnD — #270)')

  test('a rejected to-enum type change reverts the type selector (not stuck on the enum)', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn(() => false as const)
    const { container } = render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={noop}
        onUpdate={onUpdate}
        allowTypeSelection={['string', { enum: 'Color', values: ['red', 'green', 'blue'] }]}
      />
    )
    const typeSelect = () => container.querySelector('select[name="x-type-select"]') as HTMLSelectElement

    // Enter edit mode on the value — the type <select> appears
    await user.dblClick(screen.getByText('"hello"'))
    expect(typeSelect().value).toBe('string')

    // Switching to the enum is LOCAL: the buffer coerces to the first valid
    // option ('red') and the editor stays open — no commit attempted yet.
    await user.selectOptions(typeSelect(), 'Color')
    expect(onUpdate).not.toHaveBeenCalled()
    expect(typeSelect().value).toBe('Color')

    // Committing (the OK button) submits the coerced value, which onUpdate
    // rejects. .jer-confirm-buttons holds [OK, Cancel] in DOM order.
    await user.click(container.querySelectorAll('.jer-confirm-buttons > button')[0])
    expect(onUpdate).toHaveBeenCalled()

    // The rejection reverts the value and closes the edit session.
    await waitFor(() => expect(container.querySelector('select[name="x-type-select"]')).toBeNull())
    expect(screen.getByText('"hello"')).toBeInTheDocument()

    // Re-open editing: the type selector must reflect the reverted value
    // (`string`), not stay stuck on the enum it was synchronously set to.
    await user.dblClick(screen.getByText('"hello"'))
    expect(typeSelect().value).toBe('string')
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

  test('onUpdate returning { error: JerError } surfaces the message', async () => {
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

    // An empty error string is a rejection, not a silent success: the
    // optimistic apply is reverted (last write restores the original), the
    // display reverts, and onError fires (with the empty message).
    expect(setData).toHaveBeenLastCalledWith({ x: 'hello' })
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

    // The user's typed value is applied optimistically, then the override wins:
    // the last write is the override (`{ value }` replaces the whole document).
    await waitFor(() => expect(setData).toHaveBeenLastCalledWith({ x: 'OVERRIDDEN' }))
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
    // Silent abort after an optimistic apply: the last write reverts to the
    // original (net no change)...
    expect(setData).toHaveBeenLastCalledWith({ x: 'hello' })
    // ...no error message...
    expect(screen.queryByText('Update unsuccessful')).toBeNull()
    // ...and the input reverts to the original (not the typed-but-cancelled
    // value)
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
      }),
      expect.anything()
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

  test('async onUpdate resolving with false reverts the display and shows an error', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(async () => false as const)
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi{Enter}')

    // Optimistic apply, then the async rejection reverts — the last write
    // restores the original (the per-commit token prevents a slow rejection
    // from clobbering a newer commit that landed while it was in flight).
    await waitFor(() => expect(setData).toHaveBeenLastCalledWith({ x: 'hello' }))
    expect(screen.getByText('"hello"')).toBeInTheDocument()
    expect(screen.getByText('Update unsuccessful')).toBeInTheDocument()
  })

  test('async onUpdate that rejects should revert and show an error (#271)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(async () => {
      throw new Error('boom')
    })
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi{Enter}')

    // The error message is surfaced ONLY if the rejection was caught and routed
    // to onError; a leaked rejection would skip it. So this assertion is itself
    // the leak guard that #271 is about — if the try/catch in `runUpdate` goes
    // away, the slug never renders and this fails.
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
    // Optimistic apply is reverted: the last write restores the original.
    expect(setData).toHaveBeenLastCalledWith({ x: 'hello' })
    expect(screen.getByText('"hello"')).toBeInTheDocument()
    expect(screen.queryByText('"hi"')).toBeNull()
  })

  test('async onUpdate that rejects with a plain string surfaces that string (#271)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(async () => {
      throw 'plain string error'
    })
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi{Enter}')

    // A bare-string rejection is surfaced verbatim (the `typeof err ===
    // 'string'` catch branch), same as a `{ error: string }` resolve.
    await waitFor(() => expect(screen.getByText('plain string error')).toBeInTheDocument())
    expect(setData).toHaveBeenLastCalledWith({ x: 'hello' })
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  test('async onUpdate that rejects with no usable message shows the default error (#271)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(async () => {
      // Empty message: skips both the Error-message and string branches, so the
      // catch falls back to the event-specific localised default
      // (ERROR_UPDATE).
      throw new Error()
    })
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} onUpdate={onUpdate} />)

    await user.dblClick(screen.getByText('"hello"'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'hi{Enter}')

    await waitFor(() => expect(screen.getByText('Update unsuccessful')).toBeInTheDocument())
    expect(setData).toHaveBeenLastCalledWith({ x: 'hello' })
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  test('allowEdit as a function selectively allows/blocks per node', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(
      <JsonEditor
        data={{ readonly: 'cant', editable: 'can' }}
        setData={setData}
        allowEdit={({ key }) => key !== 'readonly'}
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

  test('allowDelete as a function selectively allows/blocks per node', () => {
    render(
      <JsonEditor
        data={{ keep: 'must', drop: 'can' }}
        setData={noop}
        allowDelete={({ key }) => key !== 'keep'}
        showIconTooltips
      />
    )

    const keepRow = screen.getByText('"must"').closest('.jer-component') as HTMLElement
    const dropRow = screen.getByText('"can"').closest('.jer-component') as HTMLElement

    expect(keepRow.querySelector('[title="Delete"]')).toBeNull()
    expect(dropRow.querySelector('[title="Delete"]')).not.toBeNull()
  })

  test('allowAdd as a function selectively allows/blocks per collection', () => {
    render(
      <JsonEditor
        data={{ closed: { a: 1 }, open: { b: 1 } }}
        setData={noop}
        allowAdd={({ key }) => key !== 'closed'}
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
        // Pass any non-empty searchText to activate filtering — the function
        // ignores it
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
    // Default matcher filters by VALUE, so the strings to query for are the
    // values.
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

      // Right after rerender — debounce hasn't fired, 'broccoli' is still
      // rendered
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

  test('showCollectionCount: renders "n of m" when search filters out some children', () => {
    // 5 items in the array, but only 2 contain 'apple'. Force the count to
    // be visible regardless of collapse state with showCollectionCount={true}.
    render(
      <JsonEditor
        data={{ items: ['apple-1', 'banana', 'apple-pie', 'cherry', 'plum'] }}
        setData={noop}
        searchText="apple"
        showCollectionCount
      />
    )
    expect(screen.getByText('2 of 5 items')).toBeInTheDocument()
  })

  test('customText.ITEMS_FILTERED can suppress the n-of-m form entirely', () => {
    // The documented escape hatch for "always show the total under search":
    // override ITEMS_FILTERED to return the same form ITEMS_MULTIPLE would.
    render(
      <JsonEditor
        data={{ items: ['apple-1', 'banana', 'apple-pie', 'cherry', 'plum'] }}
        setData={noop}
        searchText="apple"
        showCollectionCount
        customText={{
          ITEMS_FILTERED: ({ size }) => `${size} items`,
        }}
      />
    )
    expect(screen.getByText('5 items')).toBeInTheDocument()
    expect(screen.queryByText('2 of 5 items')).toBeNull()
  })

  test('"when-collapsed-or-filtered" surfaces the count on an open node under search', () => {
    // The default behaviour: even on an open collection (where the count
    // would normally hide), search activates the count display so n-of-m
    // is visible without forcing the user to collapse. The count element
    // is always in the DOM (for CSS fade transitions); visibility is the
    // .jer-visible / .jer-hidden class.
    render(
      <JsonEditor
        data={{ items: ['apple-1', 'banana', 'apple-pie', 'cherry', 'plum'] }}
        setData={noop}
        searchText="apple"
        // showCollectionCount left at default ('when-collapsed-or-filtered')
        collapse={false}
      />
    )
    const countEl = screen.getByText('2 of 5 items')
    expect(countEl).toHaveClass('jer-visible')
    expect(countEl).not.toHaveClass('jer-hidden')
  })

  test('"when-collapsed" suppresses the count on an open node, even under search', () => {
    // Opt-out of the filtered-aware default — counts only appear when the
    // collection is collapsed, regardless of search state.
    render(
      <JsonEditor
        data={{ items: ['apple-1', 'banana', 'apple-pie', 'cherry', 'plum'] }}
        setData={noop}
        searchText="apple"
        showCollectionCount="when-collapsed"
        collapse={false}
      />
    )
    const countEl = screen.getByText('2 of 5 items')
    expect(countEl).toHaveClass('jer-hidden')
    expect(countEl).not.toHaveClass('jer-visible')
  })

  test('"n of m" reverts to the simple total when search matches all children', () => {
    // Every child contains 'a' → visible === total → no "of" form.
    render(
      <JsonEditor
        data={{ items: ['apple', 'banana', 'avocado'] }}
        setData={noop}
        searchText="a"
        showCollectionCount
      />
    )
    expect(screen.getByText('3 items')).toBeInTheDocument()
    expect(screen.queryByText(/3 of 3 items/)).toBeNull()
  })

  test('"n of m" customText override receives both `size` and `visibleSize`', () => {
    render(
      <JsonEditor
        data={{ items: ['apple-1', 'banana', 'apple-pie', 'cherry', 'plum'] }}
        setData={noop}
        searchText="apple"
        showCollectionCount
        customText={{
          ITEMS_FILTERED: ({ size, visibleSize }) =>
            `[${visibleSize}/${size}] match`,
        }}
      />
    )
    expect(screen.getByText('[2/5] match')).toBeInTheDocument()
  })

  test('`visibleSize` reaches render-path callbacks: number on tracked collections, `null` on visible leaves', () => {
    // Locks in the D11 universal-exposure contract for callbacks that run
    // AFTER the visibility walk (allowEdit, theme functions, customText,
    // custom-node conditions, etc.). They see the `useCommon`-augmented
    // NodeData with `visibleSize` set.
    const seen = new Map<string, number | null | undefined>()
    render(
      <JsonEditor
        data={{ outer: { inner: ['apple-1', 'banana'] } }}
        setData={noop}
        searchText="apple"
        allowEdit={(nodeData) => {
          seen.set(nodeData.path.join('/') || 'ROOT', nodeData.visibleSize)
          return true
        }}
      />
    )
    // Tracked collections under an active filter: `visibleSize` is a number.
    expect(typeof seen.get('ROOT')).toBe('number')
    expect(typeof seen.get('outer')).toBe('number')
    expect(typeof seen.get('outer/inner')).toBe('number')
    // Leaf paths aren't in `visibleChildCounts`, so they get `null` —
    // even the filtered-out 'banana', whose useCommon (and so its
    // allowEdit invocation) still runs before the visibility early-return.
    expect(seen.get('outer/inner/0')).toBeNull() // 'apple-1', matches
    expect(seen.get('outer/inner/1')).toBeNull() // 'banana', doesn't match
  })

  test('`visibleSize` is `null` on render-path NodeData when no filter is active', () => {
    // Outside a filter, the FilterStateProvider's value is `null`, the
    // hook returns `null`, and useCommon spreads `visibleSize: null` onto
    // every render-path NodeData. (`undefined` would mean "NodeData built
    // outside the render path", which doesn't apply here.)
    const seen: (number | null | undefined)[] = []
    render(
      <JsonEditor
        data={{ outer: { inner: 'leaf' } }}
        setData={noop}
        allowEdit={(nodeData) => {
          seen.push(nodeData.visibleSize)
          return true
        }}
      />
    )
    expect(seen.length).toBeGreaterThan(0)
    seen.forEach((v) => expect(v).toBeNull())
  })

  test('Tab past a non-editable node fires NO transient startEdit/cancelEdit pair', async () => {
    // With the redirect useLayoutEffect retired (#334), Tab calls now
    // skip non-viable nodes inside `getNextOrPrevious` instead of opening
    // them and bouncing reactively. So the event stream for a Tab from
    // `a` past a non-editable `b` to `c` should be:
    //   startEdit(a) → submitEdit(a) → commitEdit(a) → startEdit(c)
    // — no startEdit(b) or cancelEdit(b) sneaking in.
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(
      <JsonEditor
        data={{ a: 'one', b: 'two', c: 'three' }}
        setData={noop}
        onEditEvent={onEditEvent}
        // `b` is not editable; should be skipped during Tab navigation.
        allowEdit={({ key }) => key !== 'b'}
      />
    )

    await user.dblClick(screen.getByText('"one"'))
    await user.keyboard('{Tab}')

    const seq = onEditEvent.mock.calls.map(([e]) => ({ event: e.event, key: e.key }))
    // No event ever references `b` — Tab walked past it without opening it.
    expect(seq.some((e) => e.key === 'b')).toBe(false)
    // The transition lands directly on `c`.
    expect(seq.map((e) => e.event)).toEqual([
      'startEdit',
      'submitEdit',
      'commitEdit',
      'startEdit',
    ])
    expect(seq[seq.length - 1].key).toBe('c')
  })

  test('Live search hiding the actively-edited node unmounts the input without error', async () => {
    // The redirect's secondary role (cancel-when-active-becomes-invisible)
    // is intentionally dropped — see plan §"Reactive cancel deliberately
    // omitted". A search keystroke that filters out the currently-editing
    // node leaves the editing record in the store; the node simply
    // returns null from its render (its `!isVisible` early-return path),
    // so the input unmounts cleanly with no errors.
    const user = userEvent.setup()
    const data = { apple: 'red-fruit', banana: 'yellow-fruit' }
    // `searchDebounceTime={0}` so the rerender's filter applies immediately.
    const { rerender } = render(
      <JsonEditor data={data} setData={noop} searchDebounceTime={0} />
    )
    // Open an edit on `apple`.
    await user.dblClick(screen.getByText('"red-fruit"'))
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('red-fruit')
    // Apply a search that matches only `banana` — `apple` becomes hidden.
    // The debounced setSearchText still uses a setTimeout(0), so let the
    // microtask flush via `waitFor`.
    expect(() => {
      rerender(
        <JsonEditor data={data} setData={noop} searchText="yellow" searchDebounceTime={0} />
      )
    }).not.toThrow()
    await waitFor(() => expect(screen.queryByText('"red-fruit"')).toBeNull())
    // No input is rendered, and the matching sibling is still on screen.
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('"yellow-fruit"')).toBeInTheDocument()
  })
})

describe('JsonEditor — textarea character insertion via keyboard', () => {
  // End-to-end coverage that a hotkey actually mutates the open textarea's
  // content at the caret (the `insertCharInTextArea` path), exercised through
  // both wiring points: Tab in the raw-JSON collection editor, and a
  // non-default `stringLineBreak` control in a string value editor.
  test('Tab inside the JSON editor inserts a literal tab rather than navigating away', async () => {
    const user = userEvent.setup()
    render(<JsonEditor data={{ outer: { inner: 1 } }} setData={noop} showIconTooltips />)

    await user.click(screen.getAllByTitle('Edit')[0])
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    const before = textarea.value
    textarea.setSelectionRange(0, 0)

    fireEvent.keyDown(textarea, { key: 'Tab' })

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(`\t${before}`)
  })

  test('a non-default stringLineBreak control inserts a newline at the caret', async () => {
    const user = userEvent.setup()
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        keyboardControls={{ stringLineBreak: { key: 'm', modifier: 'Meta' } }}
      />
    )

    await user.dblClick(screen.getByText('"hello"'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(2, 2) // caret after 'he'

    fireEvent.keyDown(textarea, { key: 'm', metaKey: true })

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('he\nllo')
  })
})

describe('JsonEditor — theme CSS custom properties (scoped to the container)', () => {
  test('applies the non-inlineable theme colours as inline custom properties on the container', () => {
    const { container } = render(
      <JsonEditor
        data={{ a: 1 }}
        setData={noop}
        theme={{ inputHighlight: '#abc', iconCopy: '#def' }}
      />
    )
    const editor = container.querySelector('.jer-editor-container') as HTMLElement
    expect(editor).not.toBeNull()
    expect(editor.style.getPropertyValue('--jer-highlight-color')).toBe('#abc')
    expect(editor.style.getPropertyValue('--jer-icon-copy-color')).toBe('#def')
  })

  test('scopes the vars per instance and leaves the document root untouched', () => {
    const before = document.documentElement.style.getPropertyValue('--jer-highlight-color')
    const { container } = render(
      <>
        <JsonEditor data={{ a: 1 }} setData={noop} theme={{ inputHighlight: 'red' }} />
        <JsonEditor data={{ b: 2 }} setData={noop} theme={{ inputHighlight: 'blue' }} />
      </>
    )
    const editors = container.querySelectorAll('.jer-editor-container')
    expect(editors).toHaveLength(2)
    expect((editors[0] as HTMLElement).style.getPropertyValue('--jer-highlight-color')).toBe('red')
    expect((editors[1] as HTMLElement).style.getPropertyValue('--jer-highlight-color')).toBe('blue')
    // The shared document root is never mutated — no cross-instance clobbering.
    expect(document.documentElement.style.getPropertyValue('--jer-highlight-color')).toBe(before)
  })

  test('falls back to the default-theme colours when no theme prop is given', () => {
    const { container } = render(<JsonEditor data={{ a: 1 }} setData={noop} />)
    const editor = container.querySelector('.jer-editor-container') as HTMLElement
    expect(editor.style.getPropertyValue('--jer-highlight-color')).toBe('#b3d8ff')
    expect(editor.style.getPropertyValue('--jer-icon-copy-color')).toBe('#268bd2')
  })
})

describe('JsonEditor — headerRow / valueRow themeable elements', () => {
  test('theme styles land on the collection header and leaf value rows', () => {
    const { container } = render(
      <JsonEditor
        data={{ obj: { a: 1 } }}
        setData={noop}
        theme={{ headerRow: { minHeight: '2.5em' }, valueRow: { minHeight: '3em' } }}
      />
    )
    const header = container.querySelector('.jer-collection-header-row') as HTMLElement
    const valueRow = container.querySelector('.jer-value-main-row') as HTMLElement
    expect(header.style.minHeight).toBe('2.5em')
    expect(valueRow.style.minHeight).toBe('3em')
    // The functional inline `position: relative` still wins — it's the collapse
    // icon's positioning anchor, so a theme can't accidentally clobber it.
    expect(header.style.position).toBe('relative')
  })
})
