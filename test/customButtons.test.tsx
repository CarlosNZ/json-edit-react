/**
 * Custom buttons committing through the edit pipeline (#418).
 *
 * A custom button receives a `handleEdit` bound to its row — as the third
 * `onClick` argument, and as a prop on its `Element` — which commits the new
 * value the same way an edit does: through `onUpdate`, the `onEditEvent`
 * stream, and the node's own error reporting on rejection.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { JsonEditor } from '../src/JsonEditor'
import {
  type CustomButtonDefinition,
  type EditEvent,
  type JsonData,
  type JsonEditorProps,
  type NodeData,
  type UpdateResult,
} from '../src/types'

const makeDeferred = <T = unknown,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const Glyph = () => <span>★</span>

// A button that commits `getValue(nodeData)` at its own row.
const committingButton = (
  getValue: (nodeData: NodeData) => JsonData,
  label = 'Transform'
): CustomButtonDefinition => ({
  Element: Glyph,
  label,
  onClick: (nodeData, _e, { handleEdit }) => handleEdit(getValue(nodeData)),
})

// Owns `data` like a real consumer, so a commit re-renders the tree.
const Harness = ({
  initialData,
  setDataSpy,
  ...props
}: { initialData: JsonData; setDataSpy?: (data: JsonData) => void } & Omit<
  JsonEditorProps,
  'data' | 'setData'
>) => {
  const [data, setData] = useState<JsonData>(initialData)
  return (
    <JsonEditor
      data={data}
      setData={(d) => {
        setDataSpy?.(d as JsonData)
        setData(d as JsonData)
      }}
      {...props}
    />
  )
}

const rowFor = (key: string) => screen.getByText(key).closest('.jer-component') as HTMLElement

// A collection row's own edit buttons, excluding those of its children.
const collectionButton = (key: string, label: string) =>
  within(rowFor(key).querySelector('.jer-collection-header-row') as HTMLElement).getByRole(
    'button',
    { name: label }
  )

describe('customButtons — handleEdit', () => {
  test('commits a new value at a value row through onUpdate', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(() => true as const)
    render(
      <Harness
        initialData={{ name: 'alice', other: 'x' }}
        setDataSpy={setData}
        onUpdate={onUpdate}
        customButtons={[committingButton(({ value }) => (value as string).toUpperCase())]}
      />
    )

    await user.click(within(rowFor('name')).getByRole('button', { name: 'Transform' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'edit',
        path: ['name'],
        newValue: 'ALICE',
        newData: { name: 'ALICE', other: 'x' },
      }),
      expect.anything()
    )
    expect(setData).toHaveBeenCalledWith({ name: 'ALICE', other: 'x' })
    expect(screen.getByText('"ALICE"')).toBeInTheDocument()
  })

  test('commits a new value at a collection row through onUpdate', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(() => true as const)
    render(
      <Harness
        initialData={{ article: { title: 'A', read: false } }}
        setDataSpy={setData}
        onUpdate={onUpdate}
        customButtons={[
          committingButton(({ value }) => ({
            ...(value as object),
            read: !(value as { read: boolean }).read,
          })),
        ]}
      />
    )

    await user.click(collectionButton('article', 'Transform'))

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'edit',
        path: ['article'],
        newValue: { title: 'A', read: true },
      }),
      expect.anything()
    )
    expect(setData).toHaveBeenCalledWith({ article: { title: 'A', read: true } })
    expect(within(rowFor('read')).getByText('true')).toBeInTheDocument()
  })

  test('turns a value row into a collection when the new value is an object', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(() => true as const)
    const toGetNode: CustomButtonDefinition = {
      Element: ({ nodeData }) =>
        typeof nodeData.value === 'string' && nodeData.value.startsWith('$') ? <Glyph /> : null,
      label: 'To node',
      onClick: ({ value }, _e, { handleEdit }) =>
        handleEdit({ operator: 'get', path: (value as string).slice(1) }),
    }
    render(
      <Harness
        initialData={{ ref: '$user.name' }}
        setDataSpy={setData}
        onUpdate={onUpdate}
        customButtons={[toGetNode]}
      />
    )

    await user.click(within(rowFor('ref')).getByRole('button', { name: 'To node' }))

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: ['ref'],
        newValue: { operator: 'get', path: 'user.name' },
      }),
      expect.anything()
    )
    expect(setData).toHaveBeenCalledWith({ ref: { operator: 'get', path: 'user.name' } })
    // The row renders as a collection with the new children.
    expect(screen.getByText('operator')).toBeInTheDocument()
    expect(screen.getByText('"user.name"')).toBeInTheDocument()
  })

  test('fires submitEdit → commitEdit → updateSuccess, with no startEdit', async () => {
    const user = userEvent.setup()
    const onEditEvent = jest.fn<void, [EditEvent]>()
    render(
      <Harness
        initialData={{ name: 'alice' }}
        onUpdate={() => true}
        onEditEvent={onEditEvent}
        customButtons={[committingButton(() => 'bob')]}
      />
    )

    await user.click(within(rowFor('name')).getByRole('button', { name: 'Transform' }))

    expect(onEditEvent.mock.calls.map(([e]) => [e.event, e.path])).toEqual([
      ['submitEdit', ['name']],
      ['commitEdit', ['name']],
      ['updateSuccess', ['name']],
    ])
  })

  test('a sync reject on a value row leaves data unchanged and reports the error', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onError = jest.fn()
    const { container } = render(
      <Harness
        initialData={{ name: 'alice' }}
        setDataSpy={setData}
        onUpdate={() => ({ error: 'Not allowed' })}
        onError={onError}
        customButtons={[committingButton(() => 'bob')]}
      />
    )

    await user.click(within(rowFor('name')).getByRole('button', { name: 'Transform' }))

    expect(setData).not.toHaveBeenCalled()
    expect(screen.getByText('"alice"')).toBeInTheDocument()
    expect(container.querySelector('.jer-error-slug')).toHaveTextContent('Not allowed')
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        path: ['name'],
        error: expect.objectContaining({ code: 'UPDATE_ERROR', message: 'Not allowed' }),
      })
    )
  })

  test('a sync reject on a collection row leaves data unchanged and reports the error', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onError = jest.fn()
    const { container } = render(
      <Harness
        initialData={{ article: { read: false } }}
        setDataSpy={setData}
        onUpdate={() => ({ error: 'Not allowed' })}
        onError={onError}
        customButtons={[committingButton(() => ({ read: true }))]}
      />
    )

    await user.click(collectionButton('article', 'Transform'))

    expect(setData).not.toHaveBeenCalled()
    expect(within(rowFor('read')).getByText('false')).toBeInTheDocument()
    expect(container.querySelector('.jer-error-slug')).toHaveTextContent('Not allowed')
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        path: ['article'],
        error: expect.objectContaining({ code: 'UPDATE_ERROR', message: 'Not allowed' }),
      })
    )
  })

  test('an async reject reverts the optimistic value and reports the error', async () => {
    const user = userEvent.setup()
    const deferred = makeDeferred<UpdateResult>()
    const onError = jest.fn()
    render(
      <Harness
        initialData={{ name: 'alice' }}
        onUpdate={() => deferred.promise}
        onError={onError}
        customButtons={[committingButton(() => 'bob')]}
      />
    )

    await user.click(within(rowFor('name')).getByRole('button', { name: 'Transform' }))
    // Applied optimistically while `onUpdate` settles.
    expect(screen.getByText('"bob"')).toBeInTheDocument()

    await act(async () => {
      deferred.resolve({ error: 'Not allowed' })
    })

    expect(screen.getByText('"alice"')).toBeInTheDocument()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: 'Not allowed' }) })
    )
  })

  test('is not gated by allowEdit, and passes canEdit to Element and onClick', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const seen: Record<string, boolean> = {}
    const clicked: Record<string, boolean> = {}
    const button: CustomButtonDefinition = {
      Element: ({ nodeData, canEdit }) => {
        seen[String(nodeData.key)] = canEdit
        return <Glyph />
      },
      label: 'Transform',
      onClick: (nodeData, _e, { handleEdit, canEdit }) => {
        clicked[String(nodeData.key)] = canEdit
        handleEdit('changed')
      },
    }
    render(
      <Harness
        initialData={{ open: 'a', locked: 'b' }}
        setDataSpy={setData}
        allowEdit={({ key }) => key !== 'locked'}
        customButtons={[button]}
      />
    )

    expect(seen).toMatchObject({ open: true, locked: false })

    // The consumer's own code decides; the editor doesn't block the commit.
    await user.click(within(rowFor('open')).getByRole('button', { name: 'Transform' }))
    await user.click(within(rowFor('locked')).getByRole('button', { name: 'Transform' }))
    expect(clicked).toEqual({ open: true, locked: false })
    expect(setData).toHaveBeenLastCalledWith({ open: 'changed', locked: 'changed' })
  })

  test('an Element with its own button commits through its handleEdit prop', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn(() => true as const)
    const button: CustomButtonDefinition = {
      Element: ({ nodeData, handleEdit }) =>
        nodeData.key === 'count' ? (
          <button type="button" onClick={() => handleEdit((nodeData.value as number) + 1)}>
            Increment
          </button>
        ) : null,
    }
    render(
      <Harness
        initialData={{ count: 1 }}
        setDataSpy={setData}
        onUpdate={onUpdate}
        customButtons={[button]}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Increment' }))

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: ['count'], newValue: 2 }),
      expect.anything()
    )
    expect(setData).toHaveBeenCalledWith({ count: 2 })
  })

  test('a button that ignores handleEdit leaves data untouched', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn()
    const onClick = jest.fn()
    render(
      <JsonEditor
        data={{ a: 1 }}
        setData={setData}
        onUpdate={onUpdate}
        customButtons={[{ Element: Glyph, label: 'Mark', onClick }]}
      />
    )

    await user.click(within(rowFor('a')).getByRole('button', { name: 'Mark' }))

    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ path: ['a'] }),
      expect.anything(),
      { handleEdit: expect.any(Function), canEdit: true }
    )
    expect(onUpdate).not.toHaveBeenCalled()
    expect(setData).not.toHaveBeenCalled()
  })
})

describe('customButtons — a value turned into a collection', () => {
  const wrapButton = committingButton(({ value }) => ({ inner: value as string }), 'Wrap')

  test('opens the new collection, as a type switch does', async () => {
    const user = userEvent.setup()
    render(<Harness initialData={{ ref: 'abc' }} collapse={1} customButtons={[wrapButton]} />)

    await user.click(within(rowFor('ref')).getByRole('button', { name: 'Wrap' }))

    expect(screen.getByText('inner')).toBeInTheDocument()
  })

  test('a rejected edit leaves nothing to open a later collection at that path', async () => {
    const user = userEvent.setup()
    const Controlled = () => {
      const [data, setData] = useState<JsonData>({ ref: 'abc' })
      return (
        <>
          <button type="button" onClick={() => setData({ ref: { inner: 'x' } })}>
            Replace data
          </button>
          <JsonEditor
            data={data}
            setData={(d) => setData(d as JsonData)}
            onUpdate={() => ({ error: 'Not allowed' })}
            collapse={1}
            customButtons={[wrapButton]}
          />
        </>
      )
    }
    render(<Controlled />)

    await user.click(within(rowFor('ref')).getByRole('button', { name: 'Wrap' }))
    await user.click(screen.getByRole('button', { name: 'Replace data' }))

    // The consumer's own `setData` follows the `collapse` prop.
    expect(screen.queryByText('inner')).toBeNull()
  })
})

// Jest stubs the stylesheet import, so these load the real one: hiding an
// empty wrapper is the stylesheet's job.
describe('customButtons — an Element that renders nothing', () => {
  let style: HTMLStyleElement
  beforeAll(() => {
    style = document.createElement('style')
    style.textContent = readFileSync(join(__dirname, '../src/style.css'), 'utf8')
    document.head.appendChild(style)
  })
  afterAll(() => style.remove())

  // Renders only on the `shown` row.
  const OnlyShown = ({ nodeData }: { nodeData: NodeData }) =>
    nodeData.key === 'shown' ? <span>★</span> : null

  test('hides a labelled wrapper, so assistive tech can’t press it', () => {
    render(
      <JsonEditor
        data={{ shown: 1, hidden: 2 }}
        setData={() => {}}
        customButtons={[{ Element: OnlyShown, label: 'Mark', onClick: () => {} }]}
      />
    )

    expect(within(rowFor('shown')).getByRole('button', { name: 'Mark' })).toBeInTheDocument()
    expect(within(rowFor('hidden')).queryByRole('button', { name: 'Mark' })).toBeNull()
  })

  test('hides an unlabelled wrapper too', () => {
    render(
      <JsonEditor
        data={{ shown: 1, hidden: 2 }}
        setData={() => {}}
        customButtons={[{ Element: OnlyShown, onClick: () => {} }]}
      />
    )

    const wrappers = (key: string) =>
      Array.from(rowFor(key).querySelectorAll<HTMLElement>('.jer-edit-buttons > div'))
    expect(wrappers('shown').map((el) => getComputedStyle(el).display)).toEqual(['block'])
    expect(wrappers('hidden').map((el) => getComputedStyle(el).display)).toEqual(['none'])
  })
})
