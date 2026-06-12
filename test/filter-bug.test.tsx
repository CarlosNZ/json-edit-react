/**
 * Regression repros for the bug surfaced in dev-docs/search_analysis.md §10
 * (and v2-filtered-collection-count.md):
 *
 *   filterCollection (src/utils/filter.ts) recurses into a child collection
 *   *without* first testing the child's own matcher. So a collection whose
 *   key would match but whose body is empty (or whose descendants don't
 *   match) drops out, dragging all its ancestors with it.
 *
 * Concrete repro: { rootContainer: { interestingThing: {} } } + searchFilter
 * 'key' + searchText 'interestingThing'. The user types a literal key from
 * the data and sees nothing. See the markdown for the full trace.
 *
 * Tests use `test.failing` so today's suite stays green; remove `.failing`
 * once the single-pass walk fix lands and these flip into regression guards.
 */

import { render, screen } from '@testing-library/react'
import { JsonEditor } from '../src/JsonEditor'
import { filterNode, matchNodeKey } from '../src/utils/filter'
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

describe('filterCollection — intermediate collection match is missed', () => {
  test.failing(
    'unit: ancestor stays visible when a descendant key matches but its body is empty',
    () => {
      const data = { rootContainer: { interestingThing: {} } }
      const rootContainerNd = buildNd({
        key: 'rootContainer',
        path: ['rootContainer'],
        level: 1,
        value: data.rootContainer,
        size: 1,
        parentData: data,
        fullData: data,
      })
      // Today this returns false: filterCollection recurses into
      // { interestingThing: {} }, then into {}, hits [].some(...) → false,
      // and never tests matchNodeKey on 'interestingThing' itself.
      expect(filterNode('collection', rootContainerNd, matchNodeKey, 'interestingThing')).toBe(true)
    }
  )

  test.failing('render: the matching key is reachable in the DOM', () => {
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
    // Today rootContainer is filtered out → interestingThing never renders.
    // After the fix it should be on screen.
    expect(screen.queryByText('interestingThing')).not.toBeNull()
  })

  test.failing(
    'render: a custom searchFilter that only inspects `key` still surfaces an intermediate match',
    () => {
      // The built-in matchNodeKey accidentally papers over the bug in many
      // cases because it checks the FULL PATH: deep leaves under a matching
      // key inherit the match via their path. A custom filter that only looks
      // at `key` (no path) doesn't get that rescue, so the bug manifests even
      // with a non-empty body.
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
    }
  )
})
