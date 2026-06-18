import { useState } from 'react'
import { JsonEditor, type CustomNodeDefinition, type JsonData } from '@json-edit-react'
import { not, root } from '@json-edit-react/utils/filters'
import { initialData } from './data'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// A spy dossier showing the `keyComponent` property of Custom
// Nodes: a definition can render its own component in place of
// the property label, for both value AND collection nodes.
// Five inline definitions are at work here.
//
// Try: double-click any customised key to enter the standard
// key-edit input — rename `REDACTED_passportId` to drop the
// prefix and watch the redaction lift.

export { initialData }

// A small glossary of agent codenames and field abbreviations,
// passed via `componentProps` to the matching custom-key
// component (definition 3).
const codenameGlossary: Record<string, string> = {
  M: 'handler',
  Q: 'quartermaster',
  dob: 'date of birth',
  bp: 'blood pressure',
}

// New keys can be added/deleted anywhere except the root.
export const allowAdd = not(root)
export const allowDelete = not(root)

// eslint-disable-next-line -- any is correct here
export const customNodeDefinitions: CustomNodeDefinition<Record<string, any>>[] = [
  // 1. "REDACTED_" prefix — blacked-out key, original
  // visible on hover. Must come before the `_` matcher;
  // ordering it first is cleaner.
  {
    condition: ({ key }) => typeof key === 'string' && key.startsWith('REDACTED_'),
    keyComponent: ({ name, canEditKey, styles, handleClick, startEditingKey }) => {
      const display = String(name)
      return (
        <span
          className="jer-key-text"
          style={{ ...styles, cursor: 'help' }}
          onClick={handleClick}
          onDoubleClick={() => canEditKey && startEditingKey()}
          title={`Encrypted key — double-click to reveal: ${display}`}
        >
          <span
            style={{
              backgroundColor: 'black',
              color: 'black',
              padding: '0 0.3em',
              borderRadius: '2px',
              letterSpacing: '-0.05em',
            }}
          >
            {display.replace(/\S/g, '█')}
          </span>
          <span className="jer-key-colon" style={{ marginLeft: '0.25em' }}>
            :
          </span>
        </span>
      )
    },
  },
  // 2. "_" prefix — classified (italic + lock). Works for
  // value AND collection keys: expand `_emergencyContact`
  // to see the collection-key case.
  {
    condition: ({ key }) => typeof key === 'string' && key.startsWith('_'),
    keyComponent: ({ name, canEditKey, styles, handleClick, startEditingKey }) => (
      <span
        className="jer-key-text"
        style={{ ...styles, fontStyle: 'italic', opacity: 0.85 }}
        onClick={handleClick}
        onDoubleClick={() => canEditKey && startEditingKey()}
      >
        <span style={{ marginRight: '0.25em' }} aria-hidden="true">
          🔒
        </span>
        {String(name)}
        <span className="jer-key-colon">:</span>
      </span>
    ),
  },
  // 3. Codename glossary — keys in the map get a subscript
  // expansion. `componentProps` carries the map so a single
  // component can serve many keys.
  {
    condition: ({ key }) =>
      typeof key === 'string' && key in (codenameGlossary as Record<string, string>),
    componentProps: { glossary: codenameGlossary },
    keyComponent: ({
      name,
      canEditKey,
      styles,
      handleClick,
      startEditingKey,
      componentProps,
    }) => {
      const glossary = (componentProps as { glossary: Record<string, string> } | undefined)
        ?.glossary
      return (
        <span
          className="jer-key-text"
          style={{
            ...styles,
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '0.35em',
          }}
          onClick={handleClick}
          onDoubleClick={() => canEditKey && startEditingKey()}
        >
          <span>{String(name)}</span>
          {glossary?.[String(name)] && (
            <span
              style={{
                fontSize: '0.7em',
                fontStyle: 'italic',
                opacity: 0.6,
                whiteSpace: 'nowrap',
              }}
            >
              ({glossary[String(name)]})
            </span>
          )}
          <span className="jer-key-colon">:</span>
        </span>
      )
    },
  },
  // 4. "!" suffix — priority badge. Shows the rendered key
  // text can differ from the stored key (we strip the "!").
  {
    condition: ({ key }) => typeof key === 'string' && key.endsWith('!'),
    keyComponent: ({ name, canEditKey, styles, handleClick, startEditingKey }) => {
      const display = String(name).slice(0, -1)
      return (
        <span
          className="jer-key-text"
          style={{ ...styles, color: '#c0392b', fontWeight: 'bold' }}
          onClick={handleClick}
          onDoubleClick={() => canEditKey && startEditingKey()}
        >
          <span style={{ marginRight: '0.25em' }} aria-hidden="true">
            ⚠️
          </span>
          {display}
          <span className="jer-key-colon">:</span>
        </span>
      )
    },
  },
  // 5. Field-report URLs — `keyComponent` AND `component` on
  // one node: a link icon in the key, a clickable anchor in
  // the value. Scoped via `path.includes('Field Reports')`
  // so it doesn't fight with normal string values elsewhere.
  {
    condition: ({ value, path }) =>
      typeof value === 'string' &&
      /^https?:\/\/.+\..+$/.test(value) &&
      path.includes('Field Reports'),
    keyComponent: ({ name, canEditKey, styles, handleClick, startEditingKey }) => (
      <span
        className="jer-key-text"
        style={{ ...styles }}
        onClick={handleClick}
        onDoubleClick={() => canEditKey && startEditingKey()}
      >
        <span style={{ marginRight: '0.25em' }} aria-hidden="true">
          🔗
        </span>
        {String(name)}
        <span className="jer-key-colon">:</span>
      </span>
    ),
    component: ({ nodeData, getStyles, setIsEditing }) => {
      const url = nodeData.value as string
      const styles = getStyles('string', nodeData)
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            ...styles,
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '85%',
          }}
          onClick={(e) => {
            if (e.getModifierState('Control') || e.getModifierState('Meta')) {
              e.preventDefault()
              setIsEditing(true)
            }
          }}
        >
          {url}
        </a>
      )
    },
    showOnView: true,
    showOnEdit: false,
  },
]

export default function CustomKeys() {
  const [data, setData] = useState<JsonData>(initialData)

  return (
    <JsonEditor
      data={data}
      setData={setData}
      {...useExampleProps()} // ---cut---
      rootName="dossier"
      collapse={2}
      allowAdd={allowAdd}
      allowDelete={allowDelete}
      customNodeDefinitions={customNodeDefinitions}
    />
  )
}
