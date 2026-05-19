import { useMemo, useState, CSSProperties } from 'react'
import { CustomNodeDefinition, CustomNodeProps, JsonEditor } from '@json-edit-react'
import {
  createSearchHighlightKeyDefinition,
  createSearchHighlightNodeDefinition,
} from '../components/SearchHighlight'
import {
  buildJsonTokenMap,
  locateRegexSlicesInRaw,
  locateExactSlicesInRaw,
  SearchHighlightProps,
} from '../components/SearchHighlight/component'
import { decorateMessage, DecorationList, DecorationSlice } from '../components/SearchHighlight/decorateMessage'

const DEFAULT_SEARCH = 'vel":"error","message":"Request failed with unexpected error","request":{"method":"PO'
const DEFAULT_LINK_REGEX = String.raw`(?:error|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|"status":\s*500)`

const sampleData = {
  service: 'api-gateway',
  level: 'error',
  message: 'Request failed with unexpected error',
  request: {
    method: 'POST',
    path: '/api/v2/users',
    traceId: 'a3f1c2d4-beef-4b1e-9a2e-0f3c1e2d4a5b',
    correlationId: 'b7e2d1c3-cafe-4a3f-8b1e-1c2d3e4f5a6b',
  },
  response: {
    status: 500,
    error: 'InternalServerError',
    details: 'Timeout connecting to upstream service',
  },
  errorContext: {
    upstreamErrorCode: 'ETIMEDOUT',
    retryAfterMs: 2000,
  },
  user: {
    id: 'c1d2e3f4-dead-4a5b-9c8d-7e6f5a4b3c2d',
    email: 'alice@example.com',
    role: 'admin',
  },
  tags: ['error', 'timeout', 'upstream'],
  retryable: true,
  duration_ms: 3042,
}

export default function SearchHighlightDemo() {
  const [searchText, setSearchText] = useState(DEFAULT_SEARCH)
  const [linkRegexText, setLinkRegexText] = useState(DEFAULT_LINK_REGEX)
  const [regexError, setRegexError] = useState<string | null>(null)

  const linkRegex = useMemo(() => {
    if (!linkRegexText) { setRegexError(null); return null }
    try {
      const re = new RegExp(linkRegexText, 'gi')
      setRegexError(null)
      return re
    } catch (e) {
      setRegexError((e as Error).message)
      return null
    }
  }, [linkRegexText])

  const handleLinkClick = (text: string) => {
    setSearchText(text)
  }

  const rawJson = useMemo(() => JSON.stringify(sampleData), [])
  const tokenMap = useMemo(() => buildJsonTokenMap(rawJson), [rawJson])
  const rawSearchSlices = useMemo(
    () => locateExactSlicesInRaw(rawJson, searchText),
    [rawJson, searchText],
  )
  const rawLinkSlices = useMemo(
    () => (linkRegex ? locateRegexSlicesInRaw(rawJson, linkRegex) : []),
    [rawJson, linkRegex],
  )

  const sharedProps = useMemo(
    () => ({ searchText, onLinkClick: handleLinkClick, tokenMap, rawSearchSlices, rawLinkSlices }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchText, tokenMap, rawSearchSlices, rawLinkSlices],
  )

  const nodeDefinitions = useMemo(
    () => createSearchHighlightNodeDefinition(sharedProps),
    [sharedProps],
  )

  const keyDefinitions = useMemo(
    () => createSearchHighlightKeyDefinition(sharedProps),
    [sharedProps],
  )

  const legacyNodeDefinitions = useMemo(
    () => createLegacyNodeDefinition(sharedProps),
    [sharedProps],
  )

  return (
    <div style={{ width: '100%', maxWidth: 860 }}>
      <h2>Search &amp; Link Highlighting</h2>
      <p style={{ marginBottom: '1em', color: '#555', fontSize: '0.9em' }}>
        The <strong>Highlight</strong> field does exact case-insensitive matching — try any
        arbitrary substring, including ones that span a key–value boundary like{' '}
        <code>"status":500</code>. The <strong>Links</strong> field is a regular expression —
        matching text becomes a clickable link that sets the highlight to the matched value. Both
        run against the raw JSON string so cross-boundary matches work in all three views.
      </p>

      <div style={{ display: 'flex', gap: '1em', marginBottom: '1.2em', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: '0.85em', fontWeight: 600 }}>Highlight (exact match)</span>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder='e.g. error'
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2, minWidth: 280 }}>
          <span style={{ fontSize: '0.85em', fontWeight: 600 }}>Links (regex)</span>
          <input
            type="text"
            value={linkRegexText}
            onChange={(e) => setLinkRegexText(e.target.value)}
            placeholder='e.g. error|[0-9a-f-]{36}'
            style={{ ...inputStyle, borderColor: regexError ? '#e55' : inputStyle.borderColor }}
          />
          {regexError && <span style={{ fontSize: '0.75em', color: '#e55' }}>{regexError}</span>}
        </label>
      </div>

      <RawJsonPanel
        rawJson={rawJson}
        rawSearchSlices={rawSearchSlices}
        rawLinkSlices={rawLinkSlices}
        onLinkClick={handleLinkClick}
      />

      <div style={{ display: 'flex', gap: '1.5em', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <h3 style={{ marginBottom: '0.4em' }}>With custom keys and nodes</h3>
          <JsonEditor
            data={sampleData}
            viewOnly
            rootName=""
            showCollectionCount="when-closed"
            customNodeDefinitions={nodeDefinitions}
            customKeyDefinitions={keyDefinitions}
          />
        </div>

        <div style={{ flex: 1, minWidth: 320 }}>
          <h3 style={{ marginBottom: '0.4em' }}>With custom nodes</h3>
          <JsonEditor
            data={sampleData}
            viewOnly
            rootName=""
            showCollectionCount="when-closed"
            customNodeDefinitions={nodeDefinitions}
          />
        </div>

        <div style={{ flex: 1, minWidth: 320 }}>
          <h3 style={{ marginBottom: '0.4em' }}>Before: hideKey + custom node</h3>
          <p style={{ fontSize: '0.78em', color: '#888', marginBottom: '0.5em' }}>
            Keys rendered manually inside the node. No <code>customKeyDefinitions</code> — key
            style is hardcoded, collection keys are unstyled, and cross-boundary matches are
            impossible.
          </p>
          <JsonEditor
            data={sampleData}
            viewOnly
            rootName=""
            showCollectionCount="when-closed"
            customNodeDefinitions={legacyNodeDefinitions}
          />
        </div>
      </div>
    </div>
  )
}

// ---- "Before" approach: hideKey + custom node rendering key manually ----
// Limitations vs customKeyDefinitions:
//  - Key style is hardcoded (no access to theme-aware getStyles for 'property')
//  - Collection node keys can't be decorated (hideKey doesn't apply to collections)
//  - Cross-boundary key:value matches don't work — the node only sees its own value
const LegacyHighlightNode: React.FC<CustomNodeProps<SearchHighlightProps>> = ({
  value,
  nodeData,
  getStyles,
  customNodeProps: props,
}) => {
  const displayValue = typeof value === 'string' ? `"${value}"` : String(value)
  const themeType =
    value === null ? 'null' : typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string'
  const valueStyle = getStyles(themeType, nodeData)

  if (!props) return <span style={valueStyle}>{nodeData.key}: {displayValue}</span>

  const { rawSearchSlices, rawLinkSlices, onLinkClick, tokenMap } = props

  const keyToken = tokenMap.find(
    (t) => t.role === 'key' && JSON.stringify(t.path) === JSON.stringify(nodeData.path),
  )
  const valueToken = tokenMap.find(
    (t) => t.role === 'value' && JSON.stringify(t.path) === JSON.stringify(nodeData.path),
  )

  // Build a combined "key: value" display string and project slices into it
  const keyText = String(nodeData.key)
  const SEPARATOR = ': '
  const combined = keyText + SEPARATOR + displayValue
  const valueOffset = keyText.length + SEPARATOR.length

  const searchSlices: Array<DecorationSlice> = [
    ...(keyToken ? rawSearchSlices
      .filter((s) => s.b > keyToken.startInRaw + 1 && s.a < keyToken.endInRaw - 1)
      .map((s) => ({
        a: Math.max(s.a, keyToken.startInRaw + 1) - (keyToken.startInRaw + 1),
        b: Math.min(s.b, keyToken.endInRaw - 1) - (keyToken.startInRaw + 1),
      })) : []),
    ...(valueToken ? rawSearchSlices
      .filter((s) => s.b > valueToken.startInRaw && s.a < valueToken.endInRaw)
      .map((s) => ({
        a: valueOffset + Math.max(s.a, valueToken.startInRaw) - valueToken.startInRaw,
        b: valueOffset + Math.min(s.b, valueToken.endInRaw) - valueToken.startInRaw,
      })) : []),
  ]

  const linkSlices: Array<DecorationSlice<{ text: string }>> = [
    ...(keyToken ? rawLinkSlices
      .filter((s) => s.b > keyToken.startInRaw + 1 && s.a < keyToken.endInRaw - 1)
      .map((s) => ({
        a: Math.max(s.a, keyToken.startInRaw + 1) - (keyToken.startInRaw + 1),
        b: Math.min(s.b, keyToken.endInRaw - 1) - (keyToken.startInRaw + 1),
        extra: s.extra,
      })) : []),
    ...(valueToken ? rawLinkSlices
      .filter((s) => s.b > valueToken.startInRaw && s.a < valueToken.endInRaw)
      .map((s) => ({
        a: valueOffset + Math.max(s.a, valueToken.startInRaw) - valueToken.startInRaw,
        b: valueOffset + Math.min(s.b, valueToken.endInRaw) - valueToken.startInRaw,
        extra: s.extra,
      })) : []),
  ]

  const searchList = searchSlices as DecorationList
  searchList.allowSplit = true
  searchList.callback = (children, key) => (
    <mark key={key} style={{ background: '#ffe066', borderRadius: 2, padding: '0 1px' }}>
      {children}
    </mark>
  )

  const linkList = linkSlices as DecorationList<{ text: string }>
  linkList.allowSplit = false
  linkList.callback = (children, key, extra) => (
    <a key={key} href="#" style={{ color: 'inherit', textDecorationStyle: 'dotted' }}
      onClick={(e) => { e.preventDefault(); onLinkClick(extra?.text ?? '') }}>
      {children}
    </a>
  )

  return (
    // Key style is hardcoded — no way to get the theme's 'property' colour here
    <span>
      <span style={{ color: '#666', fontWeight: 500 }}>
        {decorateMessage(combined, [linkList, searchList])}
      </span>
    </span>
  )
}

const createLegacyNodeDefinition = (
  customNodeProps: SearchHighlightProps,
): Array<CustomNodeDefinition> => [
  {
    condition: ({ value }) => !(typeof value === 'object' && value !== null),
    element: LegacyHighlightNode as React.FC<CustomNodeProps>,
    customNodeProps,
    hideKey: true,
    showOnView: true,
    name: 'LegacyHighlightNode',
  },
]

interface RawJsonPanelProps {
  rawJson: string
  rawSearchSlices: Array<DecorationSlice>
  rawLinkSlices: Array<DecorationSlice<{ text: string }>>
  onLinkClick: (text: string) => void
}

function RawJsonPanel({ rawJson, rawSearchSlices, rawLinkSlices, onLinkClick }: RawJsonPanelProps) {
  const searchList = [...rawSearchSlices] as DecorationList
  searchList.allowSplit = true
  searchList.callback = (children, key) => (
    <mark key={key} style={{ background: '#ffe066', borderRadius: 2, padding: '0 1px' }}>
      {children}
    </mark>
  )

  const linkList = [...rawLinkSlices] as DecorationList<{ text: string }>
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

  const decorated = decorateMessage(rawJson, [linkList, searchList])

  return (
    <div style={{ marginBottom: '1.5em' }}>
      <h3 style={{ marginBottom: '0.4em' }}>Raw JSON</h3>
      <pre style={rawPanelStyle}>{decorated}</pre>
    </div>
  )
}

const rawPanelStyle: CSSProperties = {
  background: '#f5f5f5',
  border: '1px solid #ddd',
  borderRadius: 6,
  padding: '0.8em 1em',
  fontSize: '0.82em',
  fontFamily: 'monospace',
  whiteSpace: 'normal',
  wordBreak: 'break-all',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '0.9em',
  borderRadius: 6,
  border: '1px solid #bbb',
  fontFamily: 'monospace',
  outline: 'none',
}
