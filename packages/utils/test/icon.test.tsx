import { isValidElement, type ReactElement } from 'react'
import { iconFromSvg } from '../src/icon'
import type { IconDefinition } from 'json-edit-react'

// Pull the dangerouslySetInnerHTML payload off a string-built glyph's <g> content.
const innerHtml = (def: IconDefinition): string | undefined =>
  (def.content as ReactElement<{ dangerouslySetInnerHTML?: { __html: string } }>).props
    .dangerouslySetInnerHTML?.__html

// ─── A — string parsing (real-world fixtures) ────────────────────────────────

describe('iconFromSvg — string parsing', () => {
  it('lifts viewBox + stroke svgProps from a full <svg> (Lucide-style), dropping size/xmlns', () => {
    const def = iconFromSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>'
    )
    expect(def.viewBox).toBe('0 0 24 24')
    expect(def.svgProps).toEqual({
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    })
    expect(innerHtml(def)).toBe('<path d="M5 12h14"/>')
  })

  it('parses a Boxicons-style fill <svg> (no extra root attrs → no svgProps)', () => {
    const def = iconFromSvg('<svg viewBox="0 0 24 24"><path d="M13 7h-2v4"/></svg>')
    expect(def.viewBox).toBe('0 0 24 24')
    expect(def.svgProps).toBeUndefined()
    expect(innerHtml(def)).toBe('<path d="M13 7h-2v4"/>')
  })

  it('keeps a FontAwesome-style 512 viewBox', () => {
    expect(iconFromSvg('<svg viewBox="0 0 512 512"><path d="M233 406"/></svg>').viewBox).toBe(
      '0 0 512 512'
    )
  })

  it('ignores a leading <?xml?>/comment and accepts single-quoted attrs', () => {
    const def = iconFromSvg(
      "<?xml version='1.0'?><!-- icon --><svg viewBox='0 0 24 24' fill='red'><path d='M0 0'/></svg>"
    )
    expect(def.viewBox).toBe('0 0 24 24')
    expect(def.svgProps).toEqual({ fill: 'red' })
    expect(innerHtml(def)).toBe("<path d='M0 0'/>")
  })

  it('strips width/height so core controls the size', () => {
    const def = iconFromSvg(
      '<svg width="48" height="48" viewBox="0 0 24 24"><path d="M0 0"/></svg>'
    )
    expect(def.svgProps).toBeUndefined()
  })

  it('passes nested inner markup through verbatim', () => {
    const def = iconFromSvg('<svg viewBox="0 0 24 24"><g><path d="a"/><path d="b"/></g></svg>')
    expect(innerHtml(def)).toBe('<g><path d="a"/><path d="b"/></g>')
  })

  it('treats bare inner markup (no <svg> wrapper) as content with defaults', () => {
    const def = iconFromSvg('<path d="M0 0h1v1H0z"/>')
    expect(def.viewBox).toBeUndefined()
    expect(def.svgProps).toBeUndefined()
    expect(innerHtml(def)).toBe('<path d="M0 0h1v1H0z"/>')
  })
})

// ─── B — React element input ─────────────────────────────────────────────────

describe('iconFromSvg — element input', () => {
  it('unwraps a React <svg> via props/children, dropping size (nested-svg prevention)', () => {
    const def = iconFromSvg(
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={24}>
        <path d="M5 12h14" />
      </svg>
    )
    expect(def.viewBox).toBe('0 0 24 24')
    expect(def.svgProps).toEqual({ fill: 'none', stroke: 'currentColor', strokeWidth: 2 })
    // content is the children, NOT the <svg> — so core won't double-wrap.
    const content = def.content as ReactElement
    expect(content.type).toBe('path')
  })

  it('routes a non-<svg> element to content directly', () => {
    const path = <path d="M0 0" />
    const def = iconFromSvg(path)
    expect(def.content).toBe(path)
    expect(def.viewBox).toBeUndefined()
    expect(def.svgProps).toBeUndefined()
  })
})

// ─── C — passthrough & interning ─────────────────────────────────────────────

describe('iconFromSvg — passthrough & interning', () => {
  it('returns an IconDefinition unchanged', () => {
    const def: IconDefinition = { content: <path d="x" />, viewBox: '0 0 10 10' }
    expect(iconFromSvg(def)).toBe(def)
    expect(isValidElement(def)).toBe(false) // sanity: a definition isn't an element
  })

  it('interns string inputs — same string returns the same reference', () => {
    const s = '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>'
    expect(iconFromSvg(s)).toBe(iconFromSvg(s))
  })

  it('returns distinct references for different strings', () => {
    expect(iconFromSvg('<svg><path d="a"/></svg>')).not.toBe(
      iconFromSvg('<svg><path d="b"/></svg>')
    )
  })
})
