import { useRef, useState } from 'react'
import {
  JsonEditor,
  isCollection,
  type FilterFunction,
  type JsonEditorHandle,
  type OnEditEventFunction,
} from '@json-edit-react'
import { useEditorDefaults, useEditorPalette, useToast } from '@example-resources'
import { createNotify, label, parsePath, styles, valueAtPath } from './exampleHelpers'

// A user record with several edit restrictions (allowEdit /
// allowDelete / allowAdd filters), so an imperative Start Edit
// often comes back RESTRICTED: the root and `id` are read-only,
// the whole `settings` object is locked (keys and values);
// only leaf values can be deleted, and `roles` accepts adds.
const initialData = {
  id: 'usr_5b7e21',
  username: 'marie',
  profile: {
    displayName: 'Marie Curie',
    title: 'Physicist & Chemist',
    yearOfBirth: 1867,
    affiliation: {
      institution: 'University of Paris',
      laboratory: 'Radium Institute',
      role: 'Professor',
    },
  },
  roles: ['admin', 'author'],
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  },
}

// `settings` is fully read-only: blocking its own node and every
// node directly under it (parent key === 'settings').
const allowEdit: FilterFunction = ({ level, key, path }) =>
  level !== 0 && key !== 'id' && key !== 'settings' && path[path.length - 2] !== 'settings'
const allowDelete: FilterFunction = ({ size, key, path }) =>
  size === null && key !== 'id' && path[path.length - 2] !== 'settings'
const allowAdd: FilterFunction = ({ size, key }) => (size !== null ? key === 'roles' : true)

export default function ImperativeControl() {
  const [data, setData] = useState(initialData)
  const editorRef = useRef<JsonEditorHandle>(null)
  const notify = createNotify(useToast())
  const css = styles(useEditorPalette())

  const [path, setPath] = useState('profile.displayName')
  const [editing, setEditing] = useState(false)
  const [bypass, setBypass] = useState(false)
  const [includeChildren, setIncludeChildren] = useState(false)

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
    // Collapsing a leaf (or missing path) is a silent no-op
    // in core — guard it here and report, rather than toast
    // as if something happened.
    if (!isCollection(valueAtPath(data, target))) {
      notify('Nothing to collapse', 'warning', `${label(target)} is not a collection`)
      return
    }
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

  return (
    <div>
      <div style={css.panel}>
        {/* Line 1: the target node's path */}
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="path, e.g. profile.displayName"
          style={css.input}
        />

        {/* Line 2: open a session, then confirm / cancel */}
        <div style={css.row}>
          <button style={css.button} onClick={startEdit}>
            Start Edit
          </button>
          {editing && (
            <div style={css.confirmGroup}>
              <button style={css.button} onClick={() => editorRef.current?.confirm()}>
                Confirm
              </button>
              <button style={css.button} onClick={() => editorRef.current?.cancel()}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Line 3: skip the allowEdit filter for startEdit */}
        <label style={css.check}>
          <input
            type="checkbox"
            checked={bypass}
            onChange={(e) => setBypass(e.target.checked)}
            style={css.checkbox}
          />
          Bypass edit restrictions
        </label>

        {/* Line 4: collapse / expand, optionally children */}
        <div style={css.row}>
          <button style={css.button} onClick={() => setCollapsed(true)}>
            Collapse
          </button>
          <button style={css.button} onClick={() => setCollapsed(false)}>
            Expand
          </button>
          <label style={css.check}>
            <input
              type="checkbox"
              checked={includeChildren}
              onChange={(e) => setIncludeChildren(e.target.checked)}
              style={css.checkbox}
            />
            Include children
          </label>
        </div>
      </div>

      <div style={css.editorBox}>
        <JsonEditor
          data={data}
          setData={setData}
          {...useEditorDefaults()}
          editorRef={editorRef}
          rootName=""
          allowEdit={allowEdit}
          allowDelete={allowDelete}
          allowAdd={allowAdd}
          onEditEvent={onEditEvent}
        />
      </div>
    </div>
  )
}
