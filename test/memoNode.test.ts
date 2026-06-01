/**
 * Unit tests for the node-prop memo comparator (V2 §16 Stage D). Pins the
 * contract that makes the React.memo boundary both fast and correct:
 * - `data` (ref) and top-level `parentData` (ref) ARE compared — the latter is
 *   what keeps key-rename safe (adding/removing a sibling changes the parent
 *   ref, forcing the node to re-render with fresh parent data).
 * - `nodeData.fullData` / `nodeData.parentData` identity is IGNORED (they churn
 *   on every commit but don't affect this node's own output).
 * - Consumer callbacks are compared by `===` (JsonEditor keeps them stable), so
 *   a changed callback propagates; any other non-ignored prop change re-renders.
 */

import { areNodePropsEqual } from '../src/utils/memoNode'
import { NOOP } from '../src/utils/misc'
import { type NodeData } from '../src/types'

const makeNodeData = (overrides: Partial<NodeData> = {}): NodeData => ({
  key: 'k',
  path: ['k'],
  level: 1,
  index: 0,
  value: { x: 1 },
  size: 1,
  parentData: { k: { x: 1 } },
  fullData: { k: { x: 1 } },
  ...overrides,
})

// Callbacks are compared now, so default them to one stable `NOOP` identity —
// tests that don't vary a callback shouldn't trip the comparator on it; the
// callback-identity test passes fresh ones explicitly.
const makeProps = (overrides: Record<string, unknown> = {}) => ({
  data: { x: 1 },
  parentData: { k: { x: 1 } },
  nodeData: makeNodeData(),
  customNodeData: {},
  onError: NOOP,
  onChange: NOOP,
  searchText: undefined,
  indent: 2,
  ...overrides,
})

describe('areNodePropsEqual', () => {
  test('equal when nothing render-affecting changed (same refs)', () => {
    const a = makeProps()
    const b = { ...a }
    expect(areNodePropsEqual(a, b)).toBe(true)
  })

  test('ignores nodeData.fullData / nodeData.parentData identity churn', () => {
    const a = makeProps()
    const b = makeProps({
      data: a.data,
      parentData: a.parentData,
      // fresh fullData/parentData INSIDE nodeData (as happens every commit)
      nodeData: makeNodeData({
        path: a.nodeData.path,
        fullData: { k: { x: 1 } },
        parentData: { k: { x: 1 } },
      }),
    })
    expect(areNodePropsEqual(a, b)).toBe(true)
  })

  test('compares top-level data by reference', () => {
    const a = makeProps()
    const b = makeProps({ parentData: a.parentData, data: { x: 1 } }) // new data ref
    expect(areNodePropsEqual(a, b)).toBe(false)
  })

  test('compares top-level parentData by reference (key-rename safety)', () => {
    const a = makeProps()
    const b = makeProps({ data: a.data, parentData: { k: { x: 1 } } }) // new parent ref
    expect(areNodePropsEqual(a, b)).toBe(false)
  })

  test('re-renders when a render-affecting nodeData field changes', () => {
    const a = makeProps()
    const b = makeProps({ data: a.data, parentData: a.parentData, nodeData: makeNodeData({ index: 3 }) })
    expect(areNodePropsEqual(a, b)).toBe(false)
  })

  test('re-renders when a consumer callback identity changes', () => {
    // JsonEditor keeps these stable (refs-to-latest); the comparator compares
    // them so a genuinely-changed callback propagates instead of going stale.
    const a = makeProps()
    const b = makeProps({
      data: a.data,
      parentData: a.parentData,
      nodeData: a.nodeData,
      onError: () => {}, // fresh inline callback
      onChange: () => {},
    })
    expect(areNodePropsEqual(a, b)).toBe(false)
  })

  test('re-renders when any other (non-ignored) prop changes', () => {
    const a = makeProps()
    const b = makeProps({ data: a.data, parentData: a.parentData, nodeData: a.nodeData, indent: 4 })
    expect(areNodePropsEqual(a, b)).toBe(false)
  })

  test('treats NaN as equal (Object.is), so a NaN-valued node can still bail', () => {
    // A value node's `data` can be NaN. With `!==` (NaN !== NaN) the comparator
    // would mark it changed every commit and never bail; Object.is treats it as
    // equal so the node memoizes like any other unchanged value.
    const a = makeProps({ data: NaN })
    const b = makeProps({ data: NaN, parentData: a.parentData, nodeData: a.nodeData })
    expect(areNodePropsEqual(a, b)).toBe(true)
  })
})
