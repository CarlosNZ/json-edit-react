import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor, type CustomNodeDefinition, type JsonData } from 'json-edit-react'
import { numberFormatterDefinition } from '../src/NumberFormatter'

// A `locale` is passed to every definition so the expected output doesn't
// depend on the machine's default locale.
const usd = { locale: 'en-US', options: { style: 'currency' as const, currency: 'USD' } }

const Harness = ({
  initial,
  defs,
  onData,
}: {
  initial: JsonData
  // Mirrors core's `customNodeDefinitions` prop type (permissive `any`
  // componentProps), so a typed definition assigns.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defs: CustomNodeDefinition<Record<string, any>>[]
  onData?: (d: JsonData) => void
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
    />
  )
}

describe('NumberFormatter — display-only Intl formatting', () => {
  test('formats a number as currency', () => {
    render(
      <Harness
        initial={{ price: 1234.5 }}
        defs={[numberFormatterDefinition({ componentProps: usd })]}
      />
    )
    expect(screen.getByText('$1,234.50')).toBeInTheDocument()
  })

  test('applies locale grouping with no options', () => {
    render(
      <Harness
        initial={{ count: 1234567 }}
        defs={[numberFormatterDefinition({ componentProps: { locale: 'en-US' } })]}
      />
    )
    expect(screen.getByText('1,234,567')).toBeInTheDocument()
  })

  test('percent style scales the stored fraction', () => {
    render(
      <Harness
        initial={{ ratio: 0.5 }}
        defs={[
          numberFormatterDefinition({
            componentProps: { locale: 'en-US', options: { style: 'percent' } },
          }),
        ]}
      />
    )
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  test('only formats numbers matching the condition', () => {
    render(
      <Harness
        initial={{ price: 1000, year: 2026 }}
        defs={[
          numberFormatterDefinition({
            condition: ({ key }) => key === 'price',
            componentProps: usd,
          }),
        ]}
      />
    )
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    // `year` isn't targeted, so it stays a plain number (no grouping/currency).
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  test('edits the raw number, and re-formats the committed value', async () => {
    const user = userEvent.setup()
    const received: JsonData[] = []
    const { container } = render(
      <Harness
        initial={{ price: 1234.5 }}
        onData={(d) => received.push(d)}
        defs={[numberFormatterDefinition({ componentProps: usd })]}
      />
    )

    // Entering edit mode shows the standard number editor with the raw,
    // unformatted value — never the "$1,234.50" display string.
    await user.dblClick(screen.getByText('$1,234.50'))
    const input = screen.getByDisplayValue('1234.5')

    await user.clear(input)
    await user.type(input, '9999')
    await user.click(container.querySelectorAll('.jer-confirm-buttons > button')[0])

    // `setData` receives a plain number, not a formatted string…
    expect(received.at(-1)).toEqual({ price: 9999 })
    // …and the new value is re-formatted for display.
    expect(screen.getByText('$9,999.00')).toBeInTheDocument()
  })
})
