import { createContext, useContext, useEffect, useState, type RefObject } from 'react'
import { type Theme } from '@json-edit-react'

interface Background {
  backgroundColor?: string
  backgroundImage?: string
}

export interface ThemePalette {
  // Text colours pulled from the editor's own elements.
  property?: string // object keys
  string?: string // string values
  number?: string // number values
  itemCount?: string // collection counts
  // The editor container background, used as-is for the header panel.
  headerBg: Background
  // A darkened version of the container background for the page behind it.
  pageBg: Background
}

const EMPTY: ThemePalette = { headerBg: {}, pageBg: {} }

// The shell publishes its computed palette here so custom examples can theme
// their own chrome to match the header. The shell owns the only reader of the
// editor styles; this just shares the result.
export const ExamplePaletteContext = createContext<ThemePalette>(EMPTY)

export const useExamplePalette = (): ThemePalette => useContext(ExamplePaletteContext)

// Darken an `rgb()/rgba()` colour toward black by scaling each channel. Returns
// the input unchanged if it can't be parsed.
const darken = (color: string | undefined, factor = 0.9): string | undefined => {
  if (!color) return undefined
  const match = color.match(/rgba?\(([^)]+)\)/)
  if (!match) return color
  const parts = match[1].split(',').map((s) => parseFloat(s))
  const [r, g, b, a] = parts
  const scale = (n: number) => Math.max(0, Math.round(n * factor))
  return parts.length === 4 && !Number.isNaN(a)
    ? `rgba(${scale(r)}, ${scale(g)}, ${scale(b)}, ${a})`
    : `rgb(${scale(r)}, ${scale(g)}, ${scale(b)})`
}

const colorOf = (root: Element, selector: string): string | undefined => {
  const el = root.querySelector(selector)
  return el ? getComputedStyle(el).color : undefined
}

const same = (a: ThemePalette, b: ThemePalette): boolean =>
  a.property === b.property &&
  a.string === b.string &&
  a.number === b.number &&
  a.itemCount === b.itemCount &&
  a.headerBg.backgroundColor === b.headerBg.backgroundColor &&
  a.headerBg.backgroundImage === b.headerBg.backgroundImage

// Lets the example page adopt the selected theme's look. Reads the *computed*
// styles off the rendered editor: text colours from its own key/value/count
// elements, plus the container background (used directly for the header, and
// darkened for the page behind it). Reading resolved styles (rather than
// parsing the `Theme` object) handles fragment-strings, arrays, functions, and
// gradients for free — the browser has already resolved them.
//
// `containerRef` must point at an element that is *always* mounted (not the
// lazy editor itself), so the observer below is in place before the editor — or
// the restored-from-localStorage theme — arrives. A MutationObserver re-reads
// on any editor mount or style change, so there's no race with async
// theme/chunk loads (the bug being: a fixed timeout could expire before a cold
// first paint).
export const useThemePalette = (
  containerRef: RefObject<HTMLElement | null>,
  theme: Theme
): ThemePalette => {
  const [palette, setPalette] = useState<ThemePalette>(EMPTY)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const read = () => {
      const container = root.querySelector('.jer-editor-container')
      if (!container) return
      const { backgroundColor, backgroundImage } = getComputedStyle(container)
      const image = backgroundImage === 'none' ? undefined : backgroundImage
      const next: ThemePalette = {
        property: colorOf(container, '.jer-key-text'),
        string: colorOf(container, '.jer-value-string'),
        number: colorOf(container, '.jer-value-number'),
        itemCount: colorOf(container, '.jer-collection-item-count'),
        headerBg: { backgroundColor, backgroundImage: image },
        pageBg: {
          backgroundColor: darken(backgroundColor),
          // Darken a gradient by laying a translucent black gradient over it.
          backgroundImage: image
            ? `linear-gradient(rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.22)), ${image}`
            : undefined,
        },
      }
      setPalette((prev) => (same(prev, next) ? prev : next))
    }

    // Coalesce bursts of mutations (e.g. during editing) into one read per
    // frame so we don't thrash getComputedStyle.
    let scheduled = 0
    const schedule = () => {
      cancelAnimationFrame(scheduled)
      scheduled = requestAnimationFrame(read)
    }

    read() // in case the editor is already mounted with its final theme
    const observer = new MutationObserver(schedule)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })
    return () => {
      cancelAnimationFrame(scheduled)
      observer.disconnect()
    }
  }, [containerRef, theme])

  return palette
}
