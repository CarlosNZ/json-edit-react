/**
 * Stylesheet injection (issue #396).
 *
 * The CSS is inlined into the bundle as a plain string and injected by
 * `injectStyles`, called from a `useInsertionEffect` in `JsonEditor`, so that
 * importing a helper on its own doesn't drag the stylesheet along with it.
 * These tests pin the two consumer-visible properties of that arrangement:
 * the rules land before anything can observe the tree unstyled, and they land
 * once however many editors mount.
 */

import { useLayoutEffect } from 'react'
import { render } from '@testing-library/react'
import { JsonEditor } from '../src/JsonEditor'
import { JsonViewer } from '../src/JsonViewer'

const noop = () => {}

// The text test/style-mock.js stands in for the stylesheet source.
const STUB = 'stylesheet stub'

const injectedStyles = () =>
  Array.from(document.head.querySelectorAll('style')).filter((el) => el.textContent?.includes(STUB))

describe('stylesheet injection', () => {
  test('injects before any layout effect can observe the tree', () => {
    expect(injectedStyles()).toHaveLength(0)

    const styledAtLayout: boolean[] = []
    // Mounted BEFORE the editor, so its layout effect runs before the editor's
    // own. Only an insertion effect can beat it — React runs those for the
    // whole commit ahead of every layout effect. A layout effect (let alone a
    // passive one) inside the editor would arrive after this point, which is
    // also after the browser could have painted the tree unstyled.
    const Probe = () => {
      useLayoutEffect(() => {
        styledAtLayout.push(injectedStyles().length === 1)
      }, [])
      return null
    }

    render(
      <>
        <Probe />
        <JsonEditor data={{ name: 'Bob' }} setData={noop} />
      </>
    )

    expect(styledAtLayout).toEqual([true])
    expect(injectedStyles()).toHaveLength(1)
  })

  test('injects once, however many editors and viewers mount', () => {
    render(<JsonEditor data={{ a: 1 }} setData={noop} />)
    render(<JsonViewer data={{ b: 2 }} />)

    expect(injectedStyles()).toHaveLength(1)
  })
})
