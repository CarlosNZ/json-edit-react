import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { JsonViewer } from '../src/JsonViewer'

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

  test('passing externalTriggers to force edit is also nullified', () => {
    render(
      <JsonViewer
        data={{ greeting: 'hello' }}
        // @ts-expect-error — externalTriggers is omitted from JsonViewerProps.
        // It bypasses restrict filters (sets currentlyEditingElement directly),
        // so JsonViewer must force it undefined regardless.
        externalTriggers={{ edit: { path: ['greeting'] } }}
      />
    )

    // useTriggers runs in a post-mount effect. If the override didn't hold,
    // a textbox would now be in the document.
    expect(screen.queryByRole('textbox')).toBeNull()
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
