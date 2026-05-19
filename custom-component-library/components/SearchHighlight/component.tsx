import React from 'react'
import { CustomKeyProps, CustomNodeProps } from '@json-edit-react'
import { DecorationList, DecorationSlice, decorateMessage } from './decorateMessage'
import { buildJsonTokenMap, JsonToken } from './buildJsonTokenMap'

export interface SearchHighlightProps extends Record<string, unknown> {
  searchText: string
  onLinkClick: (text: string) => void
  tokenMap: Array<JsonToken>
  rawSearchSlices: Array<DecorationSlice>
  rawLinkSlices: Array<DecorationSlice<{ text: string }>>
}

const SEPARATOR = ': '

// Locate all non-overlapping exact matches of needle in rawJson (case-insensitive)
export const locateExactSlicesInRaw = (rawJson: string, needle: string): Array<DecorationSlice> => {
  if (!needle) return []
  const slices: Array<DecorationSlice> = []
  const lower = rawJson.toLowerCase()
  const needleLower = needle.toLowerCase()
  let idx = 0
  while ((idx = lower.indexOf(needleLower, idx)) !== -1) {
    slices.push({ a: idx, b: idx + needle.length })
    idx += needle.length
  }
  return slices
}

// Locate all regex matches in rawJson
export const locateRegexSlicesInRaw = (
  rawJson: string,
  regex: RegExp,
): Array<DecorationSlice<{ text: string }>> => {
  const slices: Array<DecorationSlice<{ text: string }>> = []
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(rawJson)) !== null) {
    if (match.index === re.lastIndex) { re.lastIndex++; continue }
    slices.push({ a: match.index, b: match.index + match[0].length, extra: { text: match[0] } })
  }
  return slices
}

// Project raw slices (against rawJson coords) into display-string coords for a given token span
const projectRawToDisplay = <TExtra,>(
  rawSlices: Array<DecorationSlice<TExtra>>,
  rawStart: number,
  rawEnd: number,
  displayOffset = 0,
): Array<DecorationSlice<TExtra>> => {
  const result: Array<DecorationSlice<TExtra>> = []
  for (const s of rawSlices) {
    if (s.b <= rawStart || s.a >= rawEnd) continue
    result.push({
      a: displayOffset + Math.max(s.a, rawStart) - rawStart,
      b: displayOffset + Math.min(s.b, rawEnd) - rawStart,
      extra: s.extra,
    })
  }
  return result
}

// --- shared render helper ---

const renderDecorated = (
  displayText: string,
  searchSlices: Array<DecorationSlice>,
  linkSlices: Array<DecorationSlice<{ text: string }>>,
  onLinkClick: (text: string) => void,
  wrapper: (children: React.ReactNode) => React.ReactNode,
): React.ReactNode => {
  const searchList = [...searchSlices] as DecorationList
  searchList.allowSplit = true
  searchList.callback = (children, key) => (
    <mark key={key} style={{ background: '#ffe066', borderRadius: 2, padding: '0 1px' }}>
      {children}
    </mark>
  )

  const linkList = [...linkSlices] as DecorationList<{ text: string }>
  linkList.allowSplit = false
  linkList.callback = (children, key, extra) => (
    <a
      key={key}
      href="#"
      style={{ color: 'inherit', textDecorationStyle: 'dotted' }}
      onClick={(e) => { e.preventDefault(); onLinkClick(extra?.text ?? '') }}
    >
      {children}
    </a>
  )

  return wrapper(decorateMessage(displayText, [linkList, searchList]))
}

// --- Node component ---

export const SearchHighlightNode: React.FC<CustomNodeProps> = ({
  value,
  nodeData,
  getStyles,
  customNodeProps: rawProps,
}) => {
  const props = rawProps as SearchHighlightProps | undefined
  const displayValue = typeof value === 'string' ? `"${value}"` : String(value)
  const themeType =
    value === null ? 'null' : typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string'
  const valueStyle = getStyles(themeType, nodeData)

  if (!props) return <span style={valueStyle}>{displayValue}</span>

  const { rawSearchSlices, rawLinkSlices, onLinkClick, tokenMap } = props
  const token = tokenMap.find(
    (t) => t.role === 'value' && JSON.stringify(t.path) === JSON.stringify(nodeData.path),
  )

  if (!token) return <span style={valueStyle}>{displayValue}</span>

  const searchSlices = projectRawToDisplay(rawSearchSlices, token.startInRaw, token.endInRaw)
  const linkSlices = projectRawToDisplay(rawLinkSlices, token.startInRaw, token.endInRaw)

  return renderDecorated(
    displayValue,
    searchSlices,
    linkSlices,
    onLinkClick,
    (children) => <span style={valueStyle}>{children}</span>,
  )
}

// --- Key component ---

export const SearchHighlightKey: React.FC<CustomKeyProps> = ({
  nodeData,
  styles,
  customKeyProps: rawProps,
}) => {
  const props = rawProps as SearchHighlightProps | undefined
  const keyText = String(nodeData.key)

  if (!props) return <span style={styles}>{keyText}{SEPARATOR}</span>

  const { rawSearchSlices, rawLinkSlices, onLinkClick, tokenMap } = props
  const token = tokenMap.find(
    (t) => t.role === 'key' && JSON.stringify(t.path) === JSON.stringify(nodeData.path),
  )

  if (!token) return <span style={styles}>{keyText}{SEPARATOR}</span>

  // Key token includes surrounding quotes in raw JSON; display text does not
  const searchSlices = projectRawToDisplay(rawSearchSlices, token.startInRaw + 1, token.endInRaw - 1)
  const linkSlices = projectRawToDisplay(rawLinkSlices, token.startInRaw + 1, token.endInRaw - 1)

  return renderDecorated(
    keyText,
    searchSlices,
    linkSlices,
    onLinkClick,
    (children) => <span style={styles}>{children}{SEPARATOR}</span>,
  )
}

export { buildJsonTokenMap }
