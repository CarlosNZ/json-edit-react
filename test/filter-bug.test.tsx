/**
 * Prevents a possible bug where an intermediate collection whose key
 * matches the search filter but whose body has no path-aware-matched
 * descendants (e.g. an empty `{}`, or any subtree under a custom
 * `searchFilter` that doesn't consult `path`) drops out of the visible
 * set and drags its ancestors with it.
 *
 * Concrete repro: `{ rootContainer: { interestingThing: {} } }` +
 * `searchFilter: 'key'` + `searchText: 'interestingThing'`. The user
 * types a literal key from the data; the matching key must be reachable.
 */

import { render, screen } from '@testing-library/react'
import { JsonEditor } from '../src/JsonEditor'
import { computeFilterState, matchNodeKey } from '../src/utils/filter'
import { toPathString } from '../src/utils/pathTools'
import type { NodeData } from '../src/types'

const buildNd = (overrides: Partial<NodeData> & Pick<NodeData, 'value'>): NodeData => ({
  key: '',
  path: [],
  level: 0,
  index: 0,
  size: null,
  parentData: null,
  fullData: overrides.value,
  ...overrides,
})

describe('regression: intermediate collection match is preserved', () => {
  test('unit: ancestor stays visible when a key matches but the body is empty', () => {
    const data = { rootContainer: { interestingThing: {} } }
    const rootNd = buildNd({
      value: data,
      size: 1,
      fullData: data,
    })
    const fs = computeFilterState(rootNd, matchNodeKey, 'interestingThing')!
    expect(fs).not.toBeNull()
    // The matching node itself stays visible…
    expect(fs.visiblePaths.has(toPathString(['rootContainer', 'interestingThing']))).toBe(true)
    // …and so does its ancestor, otherwise the matching node never renders.
    expect(fs.visiblePaths.has(toPathString(['rootContainer']))).toBe(true)
  })

  test('render: the matching key is reachable in the DOM', () => {
    const data = { rootContainer: { interestingThing: {} } }
    render(
      <JsonEditor
        data={data}
        setData={() => {}}
        searchFilter="key"
        searchText="interestingThing"
        collapse={false}
      />
    )
    expect(screen.queryByText('interestingThing')).not.toBeNull()
  })

  test('render: a custom searchFilter that only inspects `key` still surfaces an intermediate match', () => {
    // The built-in matchNodeKey accidentally papered over the bug in many
    // cases because it checks the FULL PATH: deep leaves under a matching
    // key inherited the match via their path. A custom filter that only
    // looks at `key` (no path) doesn't get that rescue — this case used
    // to fail even with a non-empty body.
    const data = {
      rootContainer: {
        interestingThing: { unrelatedChild: 'plain-value' },
      },
    }
    render(
      <JsonEditor
        data={data}
        setData={() => {}}
        searchFilter={(nodeData, searchText) => String(nodeData.key) === searchText}
        searchText="interestingThing"
        collapse={false}
      />
    )
    expect(screen.queryByText('interestingThing')).not.toBeNull()
  })
})
