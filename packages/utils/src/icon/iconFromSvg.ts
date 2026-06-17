import { createElement, isValidElement, type ReactElement, type SVGProps } from 'react'
import type { IconDefinition } from 'json-edit-react'
import { intern } from '../_common/intern'

// Root <svg …>…</svg> matcher. `\b` avoids matching <svgfoo>; the inner capture
// is greedy so it reaches the final </svg>; case-insensitive for <SVG>. Anything
// before the tag (<?xml?>, <!DOCTYPE>, comments) is ignored — we only locate the
// root tag, never the inner markup.
const SVG_TAG = /<svg\b([^>]*)>([\s\S]*)<\/svg>/i

// name="value" | name='value', over the root tag's attribute string only.
const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

// Root attributes core owns or that don't belong on the rendered <svg>: size
// (core sizes via `scale`, and would be overridden anyway), the xml namespaces
// (React adds them), and id/class/style (theming + identity are core's, and a
// raw `class`/`style` string isn't a valid React prop). `xmlns` is a prefix
// match so it also catches `xmlns:xlink`.
const DROPPED_ATTRS = ['width', 'height', 'id', 'class', 'style']
const isDroppedAttr = (name: string) => DROPPED_ATTRS.includes(name) || name.startsWith('xmlns')

// stroke-width → strokeWidth, fill-rule → fillRule, … so a lifted root attribute
// is a valid React SVG prop. The inner markup is NOT converted — it's injected
// raw, where kebab-case is correct.
const toCamel = (name: string) => name.replace(/-([a-z])/gi, (_, c: string) => c.toUpperCase())

// String → IconDefinition. Parses ONLY the root tag's attributes; the inner
// markup rides through verbatim via dangerouslySetInnerHTML — the browser parses
// it at mount, in the SVG namespace (the <g> sits inside core's <svg>), so
// nested/odd markup just works. dangerouslySetInnerHTML is benign here: the
// markup is author-supplied, not end-user input.
const parse = (raw: string): IconDefinition => {
  const match = raw.trim().match(SVG_TAG)
  const attrs = match ? match[1] : ''
  const inner = match ? match[2] : raw.trim()

  let viewBox: string | undefined
  const svgProps: Record<string, string> = {}
  for (const [, name, dq, sq] of attrs.matchAll(ATTR)) {
    const value = dq ?? sq
    if (name === 'viewBox') viewBox = value
    else if (!isDroppedAttr(name)) svgProps[toCamel(name)] = value
  }

  const def: IconDefinition = {
    content: createElement('g', { dangerouslySetInnerHTML: { __html: inner } }),
  }
  if (viewBox !== undefined) def.viewBox = viewBox
  if (Object.keys(svgProps).length > 0) def.svgProps = svgProps as SVGProps<SVGSVGElement>
  return def
}

// Props read straight off a React <svg> element — already camelCase, no
// parsing. `viewBox`/`children` are handled separately; the rest are
// size/namespace that core owns.
const ELEMENT_OWN_PROPS = ['viewBox', 'children', 'width', 'height', 'xmlns', 'xmlnsXlink']

// React element → IconDefinition. A <svg> element is unwrapped via its props
// (so core doesn't wrap a second <svg> around it — the nested-<svg> footgun);
// any other element (a <path>, fragment, custom component) becomes the glyph
// content directly.
const fromElement = (el: ReactElement): IconDefinition => {
  if (el.type !== 'svg') return { content: el }
  const props = (el.props ?? {}) as Record<string, unknown>
  const svgProps: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(props))
    if (!ELEMENT_OWN_PROPS.includes(name)) svgProps[name] = value

  const def: IconDefinition = { content: props.children as IconDefinition['content'] }
  if (props.viewBox !== undefined) def.viewBox = String(props.viewBox)
  if (Object.keys(svgProps).length > 0) def.svgProps = svgProps as SVGProps<SVGSVGElement>
  return def
}

const fromString = intern((svg: string): IconDefinition => parse(svg))

/**
 * Build an `IconDefinition` (for `Theme.icons`) from raw SVG. Accepts:
 *  - a raw SVG string — a full `<svg>…</svg>` or bare inner markup. **Interned**,
 *    so an inline `iconFromSvg('<svg…>')` keeps a stable identity across
 *    renders.
 *  - a React `<svg>` element — unwrapped via its props/children. A non-`<svg>`
 *    element (a `<path>`, fragment, custom component) becomes the glyph content
 *    directly.
 *  - an existing `IconDefinition` — returned unchanged (the single front door
 *    regardless of source).
 *
 * The element and object forms are NOT interned (an inline element is a fresh
 * object each render): hoist or memoize them for render stability.
 */
export const iconFromSvg = (svg: string | ReactElement | IconDefinition): IconDefinition => {
  if (typeof svg === 'string') return fromString(svg)
  if (isValidElement(svg)) return fromElement(svg)
  return svg
}
