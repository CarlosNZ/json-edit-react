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

  test('Symbol → string: the string editor pre-fills the symbol description', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <JsonEditor
        data={{ x: Symbol('my description') }}
        setData={noop}
        customNodeDefinitions={[symbolDef]}
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
