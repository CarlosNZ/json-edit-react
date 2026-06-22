import { render } from '@testing-library/react'
import { Icon } from '../src/Icons'
import { ThemeProvider } from '../src/contexts/ThemeProvider/ThemeProvider'
import { mergeIcons } from '../src/contexts/ThemeProvider/compileStyles'
import { type ThemeInput, type ThemeIcons, type IconDefinition, type NodeData } from '../src/types'

// Minimal NodeData fixture — the icon paint path only reads it to feed theme
// functions, and these themes are all static.
const nodeData: NodeData = {
  key: 'k',
  path: [],
  level: 0,
  index: 0,
  value: 'x',
  size: null,
  parentData: null,
  fullData: {},
}

// Render a single themed icon and hand back its container for DOM queries.
const renderIcon = (name: keyof ThemeIcons, theme?: ThemeInput) =>
  render(
    <ThemeProvider theme={theme}>
      <Icon name={name} nodeData={nodeData} />
    </ThemeProvider>
  ).container

const allNames: Array<keyof ThemeIcons> = [
  'add',
  'edit',
  'delete',
  'copy',
  'ok',
  'cancel',
  'collection',
]

// ─── A — mergeIcons: completeness & layering ─────────────────────────────────

describe('mergeIcons', () => {
  it('is always complete — every glyph resolves from the default theme', () => {
    const merged = mergeIcons({})
    allNames.forEach((name) => expect(merged[name]).toBeDefined())
    // Built-in detail carried through (the chevron glyph + its size correction).
    expect(merged.collection.viewBox).toBe('0 0 512 512')
    expect(merged.collection.scale).toBe(0.7)
  })

  it('swaps only the overridden glyph, keeping the rest default', () => {
    const custom: IconDefinition = { content: 'X' }
    const merged = mergeIcons({ icons: { add: custom }, styles: {} })
    expect(merged.add).toBe(custom)
    // Untouched glyphs are still the built-ins.
    expect(merged.edit).toBe(mergeIcons({}).edit)
  })

  it('layers an array, later theme winning per glyph key', () => {
    const a: IconDefinition = { content: 'A' }
    const b: IconDefinition = { content: 'B' }
    const merged = mergeIcons([
      { icons: { add: a }, styles: {} },
      { icons: { add: b }, styles: {} },
    ])
    expect(merged.add).toBe(b)
    // A key set by neither overlay stays default.
    expect(merged.delete).toBe(mergeIcons({}).delete)
  })

  it('ignores a bare ThemeStyles entry (no icons) and keeps the defaults', () => {
    const merged = mergeIcons({ string: 'red' })
    expect(merged.add).toBe(mergeIcons({}).add)
  })
})

// ─── B — rendering: replacement, sizing, keying, hover class ─────────────────

describe('Icon — rendering', () => {
  it('renders a theme-supplied glyph in place of the built-in', () => {
    const custom: IconDefinition = {
      content: <path data-testid="custom-add" d="M0 0h1v1H0z" />,
    }
    const container = renderIcon('add', { icons: { add: custom }, styles: {} })
    expect(container.querySelector('[data-testid="custom-add"]')).toBeInTheDocument()
    // The built-in add glyph (which starts "M13 7…") is gone.
    expect(container.querySelector('path[d^="M13 7"]')).toBeNull()
  })

  it('sizes the icon at ICON_TEXT_SIZE_RATIO × scale em', () => {
    // No scale → the bare 1.4 ratio.
    const plain = renderIcon('add', { styles: {} }).querySelector('svg')!
    expect(plain).toHaveAttribute('width', '1.4em')
    expect(plain).toHaveAttribute('height', '1.4em')

    // scale multiplies the ratio: 1.4 × 0.5 = 0.7em.
    const scaled: IconDefinition = { content: <path d="M0 0h1v1H0z" />, scale: 0.5 }
    const svg = renderIcon('add', { icons: { add: scaled }, styles: {} }).querySelector('svg')!
    expect(svg).toHaveAttribute('width', '0.7em')
    expect(svg).toHaveAttribute('height', '0.7em')
  })

  it('keys `collection` to the iconCollection paint and the chevron glyph', () => {
    const svg = renderIcon('collection', {
      styles: { iconCollection: 'rgb(1, 2, 3)' },
    }).querySelector('svg')!
    expect(svg).toHaveStyle({ color: 'rgb(1, 2, 3)' })
    // The built-in collection glyph carries the 512 viewBox.
    expect(svg).toHaveAttribute('viewBox', '0 0 512 512')
  })

  it('gives action icons the jer-icon hover class but not the collapse chevron', () => {
    expect(renderIcon('add', { styles: {} }).querySelector('svg')).toHaveClass('jer-icon')
    expect(renderIcon('collection', { styles: {} }).querySelector('svg')).not.toHaveClass(
      'jer-icon'
    )
  })
})

// ─── C — colour: currentColor adoption vs. fixed fills ───────────────────────
//
// jsdom doesn't resolve `currentColor` (no layout/cascade), so these assert the
// *wiring* that makes it work: the theme colour reaches the <svg> and the
// fill="currentColor" default is in place, while a path's own `fill` is left
// untouched.

describe('Icon — colour', () => {
  it('applies the theme colour to the icon (general colour is themed)', () => {
    const svg = renderIcon('add', { styles: { iconAdd: 'rgb(10, 20, 30)' } }).querySelector('svg')!
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(svg).toHaveStyle({ color: 'rgb(10, 20, 30)' })
    // The built-in add paths declare no fill, so they inherit the svg's
    // currentColor → the theme colour.
    svg.querySelectorAll('path').forEach((p) => expect(p).not.toHaveAttribute('fill'))
  })

  it('flows the theme colour through `stroke` for stroke-based glyphs', () => {
    const svg = renderIcon('ok', { styles: { iconOk: 'rgb(5, 6, 7)' } }).querySelector('svg')!
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveStyle({ color: 'rgb(5, 6, 7)' })
  })

  it('preserves a path’s explicit fill while repainting its fill-less siblings', () => {
    // A "flag"/brand-style glyph: one hard-coded colour that must survive
    // theming, one themeable shape that should adopt the theme colour.
    const flag: IconDefinition = {
      content: (
        <>
          <path data-testid="fixed" fill="#ff0000" d="M0 0h2v2H0z" />
          <path data-testid="themed" d="M2 2h2v2H2z" />
        </>
      ),
    }
    const container = renderIcon('add', {
      icons: { add: flag },
      styles: { iconAdd: 'rgb(0, 128, 0)' },
    })
    const svg = container.querySelector('svg')!

    // The theme colour reaches the svg…
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(svg).toHaveStyle({ color: 'rgb(0, 128, 0)' })
    // …but the explicit fill is untouched (brand colour preserved)…
    expect(container.querySelector('[data-testid="fixed"]')).toHaveAttribute('fill', '#ff0000')
    // …while the fill-less sibling inherits currentColor → the theme colour.
    expect(container.querySelector('[data-testid="themed"]')).not.toHaveAttribute('fill')
  })
})
