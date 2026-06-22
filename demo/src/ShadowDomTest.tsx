import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { JsonEditor } from 'json-edit-react'
// The published `json-edit-react/style.css` subpath, resolved through the
// demo's provider switch (local/build/pack/npm), so this page validates the
// real export. `?inline` makes Vite hand us the stylesheet as a string instead
// of injecting it into the document <head>, which is what lets us drop it into
// the shadow root.
import jerStyleText from 'json-edit-react/style.css?inline'

// Renders a JsonEditor inside a Shadow DOM. Head-injected styles can't cross the
// shadow boundary, so the editor is unstyled until the checkbox injects the
// stylesheet into the shadow root itself. Verifies issue #225.
export const ShadowDomTest = () => {
  const hostRef = useRef<HTMLDivElement>(null)
  const [shadow, setShadow] = useState<ShadowRoot | null>(null)
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null)
  const [injectStyles, setInjectStyles] = useState(false)
  const [data, setData] = useState<object>({
    name: 'Shadow DOM test',
    count: 3,
    enabled: true,
    nested: { a: 1, b: [true, false, null] },
  })

  // Attach the shadow root + a mount node once. Reuse any existing shadow root
  // so React's StrictMode double-invoke doesn't trip attachShadow (which throws
  // if the host already has one).
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    let mount = root.querySelector<HTMLDivElement>('div[data-jer-mount]')
    if (!mount) {
      mount = document.createElement('div')
      mount.setAttribute('data-jer-mount', '')
      root.appendChild(mount)
    }
    setShadow(root)
    setMountNode(mount)
  }, [])

  // Add/remove the stylesheet inside the shadow root as the checkbox toggles.
  useEffect(() => {
    if (!shadow) return
    const existing = shadow.querySelector('style[data-jer-test]')
    if (injectStyles && !existing) {
      const el = document.createElement('style')
      el.setAttribute('data-jer-test', '')
      el.textContent = jerStyleText
      shadow.appendChild(el)
    } else if (!injectStyles && existing) {
      existing.remove()
    }
  }, [shadow, injectStyles])

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Shadow DOM smoke test (#225)</h2>
      <label style={{ display: 'block', marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={injectStyles}
          onChange={(e) => setInjectStyles(e.target.checked)}
        />{' '}
        Inject <code>style.css</code> into the shadow root
      </label>
      <p style={{ maxWidth: 520, color: '#555' }}>
        Unchecked: the editor below renders <strong>unstyled</strong> (head-injected
        styles can't reach the shadow root). Checked: it renders fully styled —
        including the dropdown arrow and other custom-property-driven bits, which is
        what confirms the <code>:host</code> fix.
      </p>
      <div ref={hostRef} style={{ border: '1px solid #ccc', padding: 12, borderRadius: 6 }} />
      {mountNode &&
        createPortal(
          <JsonEditor data={data} setData={(d) => setData(d as object)} />,
          mountNode
        )}
    </div>
  )
}
