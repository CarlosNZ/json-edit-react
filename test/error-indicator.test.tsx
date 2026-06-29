import { useMemo, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
// Import from the component's own subtree, NOT the package barrel — the barrel
// re-exports components that pull ESM-only deps (react-markdown) which break
// Jest. ErrorIndicator itself depends only on React + core types.
import { errorIndicatorDefinition } from '../packages/components/src/ErrorIndicator'
import { useValidationState, type Validate } from '../packages/utils/src'

const errorGlyph = () => screen.queryByRole('img', { name: 'error' })
const wrapperOf = (text: string) => screen.getByText(text).closest('.jer-error-indicator-wrapper')

describe('errorIndicatorDefinition', () => {
  it('flags nothing by default (no condition → no-op)', () => {
    render(
      <JsonEditor
        data={{ a: 'x', b: 'y' }}
        setData={() => {}}
        customNodeDefinitions={[errorIndicatorDefinition()]}
      />
    )
    expect(errorGlyph()).not.toBeInTheDocument()
  })

  it('decorates only the nodes its condition selects', () => {
    render(
      <JsonEditor
        data={{ good: 'x', bad: 'y' }}
        setData={() => {}}
        customNodeDefinitions={[errorIndicatorDefinition({ condition: (nd) => nd.key === 'bad' })]}
      />
    )
    expect(screen.getAllByRole('img', { name: 'error' })).toHaveLength(1)
    expect(wrapperOf('"y"')).not.toBeNull() // flagged node is wrapped
    expect(wrapperOf('"x"')).toBeNull() // sibling is untouched
  })

  it('guards to value nodes — never decorates a collection, even with a broad condition', () => {
    render(
      <JsonEditor
        data={{ obj: { inner: 'x' }, leaf: 'y' }}
        setData={() => {}}
        // A condition that matches everything; the guard still excludes the
        // root + `obj` collections, so only the two leaf values are flagged.
        customNodeDefinitions={[errorIndicatorDefinition({ condition: () => true })]}
      />
    )
    expect(screen.getAllByRole('img', { name: 'error' })).toHaveLength(2)
    expect(wrapperOf('"x"')).not.toBeNull()
    expect(wrapperOf('"y"')).not.toBeNull()
    // Collections render normally (children visible) — they weren't wrapped.
    expect(screen.getByText('obj')).toBeInTheDocument()
  })

  it('renders the default ⚠️ glyph after the node', () => {
    render(
      <JsonEditor
        data={{ bad: 'y' }}
        setData={() => {}}
        customNodeDefinitions={[errorIndicatorDefinition({ condition: (nd) => nd.key === 'bad' })]}
      />
    )
    const wrapper = wrapperOf('"y"')!
    expect(wrapper.lastElementChild).toHaveClass('jer-error-indicator')
    expect(wrapper.lastElementChild).toHaveTextContent('⚠️')
  })

  it('honors the errorGlyph and position componentProps', () => {
    const { rerender } = render(
      <JsonEditor
        data={{ bad: 'y' }}
        setData={() => {}}
        customNodeDefinitions={[
          errorIndicatorDefinition({
            condition: (nd) => nd.key === 'bad',
            componentProps: { errorGlyph: '❌', position: 'before' },
          }),
        ]}
      />
    )
    let wrapper = wrapperOf('"y"')!
    expect(wrapper.firstElementChild).toHaveClass('jer-error-indicator')
    expect(wrapper.firstElementChild).toHaveTextContent('❌')

    rerender(
      <JsonEditor
        data={{ bad: 'y' }}
        setData={() => {}}
        customNodeDefinitions={[
          errorIndicatorDefinition({
            condition: (nd) => nd.key === 'bad',
            componentProps: { errorGlyph: '❌', position: 'after' },
          }),
        ]}
      />
    )
    wrapper = wrapperOf('"y"')!
    expect(wrapper.lastElementChild).toHaveClass('jer-error-indicator')
    expect(wrapper.lastElementChild).toHaveTextContent('❌')
  })
})

// The headline: editing one node flips the validity of a node on another
// branch, and the glyph appears/clears there. That node bails on the commit via
// the §16 memo boundary, so only the customNodeDefinitions identity (memoized
// on `validation`) piercing the memo can re-render it. Mirrors the #359 cross-
// branch test, proven here through the component.
describe('cross-branch flagging via useValidationState', () => {
  const crossBranch: Validate = (data) => {
    const d = data as { method?: string; cardNumber?: unknown }
    return d.method === 'card' && String(d.cardNumber ?? '').length < 4
      ? [{ path: ['cardNumber'], message: 'card number too short', keyword: 'minLength' }]
      : []
  }

  const Host = ({ initial }: { initial: object }) => {
    const [data, setData] = useState<object>(initial)
    const validation = useValidationState(data, crossBranch)
    const customNodeDefinitions = useMemo(
      () => [errorIndicatorDefinition({ condition: (nd) => validation.hasErrorAt(nd.path) })],
      [validation]
    )
    return (
      <JsonEditor data={data} setData={setData} customNodeDefinitions={customNodeDefinitions} />
    )
  }

  it('clears the glyph on a cross-branch node when the edit makes it valid', async () => {
    const user = userEvent.setup()
    render(<Host initial={{ method: 'card', cardNumber: '12' }} />)
    expect(wrapperOf('"12"')).not.toBeNull() // invalid on load → flagged

    await user.dblClick(screen.getByText('"card"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'cash{Enter}')
    await screen.findByText('"cash"')

    expect(wrapperOf('"12"')).toBeNull() // cross-branch node un-flagged
  })

  it('applies the glyph to a cross-branch node when the edit makes it invalid', async () => {
    const user = userEvent.setup()
    render(<Host initial={{ method: 'cash', cardNumber: '12' }} />)
    expect(wrapperOf('"12"')).toBeNull() // valid on load → not flagged

    await user.dblClick(screen.getByText('"cash"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'card{Enter}')
    await screen.findByText('"card"')

    expect(wrapperOf('"12"')).not.toBeNull() // cross-branch node now flagged
  })
})
