/**
 * @jest-environment node
 */
import { renderToString } from 'react-dom/server'
import { JsonEditor } from '../src/JsonEditor'

const noop = () => {}

// In a server environment there is no `document`/`window`. The editor renders
// its real content there (rather than nothing), so hydration swaps like-for-
// like and the surrounding layout doesn't shift. The two theme CSS custom
// properties that need the document root are written by a browser-only effect,
// so they simply land at hydration.
describe('server-side rendering', () => {
  test('renders real content with no DOM available', () => {
    const html = renderToString(
      <JsonEditor data={{ name: 'Bob', age: 42 }} setData={noop} rootName="person" />
    )
    expect(html).toContain('name')
    expect(html).toContain('Bob')
    expect(html).toContain('age')
    expect(html).toContain('42')
  })

  test('does not throw when window/document are undefined', () => {
    expect(() =>
      renderToString(<JsonEditor data={{ items: [1, 2, 3] }} setData={noop} />)
    ).not.toThrow()
  })
})
