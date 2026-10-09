import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor, type CustomNodeDefinition, type JsonData } from 'json-edit-react'
import { chipsDefinition } from '../src/Chips'

const Harness = ({
  initial,
  defs,
  onData,
  readOnly,
}: {
  initial: JsonData
  // Mirrors core's `customNodeDefinitions` prop type (permissive `any`
  // componentProps), so a typed definition assigns.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defs: CustomNodeDefinition<Record<string, any>>[]
  onData?: (d: JsonData) => void
  readOnly?: boolean
}) => {
  const [data, setData] = useState<JsonData>(initial)
  return (
    <JsonEditor
      data={data}
      setData={(d) => {
        onData?.(d)
        setData(d)
      }}
      customNodeDefinitions={defs}
      allowEdit={!readOnly}
    />
  )
}

describe('Chips — string arrays as removable chips', () => {
  test('renders each string as a chip', () => {
    render(<Harness initial={{ tags: ['red', 'green'] }} defs={[chipsDefinition()]} />)
    expect(screen.getByText('red')).toHaveClass('jer-chip')
    expect(screen.getByText('green')).toHaveClass('jer-chip')
  })

  test("doesn't match an array containing a non-string", () => {
    const { container } = render(
      <Harness initial={{ mixed: ['red', 1] }} defs={[chipsDefinition()]} />
    )
    expect(container.querySelector('.jer-chip')).toBeNull()
  })

  test('removing a chip commits the shorter array', async () => {
    const onData = jest.fn()
    render(
      <Harness initial={{ tags: ['red', 'green'] }} defs={[chipsDefinition()]} onData={onData} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove red' }))
    expect(onData).toHaveBeenLastCalledWith({ tags: ['green'] })
  })

  test('adds a typed chip on Enter, trimmed and without duplicates', async () => {
    const onData = jest.fn()
    render(<Harness initial={{ tags: ['red'] }} defs={[chipsDefinition()]} onData={onData} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add chip' }))
    await userEvent.keyboard('  blue  {Enter}')
    expect(onData).toHaveBeenLastCalledWith({ tags: ['red', 'blue'] })
    onData.mockClear()
    await userEvent.keyboard('red{Enter}')
    expect(onData).not.toHaveBeenCalled()
  })

  test('with `options`, adds from a dropdown of the unused ones', async () => {
    const onData = jest.fn()
    render(
      <Harness
        initial={{ tags: ['red'] }}
        defs={[chipsDefinition({ componentProps: { options: ['red', 'green', 'blue'] } })]}
        onData={onData}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add chip' }))
    const select = screen.getByRole('combobox')
    expect(screen.queryByRole('option', { name: 'red' })).not.toBeInTheDocument()
    await userEvent.selectOptions(select, 'blue')
    expect(onData).toHaveBeenLastCalledWith({ tags: ['red', 'blue'] })
  })

  test('hides the add and remove controls on a read-only node', () => {
    render(<Harness initial={{ tags: ['red'] }} defs={[chipsDefinition()]} readOnly />)
    expect(screen.queryByRole('button', { name: 'Remove red' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add chip' })).not.toBeInTheDocument()
  })
})
