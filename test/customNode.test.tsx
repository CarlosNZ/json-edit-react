/**
 * CustomNode prop-coverage suite.
 *
 * Pins the observable DOM/`setData` contract of every `CustomNodeDefinition`
 * field (the v2 surface: `component` / `keyComponent` / `wrapperComponent`,
 * `componentProps` / `wrapperProps`, `showKey`, `showOnView` / `showOnEdit`,
 * `showEditTools`, `showInTypeSelector` + `defaultValue`, `passOriginalNode`,
 * `showCollectionWrapper`, `renderCollectionAsValue`, and the
 * `stringifyReplacer` / `parseReviver` JSON hooks). Tiny test components emit
 * `data-testid` markers so each prop's effect is directly assertable.
 */

import { useState } from 'react'
import { act, render, screen, waitFor, within, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonEditor } from '../src/JsonEditor'
import {
  type CustomNodeDefinition,
  type CustomComponentProps,
  type CustomKeyProps,
  type CustomWrapperProps,
  type UpdateFunction,
} from '../src/types'

const noop = () => {}

describe('CustomNode — slots & matching', () => {
  test('a matching condition renders the custom component in the value slot', () => {
    const defs: CustomNodeDefinition[] = [
      { condition: ({ key }) => key === 'greeting', component: () => <span data-testid="cv">CUSTOM</span> },
    ]
    render(
      <JsonEditor data={{ greeting: 'hello', other: 'world' }} setData={noop} customNodeDefinitions={defs} />
    )
    expect(screen.getByTestId('cv')).toBeInTheDocument()
    // the matched node's standard value is replaced; the unmatched node is
    // untouched
    expect(screen.queryByText('"hello"')).toBeNull()
    expect(screen.getByText('"world"')).toBeInTheDocument()
  })

  test('a non-matching condition leaves the standard rendering', () => {
    const defs: CustomNodeDefinition[] = [
      { condition: ({ key }) => key === 'nope', component: () => <span data-testid="cv">CUSTOM</span> },
    ]
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} customNodeDefinitions={defs} />)
    expect(screen.queryByTestId('cv')).toBeNull()
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  test('keyComponent renders in the key slot, value stays standard', () => {
    const defs: CustomNodeDefinition[] = [
      {
        condition: ({ key }) => key === 'greeting',
        keyComponent: ({ name }: CustomKeyProps) => <span data-testid="ck">K:{name}</span>,
      },
    ]
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} customNodeDefinitions={defs} />)
    expect(screen.getByTestId('ck')).toHaveTextContent('K:greeting')
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  test('wrapperComponent wraps a collection node', () => {
    const defs: CustomNodeDefinition[] = [
      {
        condition: ({ key }) => key === 'obj',
        wrapperComponent: ({ children }: CustomWrapperProps) => <div data-testid="w">{children}</div>,
      },
    ]
    render(<JsonEditor data={{ obj: { a: 1 } }} setData={noop} customNodeDefinitions={defs} />)
    const wrapper = screen.getByTestId('w')
    // the collection's contents still render inside the wrapper
    expect(within(wrapper).getByText('1')).toBeInTheDocument()
  })
})

describe('CustomNode — props pass-through', () => {
  test('componentProps reaches both component and keyComponent', () => {
    const defs: CustomNodeDefinition[] = [
      {
        condition: ({ key }) => key === 'greeting',
        component: ({ componentProps }: CustomComponentProps) => (
          <span data-testid="cv">{String((componentProps as { label?: string })?.label)}</span>
        ),
        keyComponent: ({ componentProps }: CustomKeyProps) => (
          <span data-testid="ck">{String((componentProps as { label?: string })?.label)}</span>
        ),
        componentProps: { label: 'SHARED' },
      },
    ]
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} customNodeDefinitions={defs} />)
    expect(screen.getByTestId('cv')).toHaveTextContent('SHARED')
    expect(screen.getByTestId('ck')).toHaveTextContent('SHARED')
  })

  test('wrapperProps reaches the wrapperComponent (delivery-fix regression guard)', () => {
    const defs: CustomNodeDefinition[] = [
      {
        condition: ({ key }) => key === 'obj',
        wrapperComponent: ({ wrapperProps, children }: CustomWrapperProps) => (
          <div data-testid="w">
            <span data-testid="wtag">{String((wrapperProps as { tag?: string })?.tag)}</span>
            {children}
          </div>
        ),
        wrapperProps: { tag: 'WTAG' },
      },
    ]
    render(<JsonEditor data={{ obj: { a: 1 } }} setData={noop} customNodeDefinitions={defs} />)
    expect(screen.getByTestId('wtag')).toHaveTextContent('WTAG')
  })
})

describe('CustomNode — view/edit visibility', () => {
  const valueDef = (overrides: Partial<CustomNodeDefinition>): CustomNodeDefinition => ({
    condition: ({ key }) => key === 'greeting',
    component: () => <span data-testid="cv">CUSTOM</span>,
    ...overrides,
  })

  test('showOnView default true → custom shown in view mode', () => {
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} customNodeDefinitions={[valueDef({})]} />)
    expect(screen.getByTestId('cv')).toBeInTheDocument()
  })

  test('showOnView false → standard value shown, custom hidden in view', () => {
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        customNodeDefinitions={[valueDef({ showOnView: false })]}
      />
    )
    expect(screen.queryByTestId('cv')).toBeNull()
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  test('showOnEdit default false → standard editor while editing', async () => {
    const user = userEvent.setup()
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        customNodeDefinitions={[valueDef({ showOnView: false })]}
      />
    )
    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.queryByTestId('cv')).toBeNull()
  })

  test('showOnEdit true → custom shown while editing', async () => {
    const user = userEvent.setup()
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        customNodeDefinitions={[valueDef({ showOnView: false, showOnEdit: true })]}
      />
    )
    expect(screen.queryByTestId('cv')).toBeNull()
    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.getByTestId('cv')).toBeInTheDocument()
  })
})

describe('CustomNode — chrome flags', () => {
  test('showKey default true → the key is rendered alongside the custom component', () => {
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        customNodeDefinitions={[
          { condition: ({ key }) => key === 'greeting', component: () => <span data-testid="cv">C</span> },
        ]}
      />
    )
    // scope to the custom node's own row (the root node also has a key label)
    const row = screen.getByTestId('cv').closest('.jer-component') as HTMLElement
    expect(row.querySelector('.jer-key-text')).not.toBeNull()
  })

  test('showKey false → the key is hidden (whole-row escape hatch)', () => {
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        customNodeDefinitions={[
          {
            condition: ({ key }) => key === 'greeting',
            component: () => <span data-testid="cv">C</span>,
            showKey: false,
          },
        ]}
      />
    )
    const row = screen.getByTestId('cv').closest('.jer-component') as HTMLElement
    expect(row.querySelector('.jer-key-text')).toBeNull()
  })

  test('showEditTools default true → edit buttons present on the custom node', () => {
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        customNodeDefinitions={[
          { condition: ({ key }) => key === 'greeting', component: () => <span data-testid="cv">C</span> },
        ]}
      />
    )
    const row = screen.getByTestId('cv').closest('.jer-component') as HTMLElement
    expect(row.querySelector('.jer-edit-buttons')).not.toBeNull()
  })

  test('showEditTools false → edit buttons hidden on the custom node', () => {
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        customNodeDefinitions={[
          {
            condition: ({ key }) => key === 'greeting',
            component: () => <span data-testid="cv">C</span>,
            showEditTools: false,
          },
        ]}
      />
    )
    const row = screen.getByTestId('cv').closest('.jer-component') as HTMLElement
    expect(row.querySelector('.jer-edit-buttons')).toBeNull()
  })
})

describe('CustomNode — type selector & defaultValue', () => {
  const customType = (overrides: Partial<CustomNodeDefinition> = {}): CustomNodeDefinition => ({
    condition: ({ value }) => value === 'CUSTOMVAL',
    component: () => <span data-testid="cv">C</span>,
    name: 'MyType',
    showInTypeSelector: true,
    defaultValue: 'CUSTOMVAL',
    ...overrides,
  })

  test('showInTypeSelector + name → the type appears as an option while editing', async () => {
    const user = userEvent.setup()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} customNodeDefinitions={[customType()]} />)
    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.getByRole('option', { name: 'MyType' })).toBeInTheDocument()
  })

  test('showInTypeSelector false → the type is absent from the selector', async () => {
    const user = userEvent.setup()
    render(
      <JsonEditor
        data={{ greeting: 'hello' }}
        setData={noop}
        customNodeDefinitions={[customType({ showInTypeSelector: false })]}
      />
    )
    await user.dblClick(screen.getByText('"hello"'))
    expect(screen.queryByRole('option', { name: 'MyType' })).toBeNull()
  })

  test('selecting the custom type inserts its defaultValue', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(<JsonEditor data={{ greeting: 'hello' }} setData={setData} customNodeDefinitions={[customType()]} />)
    await user.dblClick(screen.getByText('"hello"'))
    await user.selectOptions(screen.getByRole('combobox'), 'MyType')
    await waitFor(() => expect(setData).toHaveBeenCalledWith({ greeting: 'CUSTOMVAL' }))
  })
})

describe('CustomNode — switching type away mid-edit', () => {
  // Mirrors the shipped non-JSON components (`undefined`, `NaN`, `Symbol`):
  // value-keyed condition, shown while editing, listed in the type selector.
  // A type-switch away is deferred (local buffer only) like any primitive
  // type change, so the custom component must yield to the target type's
  // standard editor immediately — even though the committed data still
  // matches the condition until the edit is confirmed.
  const nonJsonDef = (
    condition: CustomNodeDefinition['condition'],
    name: string,
    defaultValue: unknown
  ): CustomNodeDefinition => ({
    condition,
    component: () => <span data-testid="custom">CUSTOM</span>,
    showOnEdit: true,
    name,
    showInTypeSelector: true,
    defaultValue,
  })

  const undefinedDef = nonJsonDef(({ value }) => value === undefined, 'undefined', undefined)
  const nanDef = nonJsonDef(({ value }) => Number.isNaN(value), 'NaN', NaN)
  const symbolDef = nonJsonDef(({ value }) => typeof value === 'symbol', 'Symbol', Symbol('new'))
  // Mirrors the shipped Symbol definition: the editable text of a symbol is
  // its description, supplied via `toStandardType`.
  const symbolDefWithHook: CustomNodeDefinition = {
    ...symbolDef,
    toStandardType: (value) =>
      typeof value === 'symbol' ? value.description ?? '' : String(value),
  }

  const startEdit = async (user: ReturnType<typeof userEvent.setup>) => {
    const row = screen.getByTestId('custom').closest('.jer-component') as HTMLElement
    await user.click(within(row).getByTitle('Edit'))
  }

  test('undefined → string: the standard string editor appears, empty, and commits typed text', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor
        data={{ x: undefined }}
        setData={setData}
        customNodeDefinitions={[undefinedDef]}
        showIconTooltips
      />
    )
    await startEdit(user)
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('undefined')

    await user.selectOptions(screen.getByRole('combobox'), 'string')

    // The custom component yields to the string editor, whose buffer is empty
    // (not the DEFAULT_STRING localisation text).
    expect(screen.queryByTestId('custom')).toBeNull()
    const input = container.querySelector('textarea.jer-input-text') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('')

    await user.type(input, 'hello')
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setData).toHaveBeenCalledWith({ x: 'hello' })
  })

  test('NaN → number: the numeric editor appears with 0 and commits', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor
        data={{ x: NaN }}
        setData={setData}
        customNodeDefinitions={[nanDef]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'number')

    expect(screen.queryByTestId('custom')).toBeNull()
    const input = container.querySelector('input.jer-input-number') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('0')

    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setData).toHaveBeenCalledWith({ x: 0 })
  })

  test('Symbol → string: toStandardType pre-fills the symbol description', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <JsonEditor
        data={{ x: Symbol('my description') }}
        setData={noop}
        customNodeDefinitions={[symbolDefWithHook]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'string')

    expect(screen.queryByTestId('custom')).toBeNull()
    const input = container.querySelector('textarea.jer-input-text') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('my description')
  })

  test('Symbol → number: coerces to 0 instead of throwing (Number(symbol) throws)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <JsonEditor
        data={{ x: Symbol('sym') }}
        setData={noop}
        customNodeDefinitions={[symbolDef]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'number')

    expect(screen.queryByTestId('custom')).toBeNull()
    const input = container.querySelector('input.jer-input-number') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('0')
  })

  test('cancelling after a switch-away restores the custom node, nothing committed', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor
        data={{ x: undefined }}
        setData={setData}
        customNodeDefinitions={[undefinedDef]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'string')

    const input = container.querySelector('textarea.jer-input-text') as HTMLTextAreaElement
    await user.type(input, 'discard-me{Escape}')

    expect(setData).not.toHaveBeenCalled()
    expect(screen.getByTestId('custom')).toBeInTheDocument()
    expect(container.querySelector('textarea.jer-input-text')).toBeNull()
  })
})

describe('CustomNode — toStandardType seeds the type-switch buffer', () => {
  // `toStandardType` demotes a definition's custom value to a single
  // primitive seed when the type selector switches the node to a standard
  // type; core's generic coercion handles the rest per target type.
  const hookDef = (
    condition: CustomNodeDefinition['condition'],
    name: string,
    toStandardType: CustomNodeDefinition['toStandardType'],
    overrides: Partial<CustomNodeDefinition> = {}
  ): CustomNodeDefinition => ({
    condition,
    component: () => <span data-testid="custom">CUSTOM</span>,
    showOnEdit: true,
    name,
    showInTypeSelector: true,
    toStandardType,
    ...overrides,
  })

  const startEdit = async (user: ReturnType<typeof userEvent.setup>) => {
    const row = screen.getByTestId('custom').closest('.jer-component') as HTMLElement
    await user.click(within(row).getByTitle('Edit'))
  }

  test('switching to string seeds the buffer from toStandardType, not the raw value', async () => {
    const user = userEvent.setup()
    const def = hookDef(({ value }) => typeof value === 'symbol', 'Symbol', () => 'SEED')
    const { container } = render(
      <JsonEditor
        data={{ x: Symbol('my description') }}
        setData={noop}
        customNodeDefinitions={[def]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'string')

    const input = container.querySelector('textarea.jer-input-text') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('SEED')
  })

  test('object-valued custom node → string seeds the hook output, not "[object Object]"', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const def = hookDef(
      ({ value }) =>
        value instanceof Object && 'text' in value && 'url' in value,
      'Link',
      (value) => (value as { url: string }).url,
      { renderCollectionAsValue: true }
    )
    const { container } = render(
      <JsonEditor
        data={{ x: { text: 'Click here', url: 'https://example.com' } }}
        setData={setData}
        customNodeDefinitions={[def]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'string')

    const input = container.querySelector('textarea.jer-input-text') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('https://example.com')

    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setData).toHaveBeenCalledWith({ x: 'https://example.com' })
  })

  test('the hook seed coerces per target type (number)', async () => {
    const user = userEvent.setup()
    const def = hookDef(({ value }) => typeof value === 'bigint', 'BigInt', (value) =>
      typeof value === 'bigint' ? '456' : ''
    )
    const { container } = render(
      <JsonEditor
        data={{ x: BigInt(123) }}
        setData={noop}
        customNodeDefinitions={[def]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'number')

    const input = container.querySelector('input.jer-input-number') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('456')
  })

  test('the hook applies only while the buffer holds the custom value (not on a second in-session switch)', async () => {
    const user = userEvent.setup()
    const def = hookDef(({ value }) => typeof value === 'symbol', 'Symbol', (value) =>
      typeof value === 'symbol' ? '42' : 'WRONG'
    )
    const { container } = render(
      <JsonEditor
        data={{ x: Symbol('sym') }}
        setData={noop}
        customNodeDefinitions={[def]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'string')
    // The buffer now holds the converted seed; a second switch coerces that
    // buffer generically rather than re-applying the hook to it.
    await user.selectOptions(screen.getByRole('combobox'), 'number')

    const input = container.querySelector('input.jer-input-number') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('42')
  })

  test('without toStandardType, a symbol → string switch seeds the generic String(value)', async () => {
    const user = userEvent.setup()
    const def = hookDef(({ value }) => typeof value === 'symbol', 'Symbol', undefined)
    const { container } = render(
      <JsonEditor
        data={{ x: Symbol('my description') }}
        setData={noop}
        customNodeDefinitions={[def]}
        showIconTooltips
      />
    )
    await startEdit(user)
    await user.selectOptions(screen.getByRole('combobox'), 'string')

    const input = container.querySelector('textarea.jer-input-text') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('Symbol(my description)')
  })
})

describe('CustomNode — fromStandardType commit transform', () => {
  // A minimal custom editor in the shipped-components shape: it writes the
  // display string straight into the core buffer and passes every confirm
  // through core's no-arg `handleEdit`, so the definition's `fromStandardType`
  // is the single transform for ✓, Enter and Tab alike.
  const CustomEditor = (props: CustomComponentProps) => {
    const { value, setValue, isEditing, setIsEditing, handleKeyPress } = props
    return isEditing ? (
      <input
        data-testid="custom-input"
        value={String(value)}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyPress}
      />
    ) : (
      <span data-testid="custom" onDoubleClick={() => setIsEditing(true)}>
        {String(value)}
      </span>
    )
  }

  const bigintDef = (overrides: Partial<CustomNodeDefinition> = {}): CustomNodeDefinition => ({
    condition: ({ value }) => typeof value === 'bigint',
    component: CustomEditor,
    showOnEdit: true,
    name: 'BigInt',
    showInTypeSelector: true,
    fromStandardType: (buffer) => {
      if (typeof buffer === 'bigint') return buffer
      if (!/^\d+$/.test(String(buffer))) throw new Error('Invalid BigInt')
      return BigInt(String(buffer))
    },
    ...overrides,
  })

  const startEdit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.dblClick(screen.getByTestId('custom'))
    return screen.getByTestId('custom-input') as HTMLInputElement
  }

  const setBuffer = (input: HTMLInputElement, text: string) =>
    fireEvent.change(input, { target: { value: text } })

  test('✓ commits the fromStandardType-transformed value, not the raw buffer', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ x: BigInt(5) }} setData={setData} customNodeDefinitions={[bigintDef()]} />
    )
    const input = await startEdit(user)
    setBuffer(input, '123')
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setData).toHaveBeenCalledWith({ x: BigInt(123) })
  })

  test('Enter commits identically to ✓', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(
      <JsonEditor data={{ x: BigInt(5) }} setData={setData} customNodeDefinitions={[bigintDef()]} />
    )
    const input = await startEdit(user)
    setBuffer(input, '123')
    await user.type(input, '{Enter}')
    expect(setData).toHaveBeenCalledWith({ x: BigInt(123) })
  })

  test('a throwing hook rejects: session stays open, error shows, nothing commits — then a fix commits', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onErrorCallback = jest.fn()
    const { container } = render(
      <JsonEditor
        data={{ x: BigInt(5) }}
        setData={setData}
        onError={onErrorCallback}
        customNodeDefinitions={[bigintDef()]}
      />
    )
    const input = await startEdit(user)
    setBuffer(input, 'abc')
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])

    expect(setData).not.toHaveBeenCalled()
    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
    expect(onErrorCallback).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: 'Invalid BigInt' }) })
    )
    expect(container.querySelector('.jer-error-slug')).toHaveTextContent('Invalid BigInt')

    setBuffer(input, '42')
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setData).toHaveBeenCalledWith({ x: BigInt(42) })
    expect(container.querySelector('.jer-error-slug')).toBeNull()
  })

  test('Esc still cancels a rejected session', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ x: BigInt(5) }} setData={setData} customNodeDefinitions={[bigintDef()]} />
    )
    const input = await startEdit(user)
    setBuffer(input, 'abc')
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    fireEvent.keyDown(screen.getByTestId('custom-input'), { key: 'Escape' })

    expect(setData).not.toHaveBeenCalled()
    expect(screen.queryByTestId('custom-input')).toBeNull()
    expect(screen.getByTestId('custom')).toBeInTheDocument()
  })

  test('confirming the unchanged buffer is a no-op (tolerant pass-through)', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn() as jest.MockedFunction<UpdateFunction>
    const { container } = render(
      <JsonEditor
        data={{ x: BigInt(5) }}
        setData={noop}
        onUpdate={onUpdate}
        customNodeDefinitions={[bigintDef()]}
      />
    )
    await startEdit(user)
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.queryByTestId('custom-input')).toBeNull()
  })

  test('an explicit handleEdit(value) bypasses the hook', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const ExplicitEditor = (props: CustomComponentProps) => {
      const { isEditing, setIsEditing, handleEdit } = props
      return isEditing ? (
        <button data-testid="commit-explicit" onClick={() => handleEdit('EXPLICIT')}>
          go
        </button>
      ) : (
        <span data-testid="custom" onDoubleClick={() => setIsEditing(true)}>
          C
        </span>
      )
    }
    render(
      <JsonEditor
        data={{ x: BigInt(5) }}
        setData={setData}
        customNodeDefinitions={[bigintDef({ component: ExplicitEditor })]}
      />
    )
    await user.dblClick(screen.getByTestId('custom'))
    await user.click(screen.getByTestId('commit-explicit'))
    expect(setData).toHaveBeenCalledWith({ x: 'EXPLICIT' })
  })

  test('Tab on an invalid buffer rejects: no commit, same node stays editing', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const TabbingEditor = (props: CustomComponentProps) => {
      const { value, setValue, isEditing, setIsEditing, handleEdit, handleKeyboard, keyboardCommon } =
        props
      return isEditing ? (
        <input
          data-testid="custom-input"
          value={String(value)}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => handleKeyboard(e, { stringConfirm: handleEdit, ...keyboardCommon })}
        />
      ) : (
        <span data-testid="custom" onDoubleClick={() => setIsEditing(true)}>
          {String(value)}
        </span>
      )
    }
    render(
      <JsonEditor
        data={{ x: BigInt(5), y: 'after' }}
        setData={setData}
        customNodeDefinitions={[bigintDef({ component: TabbingEditor })]}
      />
    )
    const input = await startEdit(user)
    setBuffer(input, 'abc')
    fireEvent.keyDown(input, { key: 'Tab' })

    expect(setData).not.toHaveBeenCalled()
    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
  })

  test('a two-field buffer-backed object component commits both edited fields via ✓', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const LinkEditor = (props: CustomComponentProps) => {
      const { value, setValue, isEditing, setIsEditing } = props
      const link = (value ?? {}) as { text: string; url: string }
      return isEditing ? (
        <div>
          <input
            data-testid="field-text"
            value={link.text}
            onChange={(e) => setValue({ ...link, text: e.target.value })}
          />
          <input
            data-testid="field-url"
            value={link.url}
            onChange={(e) => setValue({ ...link, url: e.target.value })}
          />
        </div>
      ) : (
        <span data-testid="custom" onDoubleClick={() => setIsEditing(true)}>
          {link.text}
        </span>
      )
    }
    const linkDef: CustomNodeDefinition = {
      condition: ({ value }) => value instanceof Object && 'text' in value && 'url' in value,
      component: LinkEditor,
      showOnEdit: true,
      renderCollectionAsValue: true,
    }
    const { container } = render(
      <JsonEditor
        data={{ x: { text: 'old text', url: 'old url' } }}
        setData={setData}
        customNodeDefinitions={[linkDef]}
      />
    )
    await user.dblClick(screen.getByTestId('custom'))
    fireEvent.change(screen.getByTestId('field-text'), { target: { value: 'new text' } })
    fireEvent.change(screen.getByTestId('field-url'), { target: { value: 'new url' } })
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setData).toHaveBeenCalledWith({ x: { text: 'new text', url: 'new url' } })
  })
})

describe('CustomNode — editOnTypeSwitch (deferred to-custom switch)', () => {
  // With `editOnTypeSwitch`, switching TO the custom type is a local switch
  // like any primitive type change: the TARGET definition's component renders
  // in edit state on a buffer seeded through its `fromStandardType` (throw →
  // the value's string form; no hook → `defaultValue`), a single commit
  // happens on ✓ (through the same hook), and Esc cancels.
  const CustomEditor = (props: CustomComponentProps) => {
    const { value, setValue, isEditing, setIsEditing, handleKeyPress } = props
    return isEditing ? (
      <input
        data-testid="custom-input"
        value={String(value)}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyPress}
      />
    ) : (
      <span data-testid="custom" onDoubleClick={() => setIsEditing(true)}>
        {String(value)}
      </span>
    )
  }

  const bigintTarget = (overrides: Partial<CustomNodeDefinition> = {}): CustomNodeDefinition => ({
    condition: ({ value }) => typeof value === 'bigint',
    component: CustomEditor,
    showOnEdit: true,
    name: 'BigInt',
    showInTypeSelector: true,
    editOnTypeSwitch: true,
    defaultValue: BigInt(99),
    fromStandardType: (buffer) => (typeof buffer === 'bigint' ? buffer : BigInt(String(buffer))),
    toStandardType: (value) => String(value),
    ...overrides,
  })

  const switchTo = async (user: ReturnType<typeof userEvent.setup>, type: string) =>
    user.selectOptions(screen.getByRole('combobox'), type)

  test('switching to the flagged type opens its component in edit state, seeded from the current value — no commit', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn() as jest.MockedFunction<UpdateFunction>
    render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={setData}
        onUpdate={onUpdate}
        customNodeDefinitions={[bigintTarget()]}
      />
    )
    await user.dblClick(screen.getByText('"hello"'))
    await switchTo(user, 'BigInt')

    // The hook can't convert 'hello' (it throws), so the switch seeds the raw
    // text for the user to fix rather than rejecting
    const input = screen.getByTestId('custom-input') as HTMLInputElement
    expect(input.value).toBe('hello')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('BigInt')
    expect(setData).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  test('✓ commits once, through the target definition’s fromStandardType', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const onUpdate = jest.fn() as jest.MockedFunction<UpdateFunction>
    const { container } = render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={setData}
        onUpdate={onUpdate}
        customNodeDefinitions={[bigintTarget()]}
      />
    )
    await user.dblClick(screen.getByText('"hello"'))
    await switchTo(user, 'BigInt')
    fireEvent.change(screen.getByTestId('custom-input'), { target: { value: '123' } })
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])

    expect(setData).toHaveBeenCalledWith({ x: BigInt(123) })
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('custom-input')).toBeNull()
  })

  test('Esc cancels the switch: original value and rendering restored, nothing committed', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    render(
      <JsonEditor data={{ x: 'hello' }} setData={setData} customNodeDefinitions={[bigintTarget()]} />
    )
    await user.dblClick(screen.getByText('"hello"'))
    await switchTo(user, 'BigInt')
    fireEvent.keyDown(screen.getByTestId('custom-input'), { key: 'Escape' })

    expect(setData).not.toHaveBeenCalled()
    expect(screen.queryByTestId('custom-input')).toBeNull()
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  test('editOnTypeSwitch without showOnEdit falls back to the instant commit', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const instDef: CustomNodeDefinition = {
      condition: ({ value }) => value === 'INST',
      component: () => <span data-testid="inst">I</span>,
      name: 'Inst',
      showInTypeSelector: true,
      editOnTypeSwitch: true,
      defaultValue: 'INST',
    }
    render(<JsonEditor data={{ x: 'hello' }} setData={setData} customNodeDefinitions={[instDef]} />)
    await user.dblClick(screen.getByText('"hello"'))
    await switchTo(user, 'Inst')
    await waitFor(() => expect(setData).toHaveBeenCalledWith({ x: 'INST' }))
  })

  test('a second switch to a standard type seeds via the TARGET definition’s toStandardType', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <JsonEditor
        data={{ x: 42 }}
        setData={noop}
        customNodeDefinitions={[bigintTarget({ toStandardType: (value) => `T:${String(value)}` })]}
      />
    )
    await user.dblClick(screen.getByText('42'))
    await switchTo(user, 'BigInt')
    await switchTo(user, 'string')

    // The buffer holds the target's custom value (42n from the seed), so the
    // target's `toStandardType` seeds the standard editor.
    const input = container.querySelector('textarea.jer-input-text') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('T:42')
  })

  test('a deferred custom → custom switch reseeds the buffer with the second defaultValue', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const markerDef: CustomNodeDefinition = {
      condition: ({ value }) => value === 'MARK',
      component: CustomEditor,
      showOnEdit: true,
      name: 'Marker',
      showInTypeSelector: true,
      editOnTypeSwitch: true,
      defaultValue: 'MARK',
    }
    const { container } = render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={setData}
        customNodeDefinitions={[bigintTarget(), markerDef]}
      />
    )
    await user.dblClick(screen.getByText('"hello"'))
    await switchTo(user, 'BigInt')
    await switchTo(user, 'Marker')

    expect((screen.getByTestId('custom-input') as HTMLInputElement).value).toBe('MARK')
    expect(setData).not.toHaveBeenCalled()

    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setData).toHaveBeenCalledWith({ x: 'MARK' })
  })

  test('a collection defaultValue commits on ✓ and the new collection mounts expanded', async () => {
    const user = userEvent.setup()
    const setDataSpy = jest.fn()
    const objDef: CustomNodeDefinition = {
      condition: ({ value }) => value === 'NEVER',
      component: CustomEditor,
      showOnEdit: true,
      name: 'Obj',
      showInTypeSelector: true,
      editOnTypeSwitch: true,
      defaultValue: { a: 1, b: 2 },
    }
    // Stateful harness: the committed object has to re-enter via the `data`
    // prop for the node to re-route to a CollectionNode.
    const Harness = () => {
      const [data, setData] = useState<object>({ x: 'hello' })
      return (
        <JsonEditor
          data={data}
          setData={(d) => {
            setDataSpy(d)
            setData(d as object)
          }}
          collapse={1}
          customNodeDefinitions={[objDef]}
        />
      )
    }
    const { container } = render(<Harness />)
    await user.dblClick(screen.getByText('"hello"'))
    await switchTo(user, 'Obj')
    expect(setDataSpy).not.toHaveBeenCalled()

    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setDataSpy).toHaveBeenCalledWith({ x: { a: 1, b: 2 } })
    // `collapse={1}` would normally hide the new collection's contents — the
    // switch-commit launches it expanded, matching the instant-commit path.
    await waitFor(() => expect(screen.getByText('a')).toBeInTheDocument())
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  test('a deferred switch on a committed-custom node renders the TARGET component; Esc restores the original', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const symbolDef: CustomNodeDefinition = {
      condition: ({ value }) => typeof value === 'symbol',
      component: () => <span data-testid="symbol-view">SYM</span>,
      showOnEdit: true,
      name: 'Symbol',
      showInTypeSelector: true,
    }
    render(
      <JsonEditor
        data={{ x: Symbol('s') }}
        setData={setData}
        customNodeDefinitions={[symbolDef, bigintTarget()]}
        showIconTooltips
      />
    )
    const row = screen.getByTestId('symbol-view').closest('.jer-component') as HTMLElement
    await user.click(within(row).getByTitle('Edit'))
    await switchTo(user, 'BigInt')

    expect(screen.queryByTestId('symbol-view')).toBeNull()
    // The hook can't convert a symbol (BigInt(String(symbol)) throws), so the
    // switch seeds its string form — never the raw symbol, which a text
    // editor can't render
    expect((screen.getByTestId('custom-input') as HTMLInputElement).value).toBe('Symbol(s)')
    expect(setData).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByTestId('custom-input'), { key: 'Escape' })
    expect(screen.getByTestId('symbol-view')).toBeInTheDocument()
    expect(setData).not.toHaveBeenCalled()
  })

  test('the hook seeds the switch from a convertible current value, and ✓ commits through the same hook', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const { container } = render(
      <JsonEditor data={{ x: 42 }} setData={setData} customNodeDefinitions={[bigintTarget()]} />
    )
    await user.dblClick(screen.getByText('42'))
    await switchTo(user, 'BigInt')

    // The current value (42), not defaultValue (99), seeds the editor
    expect((screen.getByTestId('custom-input') as HTMLInputElement).value).toBe('42')
    expect(setData).not.toHaveBeenCalled()

    fireEvent.change(screen.getByTestId('custom-input'), { target: { value: '123' } })
    await user.click(container.querySelectorAll('.jer-confirm-buttons > div')[0])
    expect(setData).toHaveBeenCalledWith({ x: BigInt(123) })
  })

  test('without fromStandardType the buffer seeds with defaultValue', async () => {
    const user = userEvent.setup()
    render(
      <JsonEditor
        data={{ x: 'hello' }}
        setData={noop}
        customNodeDefinitions={[bigintTarget({ fromStandardType: undefined })]}
      />
    )
    await user.dblClick(screen.getByText('"hello"'))
    await switchTo(user, 'BigInt')
    expect((screen.getByTestId('custom-input') as HTMLInputElement).value).toBe('99')
  })

  test('a custom → custom switch demotes via the source’s toStandardType before the second’s fromStandardType', async () => {
    const user = userEvent.setup()
    const markerDef: CustomNodeDefinition = {
      condition: ({ value }) => value === 'NEVER',
      component: CustomEditor,
      showOnEdit: true,
      name: 'Marker',
      showInTypeSelector: true,
      editOnTypeSwitch: true,
      defaultValue: 'MARK',
      fromStandardType: (value) => `GOT:${typeof value}:${String(value)}`,
    }
    render(
      <JsonEditor
        data={{ x: 42 }}
        setData={noop}
        customNodeDefinitions={[bigintTarget(), markerDef]}
      />
    )
    await user.dblClick(screen.getByText('42'))
    await switchTo(user, 'BigInt')
    await switchTo(user, 'Marker')

    // The BigInt switch seeded the buffer with 42n; the second switch first
    // demotes it through BigInt's `toStandardType` (String), so the target's
    // hook receives the primitive form, not the raw custom value
    expect((screen.getByTestId('custom-input') as HTMLInputElement).value).toBe('GOT:string:42')
  })

  test('an object-valued custom source seeds the target from its toStandardType form, not "[object Object]"', async () => {
    const user = userEvent.setup()
    const linkSource: CustomNodeDefinition = {
      condition: ({ value }) => value instanceof Object && 'url' in value,
      component: CustomEditor,
      showOnEdit: true,
      name: 'Link',
      showInTypeSelector: true,
      editOnTypeSwitch: true,
      renderCollectionAsValue: true,
      defaultValue: { url: 'https://default' },
      toStandardType: (value) => String((value as { url: string }).url),
    }
    const { container } = render(
      <JsonEditor
        data={{ x: { url: 'https://example.com' } }}
        setData={noop}
        customNodeDefinitions={[linkSource, bigintTarget()]}
        showIconTooltips
      />
    )
    const row = screen.getByTestId('custom').closest('.jer-component') as HTMLElement
    await user.click(within(row).getByTitle('Edit'))
    await switchTo(user, 'BigInt')

    // BigInt's hook can't parse the demoted url, so core seeds its string
    // form — the demoted primitive, never the raw object's "[object Object]"
    expect((screen.getByTestId('custom-input') as HTMLInputElement).value).toBe(
      'https://example.com'
    )
    expect(container.textContent).not.toContain('[object Object]')
  })
})

describe('CustomNode — passOriginalNode', () => {
  test('passOriginalNode true → the original node is provided for re-rendering', () => {
    const defs: CustomNodeDefinition[] = [
      {
        condition: ({ key }) => key === 'greeting',
        passOriginalNode: true,
        component: ({ originalNode }: CustomComponentProps) => <div data-testid="cv">{originalNode ?? 'NONE'}</div>,
      },
    ]
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} customNodeDefinitions={defs} />)
    expect(screen.getByTestId('cv')).toBeInTheDocument()
    // the standard value display renders within the custom node
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  test('passOriginalNode default false → originalNode is undefined', () => {
    const defs: CustomNodeDefinition[] = [
      {
        condition: ({ key }) => key === 'greeting',
        component: ({ originalNode }: CustomComponentProps) => <div data-testid="cv">{originalNode ?? 'NONE'}</div>,
      },
    ]
    render(<JsonEditor data={{ greeting: 'hello' }} setData={noop} customNodeDefinitions={defs} />)
    expect(screen.getByTestId('cv')).toHaveTextContent('NONE')
    expect(screen.queryByText('"hello"')).toBeNull()
  })
})

describe('CustomNode — collection flags', () => {
  test('showCollectionWrapper false removes the collection’s collapse control', () => {
    const data = { obj: { a: 1 } }
    const withWrapper = render(<JsonEditor data={data} setData={noop} />).container.querySelectorAll(
      '.jer-collapse-icon'
    ).length
    cleanup()
    const withoutWrapper = render(
      <JsonEditor
        data={data}
        setData={noop}
        customNodeDefinitions={[{ condition: ({ key }) => key === 'obj', showCollectionWrapper: false }]}
      />
    ).container.querySelectorAll('.jer-collapse-icon').length
    expect(withoutWrapper).toBe(withWrapper - 1)
  })

  test('renderCollectionAsValue renders an object through the value slot (no children recursed)', () => {
    const defs: CustomNodeDefinition[] = [
      {
        condition: ({ key }) => key === 'obj',
        renderCollectionAsValue: true,
        component: () => <span data-testid="leaf">LEAF</span>,
      },
    ]
    render(<JsonEditor data={{ obj: { a: 1, b: 2 } }} setData={noop} customNodeDefinitions={defs} />)
    expect(screen.getByTestId('leaf')).toBeInTheDocument()
    // children are not recursed into the tree
    expect(screen.queryByText('1')).toBeNull()
    expect(screen.queryByText('2')).toBeNull()
  })
})

describe('CustomNode — JSON serialization hooks', () => {
  test('stringifyReplacer is applied when the editor serializes (copy)', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const defs: CustomNodeDefinition[] = [
      { condition: () => false, stringifyReplacer: (value) => (value === 'SECRET' ? 'REDACTED' : value) },
    ]
    render(
      <JsonEditor data={{ obj: { token: 'SECRET' } }} setData={noop} customNodeDefinitions={defs} showIconTooltips />
    )
    // copy the root object → serialized through jsonStringify with the replacer
    await user.click(screen.getAllByTitle('Copy to clipboard')[0])
    await waitFor(() => {
      const copied = String(writeText.mock.calls.at(-1)?.[0] ?? '')
      expect(copied).toContain('REDACTED')
      expect(copied).not.toContain('SECRET')
    })
  })

  test('parseReviver transforms values committed through a JSON edit', async () => {
    const user = userEvent.setup()
    const setData = jest.fn()
    const defs: CustomNodeDefinition[] = [
      { condition: () => false, parseReviver: (value) => (value === 'PLACEHOLDER' ? 'REVIVED' : value) },
    ]
    const { container } = render(
      <JsonEditor data={{ x: 'old' }} setData={setData} customNodeDefinitions={defs} showIconTooltips />
    )
    // edit the root object as raw JSON text
    await user.click(screen.getAllByTitle('Edit')[0])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{"x":"PLACEHOLDER"}' } })
    await user.click(container.querySelector('.jer-confirm-buttons > div') as HTMLElement)
    await waitFor(() => expect(setData).toHaveBeenCalledWith({ x: 'REVIVED' }))
  })
})

// A promise whose resolution the test drives, to control when a background
// `onUpdate` settlement lands.
const makeDeferred = <T = unknown,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('CustomNode — isPending (optimistic settlement)', () => {
  // Renders the value plus a "SAVING" marker while `isPending` is true, so the
  // optimistic-commit window is directly observable in the DOM.
  const PendingProbe = ({ value, isPending }: CustomComponentProps) => (
    <span>
      {String(value)}
      {isPending && <span data-testid="pending">SAVING</span>}
    </span>
  )

  test('a custom node sees isPending true while an async onUpdate settles, then false', async () => {
    const user = userEvent.setup()
    const deferred = makeDeferred()
    const onUpdate = jest.fn(() => deferred.promise as ReturnType<UpdateFunction>)
    const defs: CustomNodeDefinition[] = [
      { condition: ({ key }) => key === 'greeting', component: PendingProbe },
    ]
    // Controlled, so the optimistic value is actually applied + re-rendered
    // (mirrors a real consumer owning `data`).
    const Controlled = () => {
      const [data, setLocal] = useState<{ greeting: string }>({ greeting: 'hello' })
      return (
        <JsonEditor
          data={data}
          setData={(d) => setLocal(d as { greeting: string })}
          onUpdate={onUpdate}
          customNodeDefinitions={defs}
          showIconTooltips
        />
      )
    }
    render(<Controlled />)

    // Nothing pending at rest.
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.queryByTestId('pending')).toBeNull()

    // Edit greeting → 'world' and submit. The edit applies optimistically and
    // the (still-unresolved) onUpdate keeps the node in its settling window.
    const row = screen.getByText('hello').closest('.jer-component') as HTMLElement
    await user.click(within(row).getByTitle('Edit'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'world{Enter}')

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('world')).toBeInTheDocument()
    expect(screen.getByTestId('pending')).toBeInTheDocument()

    // Settle the background update → the pending marker clears.
    await act(async () => {
      deferred.resolve(true)
    })
    await waitFor(() => expect(screen.queryByTestId('pending')).toBeNull())
    expect(screen.getByText('world')).toBeInTheDocument()
  })
})
