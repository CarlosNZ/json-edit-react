import {
  compileStyles,
  getStyles,
  writeThemeCssVars,
} from '../src/contexts/ThemeProvider/compileStyles'
import { type ThemeFunction } from '../src/contexts/ThemeProvider/types'
import { type NodeData } from '../src/types'

// Minimal NodeData fixture — theme functions only read the few fields they need.
const makeNodeData = (overrides: Partial<NodeData> = {}): NodeData => ({
  key: 'k',
  path: [],
  level: 0,
  index: 0,
  value: 'x',
  size: null,
  parentData: null,
  fullData: {},
  ...overrides,
})
const nodeData = makeNodeData()

// ─── A — shorthand & merge-over-default ──────────────────────────────────────

describe('compileStyles — shorthand & merge over default', () => {
  it('produces the default theme for empty input', () => {
    const c = compileStyles({})
    expect(c.string).toEqual({ color: '#cb4b16' })
    expect(c.number).toEqual({ color: '#268bd2' })
    expect(c.boolean).toEqual({ color: 'green' })
    expect(c.container).toEqual({ backgroundColor: '#f6f6f6', fontFamily: 'monospace' })
    expect(c.null).toEqual({
      color: '#dc322f',
      fontVariant: 'small-caps',
      fontWeight: 'bold',
    })
    expect(c.dropZone).toBeUndefined() // unstyled by default → absent from the compiled map
  })

  it('treats a string value as the colour', () => {
    expect(compileStyles({ string: 'red' }).string).toEqual({ color: 'red' })
  })

  it('maps to the element default property (background / border)', () => {
    expect(compileStyles({ container: '#fff' }).container).toEqual({
      backgroundColor: '#fff',
      fontFamily: 'monospace',
    })
    expect(compileStyles({ dropZone: 'black' }).dropZone).toEqual({ borderColor: 'black' })
    expect(compileStyles({ inputHighlight: '#abc' }).inputHighlight).toEqual({
      backgroundColor: '#abc',
    })
  })

  it('merges an object value over the default, keeping unspecified props', () => {
    expect(compileStyles({ boolean: { fontStyle: 'italic' } }).boolean).toEqual({
      color: 'green',
      fontStyle: 'italic',
    })
    // `null` has a rich default — only `color` is replaced
    expect(compileStyles({ null: 'red' }).null).toEqual({
      color: 'red',
      fontVariant: 'small-caps',
      fontWeight: 'bold',
    })
  })

  it('merges an array value left → right', () => {
    expect(compileStyles({ number: ['blue', { fontSize: '90%' }] }).number).toEqual({
      color: 'blue',
      fontSize: '90%',
    })
  })
})

// ─── B — fragments ───────────────────────────────────────────────────────────

describe('compileStyles — fragments', () => {
  it('resolves a fragment used as a colour', () => {
    expect(
      compileStyles({ fragments: { brand: '#E63946' }, styles: { property: 'brand' } }).property
    ).toEqual({ color: '#E63946' })
  })

  it('resolves a fragment that is an object', () => {
    expect(
      compileStyles({ fragments: { box: { padding: '4px' } }, styles: { container: 'box' } })
        .container
    ).toEqual({ backgroundColor: '#f6f6f6', fontFamily: 'monospace', padding: '4px' })
  })

  it('mixes a fragment with extra props in an array', () => {
    expect(
      compileStyles({ fragments: { a: 'red' }, styles: { string: ['a', { fontWeight: 'bold' }] } })
        .string
    ).toEqual({ color: 'red', fontWeight: 'bold' })
  })

  it('treats an unknown fragment name as a raw CSS value', () => {
    expect(compileStyles({ fragments: {}, styles: { string: 'notAFragment' } }).string).toEqual({
      color: 'notAFragment',
    })
  })

  it('works with bare ThemeStyles (no fragments key)', () => {
    expect(compileStyles({ string: 'red' }).string).toEqual({ color: 'red' })
  })
})

// ─── C — groups ──────────────────────────────────────────────────────────────

describe('compileStyles — groups', () => {
  it('fans `value` out to string / number / boolean / null only', () => {
    const c = compileStyles({ value: 'green' })
    expect(c.string).toEqual({ color: 'green' })
    expect(c.number).toEqual({ color: 'green' })
    expect(c.boolean).toEqual({ color: 'green' })
    expect(c.null).toEqual({ color: 'green', fontVariant: 'small-caps', fontWeight: 'bold' })
    // non-members untouched
    expect(c.property).toEqual({ color: '#292929' })
    expect(c.bracket).toEqual({ color: '#002b36', fontWeight: 'bold' })
  })

  it('fans `icon` out to every icon element', () => {
    const c = compileStyles({ icon: 'grey' })
    expect(c.iconCollection).toEqual({ color: 'grey' })
    expect(c.iconEdit).toEqual({ color: 'grey' })
    expect(c.iconDelete).toEqual({ color: 'grey' })
    expect(c.iconCopy).toEqual({ color: 'grey' })
    expect(c.iconCancel).toEqual({ color: 'grey' })
    // a non-icon is untouched
    expect(c.string).toEqual({ color: '#cb4b16' })
  })

  it('lets a specific element override a group within the same theme', () => {
    const c = compileStyles({ value: 'green', string: 'red' })
    expect(c.string).toEqual({ color: 'red' })
    expect(c.number).toEqual({ color: 'green' })
  })

  it('merges group and specific per property', () => {
    const c = compileStyles({ value: { opacity: 0.5 }, string: { color: 'red' } })
    expect(c.string).toEqual({ color: 'red', opacity: 0.5 })
    expect(c.number).toEqual({ color: '#268bd2', opacity: 0.5 })
  })

  it('never leaks group keys into the compiled output', () => {
    const c = compileStyles({ value: 'green', icon: 'grey' })
    expect('value' in c).toBe(false)
    expect('icon' in c).toBe(false)
  })
})

// ─── D — array layering precedence ───────────────────────────────────────────

describe('compileStyles — array layering', () => {
  it('lets a later theme win per element', () => {
    expect(compileStyles([{ string: 'red' }, { string: 'blue' }]).string).toEqual({ color: 'blue' })
  })

  it('lets a later group beat an earlier specific (cross-theme = later wins)', () => {
    const c = compileStyles([{ iconEdit: 'blue' }, { icon: 'grey' }])
    expect(c.iconEdit).toEqual({ color: 'grey' })
    expect(c.iconDelete).toEqual({ color: 'grey' })
  })

  it('keeps specific-beats-group within a single theme', () => {
    const c = compileStyles({ icon: 'grey', iconEdit: 'blue' })
    expect(c.iconEdit).toEqual({ color: 'blue' })
    expect(c.iconDelete).toEqual({ color: 'grey' })
  })

  it('mixes a full Theme with bare styles in one array', () => {
    const c = compileStyles([
      { fragments: { a: 'red' }, styles: { string: 'a' } },
      { string: 'blue' },
    ])
    expect(c.string).toEqual({ color: 'blue' })
  })

  it('keeps defaults for unspecified elements', () => {
    expect(compileStyles({ string: 'red' }).number).toEqual({ color: '#268bd2' })
  })
})

// ─── E — functions: composition ──────────────────────────────────────────────

describe('compileStyles — function composition', () => {
  it('compiles a single function element to a closure over the base', () => {
    const c = compileStyles({ string: () => ({ color: 'red' }) })
    expect(typeof c.string).toBe('function')
    expect(getStyles(c, 'string', nodeData)).toEqual({ color: 'red' })
  })

  it('keeps static parts in the base and overlays the function', () => {
    const c = compileStyles({ string: [{ fontSize: '90%' }, () => ({ color: 'red' })] })
    expect(getStyles(c, 'string', nodeData)).toEqual({ color: 'red', fontSize: '90%' })
  })

  it('treats a null function result as contributing nothing', () => {
    const fn: ThemeFunction = (nd) => (nd.value === 'x' ? { color: 'red' } : null)
    const c = compileStyles({ string: fn })
    expect(getStyles(c, 'string', makeNodeData({ value: 'x' }))).toEqual({ color: 'red' })
    expect(getStyles(c, 'string', makeNodeData({ value: 'y' }))).toEqual({
      color: '#cb4b16',
    })
  })

  it('fans a group function out to each member, over that member’s base', () => {
    const c = compileStyles({ value: () => ({ opacity: 0.5 }) })
    expect(typeof c.string).toBe('function')
    expect(getStyles(c, 'string', nodeData)).toEqual({ color: '#cb4b16', opacity: 0.5 })
    expect(getStyles(c, 'number', nodeData)).toEqual({ color: '#268bd2', opacity: 0.5 })
  })

  it('composes a group function and a specific function per property', () => {
    const c = compileStyles({
      value: () => ({ opacity: 0.5, color: 'green' }),
      string: () => ({ color: 'red' }),
    })
    // specific fn wins on `color`, group fn’s `opacity` survives
    expect(getStyles(c, 'string', nodeData)).toEqual({ color: 'red', opacity: 0.5 })
    expect(getStyles(c, 'number', nodeData)).toEqual({ color: 'green', opacity: 0.5 })
  })

  it('composes an array of N functions, later winning per property', () => {
    const c = compileStyles({
      string: [() => ({ color: 'red', fontWeight: 'bold' }), () => ({ color: 'blue' })],
    })
    expect(getStyles(c, 'string', nodeData)).toEqual({ color: 'blue', fontWeight: 'bold' })
  })

  it('applies a base theme function after a later theme static (functions last)', () => {
    const c = compileStyles([{ string: () => ({ color: 'red' }) }, { string: { color: 'blue' } }])
    expect(getStyles(c, 'string', nodeData)).toEqual({ color: 'red' })
  })

  it('lets a group function override a specific static (functions last)', () => {
    const c = compileStyles({ value: () => ({ color: 'green' }), string: { color: 'red' } })
    expect(getStyles(c, 'string', nodeData)).toEqual({ color: 'green' })
  })
})

// ─── F — getStyles ───────────────────────────────────────────────────────────

describe('getStyles', () => {
  it('returns the same object reference for a static element (stable)', () => {
    const c = compileStyles({ property: 'red' })
    const a = getStyles(c, 'property', makeNodeData({ value: 1 }))
    const b = getStyles(c, 'property', makeNodeData({ value: 2 }))
    expect(a).toEqual({ color: 'red' })
    expect(a).toBe(b)
    expect(a).toBe(c.property)
  })

  it('returns a freshly evaluated object for a function element', () => {
    const c = compileStyles({ string: () => ({ color: 'red' }) })
    const a = getStyles(c, 'string', nodeData)
    const b = getStyles(c, 'string', nodeData)
    expect(a).toEqual({ color: 'red' })
    expect(a).not.toBe(b) // fresh each call
  })

  it('passes nodeData through to the function', () => {
    const c = compileStyles({
      string: (nd) => ({ color: nd.value === 'hot' ? 'red' : 'blue' }),
    })
    expect(getStyles(c, 'string', makeNodeData({ value: 'hot' }))).toEqual({ color: 'red' })
    expect(getStyles(c, 'string', makeNodeData({ value: 'cold' }))).toEqual({ color: 'blue' })
  })

  it('falls back to {} for an element no theme styles', () => {
    // `dropZone` is absent from the compiled map, but the public contract is
    // always a concrete object — never undefined.
    expect(getStyles(compileStyles({}), 'dropZone', nodeData)).toEqual({})
  })
})

// ─── G — writeThemeCssVars ───────────────────────────────────────────────────

describe('writeThemeCssVars', () => {
  it('writes the highlight and copy-icon custom properties', () => {
    const el = document.createElement('div')
    writeThemeCssVars(compileStyles({ inputHighlight: '#abc', iconCopy: '#def' }), el)
    expect(el.style.getPropertyValue('--jer-highlight-color')).toBe('#abc')
    expect(el.style.getPropertyValue('--jer-icon-copy-color')).toBe('#def')
  })

  it('does not write a var when the value is a function', () => {
    const el = document.createElement('div')
    writeThemeCssVars(compileStyles({ inputHighlight: () => ({ backgroundColor: 'red' }) }), el)
    expect(el.style.getPropertyValue('--jer-highlight-color')).toBe('')
  })
})

// ─── H — fast path (object vs closure) ───────────────────────────────────────

describe('compileStyles — fast path', () => {
  it('keeps a function-free element as a plain object', () => {
    const c = compileStyles({ string: 'red' })
    expect(typeof c.string).not.toBe('function')
  })

  it('compiles a function-bearing element to a function', () => {
    const c = compileStyles({ string: () => ({ color: 'red' }) })
    expect(typeof c.string).toBe('function')
  })
})
