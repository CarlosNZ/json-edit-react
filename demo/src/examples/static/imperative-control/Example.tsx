import { useRef, useState, type CSSProperties } from 'react'
import {
  JsonEditor,
  type FilterFunction,
  type JsonEditorHandle,
  type OnEditEventFunction,
} from '@json-edit-react'
import {
  useEditorDefaults,
  useEditorPalette,
  useToast,
  type ToastStatus,
} from '@example-resources'

// A user record locked down with the same restrictions as the
// "Edit restrictions" example: the root and `id` are read-only,
// `settings` can't be edited as raw JSON, only leaf values can
// be deleted, and only `roles` accepts new items.
const initialData = {
  id: 'usr_5b7e21',
  username: 'marie',
  profile: {
    displayName: 'Marie Curie',
    title: 'Physicist & Chemist',
    yearOfBirth: 1867,
  },
  roles: ['admin', 'author'],
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  },
}

const allowEdit: FilterFunction = ({ level, key }) =>
  level !== 0 && key !== 'id' && key !== 'settings'
const allowDelete: FilterFunction = ({ size, key, path }) =>
  size === null && key !== 'id' && path[path.length - 2] !== 'settings'
const allowAdd: FilterFunction = ({ size, key }) => (size !== null ? key === 'roles' : true)

// "profile.displayName" → ['profile', 'displayName']; numeric
// segments (array indices) become numbers; blank → [] (root).
const parsePath = (input: string): (string | number)[] =>
  input
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (/^\d+$/.test(s) ? Number(s) : s))

const label = (path: (string | number)[]) => (path.length ? path.join(' › ') : '(root)')

export default function ImperativeControl() {
  const [data, setData] = useState(initialData)
  const editorRef = useRef<JsonEditorHandle>(null)
  const toast = useToast()
  const palette = useEditorPalette()

  const [path, setPath] = useState('profile.displayName')
  const [editing, setEditing] = useState(false)
  const [bypass, setBypass] = useState(false)
  const [includeChildren, setIncludeChildren] = useState(false)

  const notify = (title: string, status: ToastStatus, description?: string) =>
    toast({
      title,
      description,
      status,
      duration: 2500,
      isClosable: true,
      position: 'top-right',
      variant: 'left-accent',
    })

  // startEdit is synchronous and returns whether the session
  // opened (`true`) or why it didn't — surface that as a toast.
  const startEdit = () => {
    const target = parsePath(path)
    const result = editorRef.current?.startEdit({
      path: target,
      overrideRestrictions: bypass,
    })
    if (result === true) notify('Editing started', 'success', label(target))
    else if (result === 'RESTRICTED')
      notify('Restricted', 'warning', `allowEdit blocked ${label(target)}`)
    else if (result === 'PATH_NOT_FOUND') notify('Path not found', 'error', label(target))
  }

  const setCollapsed = (collapsed: boolean) => {
    const target = parsePath(path)
    editorRef.current?.collapse({ path: target, collapsed, includeChildren })
    notify(collapsed ? 'Collapsed' : 'Expanded', 'info', label(target))
  }

  // Keep the Confirm / Cancel buttons in step with the live
  // session — whether it opens / closes via these buttons or the
  // editor's own controls (e.g. the Escape key).
  const onEditEvent: OnEditEventFunction = (e) => {
    if (e.event === 'startEdit') setEditing(true)
    if (e.event === 'commitEdit' || e.event === 'cancelEdit') setEditing(false)
  }

  // The panel matches the header + editor cards: the editor's
  // background and a theme text colour, per the active theme.
  const panel: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6em',
    padding: '0.9em',
    marginBottom: '1em',
    borderRadius: 8,
    boxShadow: SHADOW,
    color: palette.string,
    ...palette.headerBg,
  }
  const input: CSSProperties = {
    padding: '0.4em 0.6em',
    fontSize: '0.95em',
    fontFamily: 'monospace',
    color: 'inherit',
    background: SURFACE,
    border: BORDER,
    borderRadius: 6,
  }
  const button: CSSProperties = {
    padding: '0.4em 0.9em',
    fontSize: '0.9em',
    color: palette.property,
    background: SURFACE,
    border: BORDER,
    borderRadius: 6,
    cursor: 'pointer',
  }
  const checkbox: CSSProperties = { accentColor: palette.property }

  return (
    <div>
      <div style={panel}>
        {/* Line 1: the target node's path */}
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="path, e.g. profile.displayName"
          style={input}
        />

        {/* Line 2: open a session, then confirm / cancel */}
        <div style={row}>
          <button style={button} onClick={startEdit}>
            Start Edit
          </button>
          {editing && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5em' }}>
              <button style={button} onClick={() => editorRef.current?.confirm()}>
                Confirm
              </button>
              <button style={button} onClick={() => editorRef.current?.cancel()}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Line 3: skip the allowEdit filter for startEdit */}
        <label style={check}>
          <input
            type="checkbox"
            checked={bypass}
            onChange={(e) => setBypass(e.target.checked)}
            style={checkbox}
          />
          Bypass edit restrictions
        </label>

        {/* Line 4: collapse / expand, optionally children */}
        <div style={row}>
          <button style={button} onClick={() => setCollapsed(true)}>
            Collapse
          </button>
          <button style={button} onClick={() => setCollapsed(false)}>
            Expand
          </button>
          <label style={check}>
            <input
              type="checkbox"
              checked={includeChildren}
              onChange={(e) => setIncludeChildren(e.target.checked)}
              style={checkbox}
            />
            Include children
          </label>
        </div>
      </div>

      <div style={editorBox}>
        <JsonEditor
          data={data}
          setData={setData}
          {...useEditorDefaults()}
          editorRef={editorRef}
          rootName="user"
          allowEdit={allowEdit}
          allowDelete={allowDelete}
          allowAdd={allowAdd}
          onEditEvent={onEditEvent}
        />
      </div>
    </div>
  )
}

// The control panel and the editor each sit in their own card
// (this example opts out of the shell's single shadow box via
// `selfChrome` in the registry).
const SHADOW = 'rgba(0, 0, 0, 0.24) 0px 3px 8px'
// Faint neutral fill + border for the controls — readable on any
// theme; text colours come from the palette (in-component).
const SURFACE = 'rgba(127, 127, 127, 0.12)'
const BORDER = '1px solid rgba(127, 127, 127, 0.4)'

const editorBox: CSSProperties = { borderRadius: 6, boxShadow: SHADOW }
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5em' }
const check: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4em',
  fontSize: '0.9em',
  cursor: 'pointer',
}
