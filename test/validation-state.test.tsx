import { useMemo, useState } from 'react'
import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NodeData } from '../src'
import { JsonEditor } from '../src/JsonEditor'
import {
  ajvAdapter,
  useValidationState,
  validationStyles,
  type AjvValidateFunction,
  type Validate,
  type ValidationIssue,
  type ValidationState,
} from '../packages/utils/src'

// Cast a bare path into the NodeData a slot function reads (the slot only ever
// touches `.path`).
const nd = (path: (string | number)[]) => ({ path }) as unknown as NodeData

describe('useValidationState — query surface', () => {
  const issues: ValidationIssue[] = [
    { path: ['a', 'b'], message: 'b is bad', keyword: 'type' },
    { path: ['items', 0], message: 'index 0 bad', keyword: 'type' },
    { path: ['weird.key'], message: 'dotted key bad', keyword: 'type' },
    { path: [], message: 'root bad', keyword: 'required' },
  ]
  const validate: Validate = () => issues

  it('answers hasErrorAt / errorsAt for exact nodes', () => {
    const { result } = renderHook(() => useValidationState({}, validate))
    const v = result.current

    expect(v.isValid).toBe(false)
    expect(v.errors).toHaveLength(4)
    expect(v.hasErrorAt(['a', 'b'])).toBe(true)
    expect(v.hasErrorAt(['a'])).toBe(false) // ancestor, not an exact match
    expect(v.hasErrorAt(['items', 0])).toBe(true) // numeric index
    expect(v.hasErrorAt([])).toBe(true) // document root
    expect(v.errorsAt(['a', 'b'])[0].message).toBe('b is bad')
    expect(v.errorsAt(['nope'])).toEqual([])
  })

  it('distinguishes a key containing "." from a nested path', () => {
    const { result } = renderHook(() => useValidationState({}, validate))
    const v = result.current
    expect(v.hasErrorAt(['weird.key'])).toBe(true)
    expect(v.hasErrorAt(['weird', 'key'])).toBe(false)
  })

  it('answers hasErrorWithin for a node or any descendant', () => {
    const { result } = renderHook(() => useValidationState({}, validate))
    const v = result.current
    expect(v.hasErrorWithin(['a'])).toBe(true) // ['a','b'] is inside
    expect(v.hasErrorWithin(['a', 'b'])).toBe(true) // the node itself
    expect(v.hasErrorWithin(['a', 'c'])).toBe(false)
    expect(v.hasErrorWithin([])).toBe(true) // anything invalid → root has error within
    expect(v.hasErrorWithin(['items'])).toBe(true)
  })
})

describe('useValidationState — identity stability (the §16 invariant)', () => {
  const byFlag: Validate = (data) =>
    (data as { flag: boolean }).flag
      ? [{ path: ['a'], message: 'bad', keyword: 'type' }]
      : []

  it('keeps a stable reference while the error set is unchanged, flips when it changes', () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: object }) => useValidationState(data, byFlag),
      { initialProps: { data: { flag: true, n: 0 } } }
    )

    const s1 = result.current
    // New data, but the same issues → identity must NOT change (valid→valid,
    // or here invalid→invalid: the memo boundary stays intact).
    rerender({ data: { flag: true, n: 1 } })
    expect(result.current).toBe(s1)

    // Error set changes (invalid → valid) → new identity, ready to pierce.
    rerender({ data: { flag: false, n: 1 } })
    expect(result.current).not.toBe(s1)
    expect(result.current.isValid).toBe(true)
  })
})

describe('ajvAdapter', () => {
  const makeValidate = (errors: AjvValidateFunction['errors']): AjvValidateFunction =>
    Object.assign(() => (errors ?? []).length === 0, { errors })

  it('parses instancePath JSON-Pointers into canonical paths', () => {
    const issues = ajvAdapter(
      makeValidate([{ instancePath: '/payment/method', message: 'must be string', keyword: 'type' }])
    )({})
    expect(issues[0].path).toEqual(['payment', 'method'])
    expect(issues[0].keyword).toBe('type')
    expect(issues[0].message).toBe('must be string')
  })

  it('coerces numeric segments to numbers and maps the empty pointer to root', () => {
    expect(ajvAdapter(makeValidate([{ instancePath: '/items/0', keyword: 'type' }]))({})[0].path).toEqual([
      'items',
      0,
    ])
    expect(ajvAdapter(makeValidate([{ instancePath: '', keyword: 'type' }]))({})[0].path).toEqual([])
  })

  it('decodes JSON-Pointer escapes (~1 → /, ~0 → ~)', () => {
    const issues = ajvAdapter(makeValidate([{ instancePath: '/a~1b/c~0d', keyword: 'type' }]))({})
    expect(issues[0].path).toEqual(['a/b', 'c~d'])
  })

  it('keeps a required error at the parent path and names the missing property', () => {
    const issues = ajvAdapter(
      makeValidate([
        { instancePath: '/payment', keyword: 'required', params: { missingProperty: 'method' } },
      ])
    )({})
    expect(issues[0].path).toEqual(['payment']) // parent — the missing child has no node
    expect(issues[0].message).toContain('method')
  })

  it('exposes the raw error as an escape hatch', () => {
    const error = { instancePath: '/x', keyword: 'type', message: 'nope' }
    expect(ajvAdapter(makeValidate([error]))({})[0].raw).toBe(error)
  })
})

describe('validationStyles', () => {
  const v: ValidationState = {
    isValid: false,
    errors: [],
    hasErrorAt: (p) => p.length === 1 && p[0] === 'bad',
    errorsAt: () => [],
    hasErrorWithin: (p) => p.length === 0,
  }

  it('styles only the leaf nodes that have an error', () => {
    const styles = validationStyles(v, { error: { color: 'red' } })
    const stringFn = styles.string as unknown as (n: NodeData) => unknown
    expect(stringFn(nd(['bad']))).toEqual({ color: 'red' })
    expect(stringFn(nd(['ok']))).toBeNull()
    // the same leaf function backs every value slot
    expect(styles.number).toBe(styles.string)
    expect(styles.boolean).toBe(styles.string)
    expect(styles.null).toBe(styles.string)
  })

  it('defaults to red text and omits ancestor marking unless asked', () => {
    const styles = validationStyles(v)
    expect((styles.string as unknown as (n: NodeData) => unknown)(nd(['bad']))).toEqual({
      color: '#cb4b16',
    })
    expect(styles.collectionElement).toBeUndefined()
  })

  it('marks collection ancestors with hasErrorWithin when `within` is given', () => {
    const styles = validationStyles(v, { within: { background: 'pink' } })
    const collFn = styles.collectionElement as unknown as (n: NodeData) => unknown
    expect(collFn(nd([]))).toEqual({ background: 'pink' }) // root has an error within
    expect(collFn(nd(['elsewhere']))).toBeNull()
  })
})

// The headline end-to-end regression: editing one node changes the validity of
// a node on a DIFFERENT branch. That other node bails on the commit (§16 memo
// boundary — see test/renderScope.test.tsx), so only the theme-identity pierce
// driven by useValidationState's stable-until-changed identity can restyle it.
describe('cross-branch staleness (end-to-end)', () => {
  const RED = 'rgb(255, 0, 0)'

  // cardNumber must be ≥ 4 chars, but only while paying by card. Editing
  // `method` flips cardNumber's validity from across the tree.
  const crossBranch: Validate = (data) => {
    const d = data as { method?: string; cardNumber?: unknown }
    return d.method === 'card' && String(d.cardNumber ?? '').length < 4
      ? [{ path: ['cardNumber'], message: 'card number too short', keyword: 'minLength' }]
      : []
  }

  const Host = ({ initial }: { initial: object }) => {
    const [data, setData] = useState<object>(initial)
    const validation = useValidationState(data, crossBranch)
    const theme = useMemo(
      () => [validationStyles(validation, { error: { color: RED } })],
      [validation]
    )
    return <JsonEditor data={data} setData={setData} theme={theme} />
  }

  it('clears a stale error on a cross-branch node when the edit makes it valid', async () => {
    const user = userEvent.setup()
    render(<Host initial={{ method: 'card', cardNumber: '12' }} />)

    // Invalid on load: method is 'card' and the number is too short → red.
    expect(screen.getByText('"12"')).toHaveStyle({ color: RED })

    // Edit method 'card' → 'cash'. cardNumber's subtree bails on this commit.
    await user.dblClick(screen.getByText('"card"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'cash{Enter}')
    await screen.findByText('"cash"')

    // It restyled anyway — the pierce reached the cross-branch node.
    expect(screen.getByText('"12"')).not.toHaveStyle({ color: RED })
  })

  it('applies an error to a cross-branch node when the edit makes it invalid', async () => {
    const user = userEvent.setup()
    render(<Host initial={{ method: 'cash', cardNumber: '12' }} />)

    // Valid on load (method is 'cash') → not red.
    expect(screen.getByText('"12"')).not.toHaveStyle({ color: RED })

    // Edit method 'cash' → 'card'. cardNumber is now invalid.
    await user.dblClick(screen.getByText('"cash"'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'card{Enter}')
    await screen.findByText('"card"')

    expect(screen.getByText('"12"')).toHaveStyle({ color: RED })
  })
})
