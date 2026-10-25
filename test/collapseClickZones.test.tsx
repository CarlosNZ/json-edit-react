import { fireEvent, render, screen } from '@testing-library/react'
import { JsonEditor } from '../src/JsonEditor'
import { type JsonEditorProps } from '../src/types'

const noop = () => {}
const data = { nested: { items: ['one'] }, sibling: { value: 'two' } }

const getRow = (key: string) =>
  screen.getByText(key).closest<HTMLElement>('.jer-collection-component')!

const getChevron = (row: Element) =>
  row.querySelector(':scope > .jer-collection-header-row .jer-collapse-icon')!

describe('collapseClickZones — left overlay (#417)', () => {
  test.each<{ zones: JsonEditorProps['collapseClickZones'] }>([
    { zones: ['header'] },
    { zones: ['property'] },
    { zones: [] },
  ])('renders no left overlays when the enabled zones are $zones', ({ zones }) => {
    const { container } = render(
      <JsonEditor data={data} setData={noop} collapseClickZones={zones} />
    )
    expect(container.querySelector('.jer-clickzone')).toBeNull()
  })

  test('header-only collapse leaves custom collection controls without a left overlay', () => {
    const onClick = jest.fn()
    const onCollapse = jest.fn()
    const { container } = render(
      <JsonEditor
        data={data}
        setData={noop}
        collapseClickZones={['header']}
        onCollapse={onCollapse}
        customNodeDefinitions={[
          {
            condition: ({ key }) => key === 'nested',
            component: ({ children }) => (
              <div>
                <button onClick={onClick}>Custom control</button>
                {children}
              </div>
            ),
          },
        ]}
      />
    )
    // jsdom does not hit-test the absolute overlay. Its absence is the
    // regression assertion; a click alone would pass with the bug present.
    expect(container.querySelector('.jer-clickzone')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Custom control' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onCollapse).not.toHaveBeenCalled()

    const row = getRow('nested')
    fireEvent.click(row.querySelector(':scope > .jer-collection-header-row')!)
    expect(getChevron(row)).toHaveAttribute('aria-expanded', 'false')
    expect(onCollapse).toHaveBeenCalledTimes(1)
    expect(onCollapse).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: ['nested'], collapsed: true })
    )
  })

  test.each(['nested', 'items'])('the default left zone collapses only its %s row', (key) => {
    const onCollapse = jest.fn()
    const { container } = render(<JsonEditor data={data} setData={noop} onCollapse={onCollapse} />)
    const rows = container.querySelectorAll('.jer-collection-component')
    rows.forEach((row) => {
      expect(row.querySelectorAll(':scope > .jer-clickzone')).toHaveLength(1)
      expect(getChevron(row)).toHaveAttribute('aria-expanded', 'true')
    })

    const target = getRow(key)
    fireEvent.click(target.querySelector(':scope > .jer-clickzone')!)

    rows.forEach((row) => {
      expect(getChevron(row)).toHaveAttribute('aria-expanded', row === target ? 'false' : 'true')
    })
    expect(onCollapse).toHaveBeenCalledTimes(1)
    expect(onCollapse).toHaveBeenLastCalledWith(
      expect.objectContaining({
        path: key === 'nested' ? ['nested'] : ['nested', 'items'],
        collapsed: true,
        includeChildren: false,
      })
    )
  })

  test('removes and restores overlays when the prop changes with unchanged data', () => {
    const onCollapse = jest.fn()
    const props = { data, setData: noop, onCollapse }
    const { container, rerender } = render(<JsonEditor {...props} />)
    const rowCount = container.querySelectorAll('.jer-collection-component').length
    expect(container.querySelectorAll('.jer-clickzone')).toHaveLength(rowCount)

    rerender(<JsonEditor {...props} collapseClickZones={['header']} />)
    expect(container.querySelector('.jer-clickzone')).toBeNull()
    container.querySelectorAll('.jer-collapse-icon').forEach((chevron) => {
      expect(chevron).toHaveAttribute('aria-expanded', 'true')
    })
    expect(onCollapse).not.toHaveBeenCalled()

    rerender(<JsonEditor {...props} />)
    expect(container.querySelectorAll('.jer-clickzone')).toHaveLength(rowCount)
    const row = getRow('items')
    fireEvent.click(row.querySelector(':scope > .jer-clickzone')!)
    expect(getChevron(row)).toHaveAttribute('aria-expanded', 'false')
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })
})
