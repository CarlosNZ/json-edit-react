import { useState } from 'react'
import { JsonEditor, type JsonData } from 'json-edit-react'
import { initialData as starWarsData } from './examples/static/star-wars/data'

// A deliberately bare page: rendered OUTSIDE ChakraProvider (unlike every other
// route) and with no UI-framework CSS reset in scope — only the editor's own
// bundled styles apply, plus index.css's body font. This is what a consumer who
// drops `JsonEditor` onto a plain HTML page sees, so it's a handy reference for
// checking the library's self-contained styling (e.g. the <button> appearance
// reset in core's style.css). Reachable at /raw-html.
export const RawHtmlPage = () => {
  const [jsonData, setJsonData] = useState<JsonData>(starWarsData as JsonData)

  return (
    <div style={{ padding: '2em', maxWidth: 800, margin: '0 auto' }}>
      <h1>Bare JsonEditor — no UI library</h1>
      <p>
        This page is rendered outside <code>ChakraProvider</code> and any UI-framework CSS reset, so
        it shows how <code>JsonEditor</code> looks with only its own bundled styles — the
        bare-consumer experience.
      </p>
      <JsonEditor data={jsonData} setData={setJsonData} collapse={2} showIconTooltips />
    </div>
  )
}

export default RawHtmlPage
