import { renderHook } from '@testing-library/react'
import { useStableValue } from '../packages/utils/src'

describe('useStableValue', () => {
  it('returns the previous reference when the recomputed value is deep-equal', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number[] }) => useStableValue(() => value.map((x) => x * 2), [value]),
      { initialProps: { value: [1, 2] } }
    )

    const first = result.current
    expect(first).toEqual([2, 4])

    // New `deps` reference (fresh array), but the computed result is equal — so
    // the identity must NOT change.
    rerender({ value: [1, 2] })
    expect(result.current).toBe(first)
  })

  it('returns a new reference when the recomputed value differs', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number[] }) => useStableValue(() => value.map((x) => x * 2), [value]),
      { initialProps: { value: [1, 2] } }
    )

    const first = result.current
    rerender({ value: [1, 3] })
    expect(result.current).not.toBe(first)
    expect(result.current).toEqual([2, 6])
  })

  it('honors a custom isEqual comparator', () => {
    // Always-equal: the identity should never change however the input moves.
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useStableValue(() => ({ value }), [value], () => true),
      { initialProps: { value: 1 } }
    )

    const first = result.current
    rerender({ value: 99 })
    expect(result.current).toBe(first)
    expect(result.current).toEqual({ value: 1 }) // the first computed value sticks
  })

  it('recomputes (new identity) only when deps actually change', () => {
    const compute = jest.fn(({ n }: { n: number }) => ({ doubled: n * 2 }))
    const { result, rerender } = renderHook(
      (props: { n: number }) => useStableValue(() => compute(props), [props.n]),
      { initialProps: { n: 2 } }
    )

    expect(compute).toHaveBeenCalledTimes(1)
    const first = result.current

    // Same dep value → React skips the memo, compute is not called again.
    rerender({ n: 2 })
    expect(compute).toHaveBeenCalledTimes(1)
    expect(result.current).toBe(first)

    // Changed dep → recompute, new identity.
    rerender({ n: 3 })
    expect(compute).toHaveBeenCalledTimes(2)
    expect(result.current).toEqual({ doubled: 6 })
  })
})
