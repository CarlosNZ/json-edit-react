/**
 * Stylesheet injection (issue #396).
 *
 * The CSS is inlined into the bundle as a plain string and injected by
 * `injectStyles`, called from a `useInsertionEffect` in `JsonEditor`, so that
 * importing a helper on its own doesn't drag the stylesheet along with it.
 * These tests pin the consumer-visible properties of that arrangement: the
 * rules land before anything can observe the tree unstyled, they land once
 * however many editors mount, the viewer gets them too, and an existing sheet
 * is reused rather than duplicated.
 */

import { useLayoutEffect } from 'react'
import { render } from '@testing-library/react'
import { JsonEditor } from '../src/JsonEditor'
import { JsonViewer } from '../src/JsonViewer'

const noop = () => {}

// The text test/style-mock.js stands in for the stylesheet source.
const STUB = '/* stylesheet stub */'

// `injectStyles` stamps a marker attribute on the element it owns.
const injectedStyles = () => Array.from(document.head.querySelectorAll('style[data-jer-styles]'))

// The injector dedupes against the DOM rather than module state, so removing
// the element is a complete reset between tests.
afterEach(() => {
  injectedStyles().forEach((el) => el.remove())
})

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
    expect(injectedStyles()[0].textContent).toBe(STUB)
  })

  test('injects once, however many editors mount', () => {
    render(<JsonEditor data={{ a: 1 }} setData={noop} />)
    render(<JsonEditor data={{ b: 2 }} setData={noop} />)

    expect(injectedStyles()).toHaveLength(1)
  })

  test('a viewer on its own injects the stylesheet', () => {
    expect(injectedStyles()).toHaveLength(0)

    render(<JsonViewer data={{ b: 2 }} />)

    expect(injectedStyles()).toHaveLength(1)
  })

  test('reuses an existing marked element instead of appending a second', () => {
    // Stands in for the sheet left by a previous module instance — e.g. the
    // one Vite's HMR replaces when the stylesheet is edited in `pnpm dev`.
    const stale = document.createElement('style')
    stale.setAttribute('data-jer-styles', '')
    stale.textContent = '/* stale */'
    document.head.appendChild(stale)

    render(<JsonEditor data={{ a: 1 }} setData={noop} />)

    expect(injectedStyles()).toHaveLength(1)
    expect(stale.textContent).toBe(STUB)
  })
})
