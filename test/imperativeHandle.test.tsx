/**
 * End-to-end tests for the `editorRef` imperative handle.
 *
 * The handle is UI-interactions only: it opens a value-edit SESSION at a node,
 * commits or aborts it, and collapses nodes. It never mutates data directly
 * (the consumer owns `data`/`setData`). These pin the contract:
 *  - `startEdit` returns `true` if it opened a session, else `'PATH_NOT_FOUND'`
 *    (gone path) or `'RESTRICTED'` (`allowEdit` blocks it, bypassable with
 *    `overrideRestrictions`); it auto-reveals a target collapsed below the
 *    mount frontier.
 *  - `confirm()` commits the open session through `onUpdate` (which may veto);
 *    `cancel()` aborts. `overrideRestrictions` skips ONLY the filter.
 */

import { createRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { type JsonEditorHandle, type UpdateFunction } from '../src/types'

const noop = () => {}

describe('editorRef handle — startEdit', () => {
  test('startEdit opens an editor at a visible leaf and returns true', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} editorRef={ref} />)
    expect(screen.queryByRole('textbox')).toBeNull()

    let result: ReturnType<JsonEditorHandle['startEdit']> | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['greeting'] })
    })

    expect(result).toBe(true)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('startEdit returns PATH_NOT_FOUND for a path that no longer exists', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} editorRef={ref} />)

    let result: ReturnType<JsonEditorHandle['startEdit']> | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['nope'] })
    })

    expect(result).toBe('PATH_NOT_FOUND')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('startEdit respects allowEdit by default (RESTRICTED, no-op)', () => {
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor data={{ greeting: 'hello' }} setData={noop} allowEdit={false} editorRef={ref} />
    )

    let result: ReturnType<JsonEditorHandle['startEdit']> | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['greeting'] })
    })

    expect(result).toBe('RESTRICTED')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('startEdit with overrideRestrictions bypasses allowEdit', () => {
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor data={{ greeting: 'hello' }} setData={noop} allowEdit={false} editorRef={ref} />
    )

    let result: ReturnType<JsonEditorHandle['startEdit']> | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['greeting'], overrideRestrictions: true })
    })

    expect(result).toBe(true)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('startEdit honours a per-node allowEdit function', () => {
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ a: 'one', b: 'two' }}
        setData={noop}
        allowEdit={({ key }) => key !== 'b'}
        editorRef={ref}
      />
    )

    act(() => {
      expect(ref.current!.startEdit({ path: ['b'] })).toBe('RESTRICTED')
    })
    expect(screen.queryByRole('textbox')).toBeNull()

    act(() => {
      expect(ref.current!.startEdit({ path: ['a'] })).toBe(true)
    })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('startEdit reveals a target collapsed below the mount frontier', () => {
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ outer: { inner: { leaf: 'deep' } } }}
        setData={noop}
        collapse={1}
        editorRef={ref}
      />
    )
    expect(screen.queryByText('inner')).toBeNull()

    act(() => ref.current!.startEdit({ path: ['outer', 'inner', 'leaf'] }))

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

describe('editorRef handle — confirm / cancel', () => {
  test('cancel() leaves the session without committing', () => {
    const setData = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} editorRef={ref} />)

    act(() => ref.current!.startEdit({ path: ['greeting'] }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    act(() => ref.current!.cancel())
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(setData).not.toHaveBeenCalled()
  })

  test('confirm() commits the open value-edit session via setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} editorRef={ref} />)

    act(() => ref.current!.startEdit({ path: ['greeting'] }))
    const textbox = screen.getByRole('textbox')
    await user.clear(textbox)
    await user.type(textbox, 'world')

    await act(async () => {
      ref.current!.confirm()
    })

    expect(setData).toHaveBeenCalledWith({ greeting: 'world' })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('confirm() runs onUpdate, which can veto (onError fires, value not committed)', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onError = jest.fn()
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(() => ({
      error: 'nope',
    }))
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={setData}
        onUpdate={onUpdate}
        onError={onError}
        editorRef={ref}
      />
    )

    act(() => ref.current!.startEdit({ path: ['greeting'] }))
    const textbox = screen.getByRole('textbox')
    await user.clear(textbox)
    await user.type(textbox, 'world')

    await act(async () => {
      ref.current!.confirm()
    })

    expect(onUpdate).toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UPDATE_ERROR', message: 'nope' }),
      })
    )
    // Optimistic model: the value applies then the veto reverts it — the LAST
    // write restores the original, so the edit nets out uncommitted.
    expect(setData).toHaveBeenLastCalledWith({ greeting: 'hello' })
  })

  test('confirm() is a no-op with no value-edit control (does not cancel a key rename)', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor data={{ oldName: 1 }} setData={noop} onEditEvent={onEditEvent} editorRef={ref} />
    )

    // Start a key-rename session via the UI (the handle has no opener for it).
    await user.dblClick(screen.getByText('oldName'))
    expect(screen.getByDisplayValue('oldName')).toBeInTheDocument()
    onEditEvent.mockClear()

    // There's no live value-edit confirm control, so confirm() must be a no-op
    // — NOT tear down the unrelated rename session via the trailing cancel.
    await act(async () => {
      ref.current!.confirm()
    })

    expect(onEditEvent.mock.calls.map(([e]: [{ event: string }]) => e.event)).not.toContain(
      'cancelRename'
    )
    expect(screen.getByDisplayValue('oldName')).toBeInTheDocument()
  })

  test('overrideRestrictions opens past the filter, but onUpdate still runs at confirm', async () => {
    // The §17 invariant: `overrideRestrictions` skips ONLY the `allowEdit`
    // filter; the consumer's `onUpdate` always runs and may reject.
    const user = userEvent.setup()
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(() => false)
    const onError = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        allowEdit={false}
        onUpdate={onUpdate}
        onError={onError}
        editorRef={ref}
      />
    )

    act(() => {
      expect(ref.current!.startEdit({ path: ['greeting'], overrideRestrictions: true })).toBe(true)
    })
    const textbox = screen.getByRole('textbox')
    await user.clear(textbox)
    await user.type(textbox, 'world')

    await act(async () => {
      ref.current!.confirm()
    })

    expect(onUpdate).toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })
})
