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
