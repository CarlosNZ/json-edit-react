/**
 * Unit tests for the node-prop memo comparator (V2 §16 Stage D). Pins the
 * contract that makes the React.memo boundary both fast and correct:
 * - `data` (ref) and top-level `parentData` (ref) ARE compared — the latter is
 *   what keeps key-rename safe (adding/removing a sibling changes the parent
 *   ref, forcing the node to re-render with fresh parent data).
 * - `nodeData.fullData` / `nodeData.parentData` identity is IGNORED (they churn
 *   on every commit but don't affect this node's own output).
 * - The side-effect callbacks are ignored; any other prop change forces a render.
 */

import { areNodePropsEqual } from '../src/utils/memoNode'
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

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  data: { x: 1 },
  parentData: { k: { x: 1 } },
  nodeData: makeNodeData(),
  customNodeData: {},
  onError: () => {},
  onChange: () => {},
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

  test('ignores side-effect callback identity (onError/onChange)', () => {
    const a = makeProps()
    const b = makeProps({
      data: a.data,
      parentData: a.parentData,
      nodeData: a.nodeData,
      onError: () => {}, // fresh inline callback
      onChange: () => {},
    })
    expect(areNodePropsEqual(a, b)).toBe(true)
  })

  test('re-renders when any other (non-ignored) prop changes', () => {
    const a = makeProps()
    const b = makeProps({ data: a.data, parentData: a.parentData, nodeData: a.nodeData, indent: 4 })
    expect(areNodePropsEqual(a, b)).toBe(false)
  })
})
