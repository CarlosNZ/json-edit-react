import { type HsvaColor } from 'colord'

// Internal helpers for the Color Picker. Deliberately NOT re-exported from the
// folder barrel (`index.ts`) so they stay out of the package's public API.

export const SAFE_HSV: HsvaColor = { h: 0, s: 0, v: 0, a: 1 }

// react-colorful's pointer math divides by the picker's width/height, so a
// zero-size picker (a transient during lazy mount or a re-layout) yields NaN.
// Its cache guard compares with `===`, and NaN !== NaN, so a single NaN
// permanently defeats the guard and spins an infinite re-render. Never hand it
// a non-finite colour: a finite fallback also forces it back out of any NaN it
// latched. Returns the input unchanged when finite, preserving the reference
// identity the guard relies on.
export const finiteHsv = (color: HsvaColor): HsvaColor => {
  const channels: Array<number | undefined> = [color.h, color.s, color.v, color.a]
  return channels.every((n) => n === undefined || Number.isFinite(n)) ? color : SAFE_HSV
}
