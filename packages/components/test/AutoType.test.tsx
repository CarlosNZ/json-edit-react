import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor, type CustomNodeDefinition, type JsonData } from 'json-edit-react'
import { autoTypeDefinition } from '../src/AutoType'

// Stateful harness so a committed value re-enters via `data` — required for a
// leaf → collection commit, where the node has to re-route to a CollectionNode
// once its value becomes an object/array.
const Harness = ({
  initial,
  onData,
  defs = [autoTypeDefinition()],
}: {
  initial: JsonData
  onData: (d: JsonData) => void
  // Mirrors core's `customNodeDefinitions` prop type (permissive `any`
  // componentProps), so a typed `CustomNodeDefinition<AutoTypeProps>` assigns.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defs?: CustomNodeDefinition<Record<string, any>>[]
}) => {
  const [data, setData] = useState<JsonData>(initial)
  return (
    <JsonEditor
      data={data}
      setData={(d) => {
        onData(d)
        setData(d)
      }}
      customNodeDefinitions={defs}
      // The component is meant to be paired with the type selector turned off:
      // the typed text picks the type, so the dropdown is redundant.
      allowTypeSelection={false}
    />
  )
}

const openEditor = async (user: ReturnType<typeof userEvent.setup>, displayText: string) => {
  await user.dblClick(screen.getByText(displayText))
  return screen.getByRole('textbox') as HTMLTextAreaElement
}

// `fireEvent.change` rather than `user.type`: the buffer often contains `{`,
// `[` and `"`, which user.type interprets as special key syntax.
const setBuffer = (input: HTMLTextAreaElement, text: string) =>
  fireEvent.change(input, { target: { value: text } })

const confirm = (user: ReturnType<typeof userEvent.setup>, container: HTMLElement) =>
  user.click(container.querySelectorAll('.jer-confirm-buttons > button')[0])

describe('AutoType — type inference from typed text', () => {
  test.each([
    ['12.3', 12.3],
    ['42', 42],
    ['-7', -7],
    ['true', true],
    ['false', false],
    ['null', null],
  ])('typing %p commits the parsed value %p', async (typed, expected) => {
    const user = userEvent.setup()
    const onData = jest.fn()
    const { container } = render(<Harness initial={{ x: 'start' }} onData={onData} />)

    const input = await openEditor(user, '"start"')
    setBuffer(input, typed)
    await confirm(user, container)

    expect(onData).toHaveBeenCalledWith({ x: expected })
  })

  test('text that does not parse stays a string', async () => {
    const user = userEvent.setup()
    const onData = jest.fn()
    const { container } = render(<Harness initial={{ x: 'start' }} onData={onData} />)

    const input = await openEditor(user, '"start"')
    setBuffer(input, 'hello world')
    await confirm(user, container)

    expect(onData).toHaveBeenCalledWith({ x: 'hello world' })
  })

  test('typing an object literal turns a leaf into an object (leaf → collection)', async () => {
    const user = userEvent.setup()
    const onData = jest.fn()
    const { container } = render(<Harness initial={{ x: 1 }} onData={onData} />)

    const input = await openEditor(user, '1')
    setBuffer(input, '{"a":1,"b":2}')
    await confirm(user, container)

    expect(onData).toHaveBeenCalledWith({ x: { a: 1, b: 2 } })
    // The committed object re-enters and mounts as a real collection.
    await waitFor(() => expect(screen.getByText('a')).toBeInTheDocument())
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  test('typing an array literal turns a leaf into an array', async () => {
    const user = userEvent.setup()
    const onData = jest.fn()
    const { container } = render(<Harness initial={{ x: 'start' }} onData={onData} />)

    const input = await openEditor(user, '"start"')
    setBuffer(input, '[1,2,3]')
    await confirm(user, container)

    expect(onData).toHaveBeenCalledWith({ x: [1, 2, 3] })
  })
})

describe('AutoType — round-trip stability', () => {
  test('an unchanged string that looks like a number stays a string', async () => {
    const user = userEvent.setup()
    const onData = jest.fn()
    const { container } = render(<Harness initial={{ x: '12.3' }} onData={onData} />)

    // Open and confirm without touching the text.
    await openEditor(user, '"12.3"')
    await confirm(user, container)

    // It must not flip to the number 12.3 — and the quotes in the view confirm
    // it's still a string.
    expect(onData).not.toHaveBeenCalledWith({ x: 12.3 })
    expect(screen.getByText('"12.3"')).toBeInTheDocument()
  })

  test('actually editing a stringy-number re-parses it', async () => {
    const user = userEvent.setup()
    const onData = jest.fn()
    const { container } = render(<Harness initial={{ x: '5' }} onData={onData} />)

    const input = await openEditor(user, '"5"')
    setBuffer(input, '99')
    await confirm(user, container)

    expect(onData).toHaveBeenCalledWith({ x: 99 })
  })
})

describe('AutoType — custom parser', () => {
  test('componentProps.jsonParse overrides the default JSON.parse', async () => {
    const user = userEvent.setup()
    const onData = jest.fn()
    // A sentinel parser proves the configured parser is the one used.
    const jsonParse = jest.fn(() => ({ parsed: 'custom' }))
    const { container } = render(
      <Harness
        initial={{ x: 'start' }}
        onData={onData}
        defs={[autoTypeDefinition({ componentProps: { jsonParse } })]}
      />
    )

    const input = await openEditor(user, '"start"')
    setBuffer(input, 'anything')
    await confirm(user, container)

    expect(jsonParse).toHaveBeenCalledWith('anything')
    expect(onData).toHaveBeenCalledWith({ x: { parsed: 'custom' } })
  })
})
