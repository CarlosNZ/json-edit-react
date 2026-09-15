/**
 * Accessible semantics for the editor's clickable affordances (#268).
 *
 * The rule the editor follows: anything that performs an action is a real
 * <button> with an accessible name sourced from the localisation system, but
 * carries `tabIndex={-1}` so it stays out of the field-to-field Tab flow that
 * `keyboardControls` owns. Assistive tech reaches and fires these through the
 * virtual cursor, which ignores tabindex.
 *
 * Every query here goes through `getByRole` + accessible name — if a control
 * loses its role or its label, these fail rather than silently passing on a
 * class selector.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { type CustomButtonDefinition, type NodeData } from '../src/types'

const noop = () => {}

// ─── A — the collapse chevron ────────────────────────────────────────────────

describe('collapse chevron', () => {
  it('is a real <button> with a state-matched name and aria-expanded', async () => {
    const user = userEvent.setup()
    render(<JsonEditor data={{ obj: { a: 1 } }} setData={noop} />)

    // Root + `obj`, both expanded.
    const expanded = screen.getAllByRole('button', { name: 'Collapse' })
    expect(expanded).toHaveLength(2)
    expanded.forEach((chevron) => {
      // The element itself, not a `role` on a div — activation semantics come
      // free, which is what the keyboard-navigation follow-up will build on.
      expect(chevron.tagName).toBe('BUTTON')
      expect(chevron).toHaveAttribute('aria-expanded', 'true')
    })

    await user.click(
      within(screen.getByText('obj').closest('.jer-component') as HTMLElement).getAllByRole(
        'button',
        { name: 'Collapse' }
      )[0]
    )

    // The collapsed node's name flips, and its state follows.
    const collapsed = screen.getByRole('button', { name: 'Expand' })
    expect(collapsed).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('button', { name: 'Collapse' })).toHaveLength(1)
  })

  it('drives the collapse state when activated through the role query', async () => {
    const user = userEvent.setup()
    const onCollapse = jest.fn()
    render(
      <JsonEditor data={{ obj: { hidden: 'value' } }} setData={noop} onCollapse={onCollapse} />
    )

    const chevronFor = (name: 'Collapse' | 'Expand') =>
      within(screen.getByText('obj').closest('.jer-component') as HTMLElement).getAllByRole(
        'button',
        { name }
      )[0]

    // Collapsing is animated, so the subtree stays mounted — `onCollapse` and
    // the button's own state are what report the toggle.
    await user.click(chevronFor('Collapse'))
    expect(onCollapse).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: ['obj'], collapsed: true })
    )

    await user.click(chevronFor('Expand'))
    expect(onCollapse).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: ['obj'], collapsed: false })
    )
    expect(chevronFor('Collapse')).toHaveAttribute('aria-expanded', 'true')
  })

  it('stays out of the Tab order', () => {
    render(<JsonEditor data={{ obj: { a: 1 } }} setData={noop} />)

    screen
      .getAllByRole('button', { name: 'Collapse' })
      .forEach((chevron) => expect(chevron).toHaveAttribute('tabindex', '-1'))
  })

  it('takes its name from `translations`', () => {
    render(
      <JsonEditor
        data={{ obj: { a: 1 } }}
        setData={noop}
        translations={{ TOOLTIP_COLLAPSE: 'Replier' }}
      />
    )

    expect(screen.getAllByRole('button', { name: 'Replier' })).toHaveLength(2)
  })
})

// ─── A2 — every labelled control gates its tooltip on `showIconTooltips` ─────

// The accessible name is unconditional; the visible `title` tooltip is opt-in.
// These pin both halves for each control in one place, so a new control can't
// quietly ship a tooltip that ignores the prop.
describe('showIconTooltips gating', () => {
  const buttons: CustomButtonDefinition[] = [
    { Element: () => <span>★</span>, onClick: () => {}, label: 'Favourite' },
  ]

  const renderEditor = (showIconTooltips: boolean) =>
    render(
      <JsonEditor
        data={{ long: 'abcdefghijklmnop' }}
        setData={noop}
        stringTruncateLength={6}
        customButtons={buttons}
        showIconTooltips={showIconTooltips}
      />
    )

  // [accessible name, expected title when the prop is on]
  const controls: Array<[string, string]> = [
    ['Collapse', 'Collapse'],
    ['Show more', 'Show more'],
    ['Favourite', 'Favourite'],
    ['Copy to clipboard', 'Copy to clipboard'],
    ['Edit', 'Edit'],
    ['Delete', 'Delete'],
  ]

  it.each(controls)('%s has no tooltip when the prop is off', (name) => {
    renderEditor(false)
    expect(screen.getAllByRole('button', { name })[0]).toHaveAttribute('title', '')
  })

  it.each(controls)('%s shows its label as a tooltip when the prop is on', (name, title) => {
    renderEditor(true)
    expect(screen.getAllByRole('button', { name })[0]).toHaveAttribute('title', title)
  })

  it('names the chevron tooltip for the action, not the state', async () => {
    const user = userEvent.setup()
    renderEditor(true)

    // The root collection is the only node with a chevron here.
    const chevron = () => screen.getByRole('button', { name: /^(Collapse|Expand)$/ })

    expect(chevron()).toHaveAttribute('title', 'Collapse')
    await user.click(chevron())
    expect(chevron()).toHaveAttribute('title', 'Expand')
  })

  it('leaves "(Show less)" untitled — its visible text is already its label', async () => {
    const user = userEvent.setup()
    renderEditor(true)

    await user.click(screen.getByRole('button', { name: 'Show more' }))
    expect(screen.getByRole('button', { name: '(Show less)' })).not.toHaveAttribute('title')
  })
})

// ─── B — string show-more / show-less ────────────────────────────────────────

describe('string expansion controls', () => {
  // Longer than the 6-char truncation limit set below, so the ellipsis shows.
  const data = { long: 'abcdefghijklmnop' }

  it('are named buttons that expand and re-collapse the string', async () => {
    const user = userEvent.setup()
    render(<JsonEditor data={data} setData={noop} stringTruncateLength={6} />)

    // The visible affordance is an ellipsis, so the name comes from aria-label.
    const showMore = screen.getByRole('button', { name: 'Show more' })
    expect(showMore).toHaveAttribute('tabindex', '-1')
    await user.click(showMore)

    expect(screen.getByText(/abcdefghijklmnop/)).toBeInTheDocument()

    // Show-less is named by its own visible text.
    await user.click(screen.getByRole('button', { name: '(Show less)' }))
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument()
  })

  it('take their names from `translations`', () => {
    render(
      <JsonEditor
        data={data}
        setData={noop}
        stringTruncateLength={6}
        translations={{ SHOW_MORE: 'Déplier' }}
      />
    )

    expect(screen.getByRole('button', { name: 'Déplier' })).toBeInTheDocument()
  })
})

// ─── C — custom buttons ──────────────────────────────────────────────────────

describe('customButtons', () => {
  const Glyph = () => <span data-testid="glyph">★</span>

  it('renders a labelled <button> wrapper when `label` is supplied', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()
    const buttons: CustomButtonDefinition[] = [{ Element: Glyph, onClick, label: 'Favourite' }]

    render(<JsonEditor data={{ a: 1 }} setData={noop} customButtons={buttons} />)

    const button = screen.getAllByRole('button', { name: 'Favourite' })[0]
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('tabindex', '-1')

    await user.click(button)
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ path: [] }), expect.anything())
  })

  it('leaves the wrapper a plain <div> when `label` is omitted', () => {
    // Without a label the consumer's `Element` owns its own semantics — a
    // <button> wrapper would nest interactive content.
    const buttons: CustomButtonDefinition[] = [{ Element: Glyph, onClick: noop }]

    render(<JsonEditor data={{ a: 1 }} setData={noop} customButtons={buttons} />)

    expect(screen.queryByRole('button', { name: 'Favourite' })).not.toBeInTheDocument()
    expect(screen.getAllByTestId('glyph')[0].parentElement?.tagName).toBe('DIV')
  })

  it('still fires `onClick` with the node it belongs to', async () => {
    const user = userEvent.setup()
    const seen: NodeData[] = []
    const buttons: CustomButtonDefinition[] = [
      { Element: Glyph, onClick: (nodeData) => seen.push(nodeData), label: 'Mark' },
    ]

    render(<JsonEditor data={{ a: 1, b: 2 }} setData={noop} customButtons={buttons} />)

    const rowFor = (key: string) => screen.getByText(key).closest('.jer-component') as HTMLElement
    await user.click(within(rowFor('b')).getByRole('button', { name: 'Mark' }))

    expect(seen).toHaveLength(1)
    expect(seen[0].path).toEqual(['b'])
  })
})
