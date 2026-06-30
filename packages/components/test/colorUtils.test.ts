import { finiteHsv, SAFE_HSV } from '../src/ColorPicker/colorUtils'

describe('finiteHsv', () => {
  it('returns a finite colour unchanged, preserving reference identity', () => {
    const color = { h: 210, s: 50, v: 75, a: 0.5 }
    // Identity matters: react-colorful's cache guard compares with `===`, so an
    // echoed colour must be the SAME object to short-circuit the check.
    expect(finiteHsv(color)).toBe(color)
  })

  it('treats a missing alpha channel as finite (non-alpha picker)', () => {
    // The non-alpha HsvColorPicker emits `{ h, s, v }` with no `a` key.
    const color = { h: 330, s: 60, v: 100 } as { h: number; s: number; v: number; a: number }
    expect(finiteHsv(color)).toBe(color)
  })

  it.each([
    ['hue', { h: NaN, s: 50, v: 75, a: 1 }],
    ['saturation', { h: 210, s: NaN, v: 75, a: 1 }],
    ['value', { h: 210, s: 50, v: NaN, a: 1 }],
    ['alpha', { h: 210, s: 50, v: 75, a: NaN }],
    ['infinity', { h: Infinity, s: 50, v: 75, a: 1 }],
  ])('falls back to a safe colour when %s is non-finite', (_, color) => {
    expect(finiteHsv(color)).toBe(SAFE_HSV)
    // The fallback must itself be fully finite — that's what rescues
    // react-colorful from a latched NaN on the next render.
    const { h, s, v, a } = finiteHsv(color)
    expect([h, s, v, a].every(Number.isFinite)).toBe(true)
  })
})
