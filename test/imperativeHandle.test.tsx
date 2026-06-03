/**
 * End-to-end tests for the `editorRef` imperative handle (§17, Category 4).
 *
 * The handle is UI-interactions only: it opens an edit / rename / add input
 * SESSION at a node, commits or aborts it, and collapses nodes. It never mutates
 * data directly (the consumer owns `data`/`setData`). These pin the contract:
 *  - session openers `startEdit` / `startRename` / `startAdd` return a sync
 *    `CommandResult` — `PATH_NOT_FOUND` for a gone path, `RESTRICTED` when a
 *    `restrict*` filter blocks it (bypassable with `overrideRestrictions`).
 *  - `confirm()` commits whichever session is open through `onUpdate` (so it's
 *    async + maps the accept/reject to a `CommandResult`); `cancel()` aborts.
 *  - `overrideRestrictions` skips ONLY the filter — `onUpdate` still runs/vetoes.
 *  - openers auto-reveal a target collapsed below the mount frontier.
 */

import { createRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import { type JsonEditorHandle, type UpdateFunction } from '../src/types'

const noop = () => {}

describe('editorRef handle — session openers', () => {
  test('startEdit opens an editor at a visible leaf and reports success', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} editorRef={ref} />)
    expect(screen.queryByRole('textbox')).toBeNull()

    let result: ReturnType<JsonEditorHandle['startEdit']> | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['greeting'] })
    })

    expect(result).toEqual({ success: true })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('startEdit returns PATH_NOT_FOUND for a path that no longer exists', () => {
    const ref = createRef<JsonEditorHandle>()
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop)
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} editorRef={ref} />)

    let result: ReturnType<JsonEditorHandle['startEdit']> | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['nope'] })
    })

    expect(result).toEqual({ success: false, error: expect.objectContaining({ code: 'PATH_NOT_FOUND' }) })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  test('startEdit respects restrictEdit by default (RESTRICTED, no-op)', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} restrictEdit editorRef={ref} />)

    let result: ReturnType<JsonEditorHandle['startEdit']> | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['greeting'] })
    })

    expect(result).toEqual({ success: false, error: expect.objectContaining({ code: 'RESTRICTED' }) })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('startEdit with overrideRestrictions bypasses restrictEdit', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} restrictEdit editorRef={ref} />)

    let result: ReturnType<JsonEditorHandle['startEdit']> | undefined
    act(() => {
      result = ref.current!.startEdit({ path: ['greeting'], overrideRestrictions: true })
    })

    expect(result).toEqual({ success: true })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  test('startEdit honours a per-node restrictEdit function', () => {
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ a: 'one', b: 'two' }}
        setData={noop}
        restrictEdit={({ key }) => key === 'b'}
        editorRef={ref}
      />
    )

    act(() => {
      expect(ref.current!.startEdit({ path: ['b'] }).success).toBe(false)
    })
    expect(screen.queryByRole('textbox')).toBeNull()

    act(() => {
      expect(ref.current!.startEdit({ path: ['a'] }).success).toBe(true)
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

  test('startRename refuses an array item (no key) with RESTRICTED', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ list: [1, 2] }} setData={noop} editorRef={ref} />)

    let result: ReturnType<JsonEditorHandle['startRename']> | undefined
    act(() => {
      result = ref.current!.startRename({ path: ['list', 0] })
    })

    expect(result).toEqual({ success: false, error: expect.objectContaining({ code: 'RESTRICTED' }) })
  })

  test('startAdd refuses a restricted parent with RESTRICTED', () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ obj: { a: 1 } }} setData={noop} restrictAdd editorRef={ref} />)

    let result: ReturnType<JsonEditorHandle['startAdd']> | undefined
    act(() => {
      result = ref.current!.startAdd({ path: ['obj'] })
    })

    expect(result).toEqual({ success: false, error: expect.objectContaining({ code: 'RESTRICTED' }) })
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

  test('confirm() commits a value-edit session via setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} editorRef={ref} />)

    act(() => ref.current!.startEdit({ path: ['greeting'] }))
    const textbox = screen.getByRole('textbox')
    await user.clear(textbox)
    await user.type(textbox, 'world')

    let result: Awaited<ReturnType<JsonEditorHandle['confirm']>> | undefined
    await act(async () => {
      result = await ref.current!.confirm()
    })

    expect(result).toEqual({ success: true })
    expect(setData).toHaveBeenCalledWith({ greeting: 'world' })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('confirm() commits a rename session via setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} editorRef={ref} />)

    act(() => ref.current!.startRename({ path: ['greeting'] }))
    const keyInput = screen.getByRole('textbox')
    await user.clear(keyInput)
    await user.type(keyInput, 'salutation')

    let result: Awaited<ReturnType<JsonEditorHandle['confirm']>> | undefined
    await act(async () => {
      result = await ref.current!.confirm()
    })

    expect(result).toEqual({ success: true })
    expect(setData).toHaveBeenCalledWith({ salutation: 'hello' })
  })

  test('confirm() commits an add session via setData', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ a: 1 }} setData={setData} editorRef={ref} />)

    act(() => ref.current!.startAdd({ path: [] }))
    const keyInput = screen.getByRole('textbox')
    await user.clear(keyInput)
    await user.type(keyInput, 'b')

    let result: Awaited<ReturnType<JsonEditorHandle['confirm']>> | undefined
    await act(async () => {
      result = await ref.current!.confirm()
    })

    expect(result).toEqual({ success: true })
    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData.mock.calls[0][0]).toHaveProperty('b')
  })

  test('confirm() with no open session reports a failure', async () => {
    const ref = createRef<JsonEditorHandle>()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} editorRef={ref} />)

    let result: Awaited<ReturnType<JsonEditorHandle['confirm']>> | undefined
    await act(async () => {
      result = await ref.current!.confirm()
    })

    expect(result).toEqual({ success: false, error: expect.objectContaining({ code: 'UPDATE_ERROR' }) })
  })

  test('confirm() maps an onUpdate rejection to a failure result', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate: UpdateFunction = () => ({ error: 'nope' })
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor data={{ greeting: 'hello' }} setData={setData} onUpdate={onUpdate} editorRef={ref} />
    )

    act(() => ref.current!.startEdit({ path: ['greeting'] }))
    const textbox = screen.getByRole('textbox')
    await user.clear(textbox)
    await user.type(textbox, 'world')

    let result: Awaited<ReturnType<JsonEditorHandle['confirm']>> | undefined
    await act(async () => {
      result = await ref.current!.confirm()
    })

    expect(result).toEqual({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'nope' },
    })
  })

  test('overrideRestrictions opens past the filter, but onUpdate still vetoes at confirm', async () => {
    // The §17 invariant: `overrideRestrictions` skips ONLY the `restrict*`
    // filter; the consumer's `onUpdate` always runs and may reject.
    const user = userEvent.setup()
    const onUpdate = jest.fn<ReturnType<UpdateFunction>, Parameters<UpdateFunction>>(() => false)
    const ref = createRef<JsonEditorHandle>()
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        restrictEdit
        onUpdate={onUpdate}
        editorRef={ref}
      />
    )

    act(() => {
      expect(ref.current!.startEdit({ path: ['greeting'], overrideRestrictions: true }).success).toBe(
        true
      )
    })
    const textbox = screen.getByRole('textbox')
    await user.clear(textbox)
    await user.type(textbox, 'world')

    let result: Awaited<ReturnType<JsonEditorHandle['confirm']>> | undefined
    await act(async () => {
      result = await ref.current!.confirm()
    })

    expect(onUpdate).toHaveBeenCalled()
    expect(result!.success).toBe(false)
  })
})
