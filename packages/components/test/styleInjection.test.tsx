/**
 * Per-component stylesheet injection (issue #398).
 *
 * Each component imports its `style.css` as a string and injects it from a
 * `useStyles` call, so that a consumer importing one definition carries that
 * component's CSS and no other's. These tests pin the consumer-visible
 * properties of that arrangement: the rules land before anything can observe
 * the markup unstyled, once per stylesheet however many nodes render, only for
 * the components actually on screen, and an existing sheet is updated rather
 * than duplicated.
 */

import { useState, useLayoutEffect } from 'react'
import { render } from '@testing-library/react'
import { JsonEditor, type JsonData } from 'json-edit-react'
import { Loading } from '../src/_common/Loading'
import { unixTimestampDefinition } from '../src/UnixTimestamp'

// The text test/style-mock.js stands in for every stylesheet's source.
const STUB = '/* stylesheet stub */'

const MARKER = 'data-jer-component-styles'

// `useStyles` stamps the stylesheet's id on the element it owns.
const sheets = (id?: string) =>
  Array.from(document.head.querySelectorAll(id ? `style[${MARKER}="${id}"]` : `style[${MARKER}]`))

// The injector dedupes against the DOM rather than module state, so removing
// the elements is a complete reset between tests.
afterEach(() => {
  sheets().forEach((el) => el.remove())
})

const Editor = ({ data }: { data: JsonData }) => {
  const [value, setValue] = useState(data)
  return (
    <JsonEditor
      data={value}
      setData={setValue}
      customNodeDefinitions={[unixTimestampDefinition()]}
    />
  )
}

describe('per-component stylesheet injection', () => {
  test('injects before any layout effect can observe the markup', () => {
    expect(sheets()).toHaveLength(0)

    const styledAtLayout: boolean[] = []
    // Mounted BEFORE the component, so its layout effect runs before the
    // component's own. Only an insertion effect can beat it — React runs those
    // for the whole commit ahead of every layout effect, which is also ahead of
    // the first point the browser could paint the markup unstyled.
    const Probe = () => {
      useLayoutEffect(() => {
        styledAtLayout.push(sheets('jer-loading').length === 1)
      }, [])
      return null
    }

    render(
      <>
        <Probe />
        <Loading />
      </>
    )

    expect(styledAtLayout).toEqual([true])
    expect(sheets('jer-loading')[0].textContent).toBe(STUB)
  })

  test('injects once, however many instances render', () => {
    render(
      <>
        <Loading />
        <Loading />
        <Loading />
      </>
    )

    expect(sheets('jer-loading')).toHaveLength(1)
  })

  test('a component carries its own stylesheet and no other', () => {
    render(<Editor data={{ created: 1739000000 }} />)

    expect(sheets('jer-unix-timestamp')).toHaveLength(1)
    expect(sheets()).toHaveLength(1)
  })

  test('updates an existing element instead of appending a second', () => {
    // Stands in for the sheet left by a previous module instance — e.g. the one
    // Vite's HMR replaces when a component's stylesheet is edited in `pnpm dev`.
    const stale = document.createElement('style')
    stale.setAttribute(MARKER, 'jer-loading')
    stale.textContent = '/* stale */'
    document.head.appendChild(stale)

    render(<Loading />)

    expect(sheets('jer-loading')).toHaveLength(1)
    expect(stale.textContent).toBe(STUB)
  })
})
