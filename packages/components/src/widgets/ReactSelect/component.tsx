/**
 * A reference wrapper around `react-select` that satisfies the
 * `SelectProps` contract, so it can be passed to JsonEditor's
 * `Select` prop to replace the built-in native <select>.
 *
 * It adapts the contract's `string[]` options and value-based onChange to
 * react-select's `{value, label}` option objects and option-based onChange.
 * Deliberately minimal — fork it for richer use cases: virtualisation,
 * creatable, async, themed styles.
 */

import React, { lazy, Suspense } from 'react'
import { type SelectProps } from 'json-edit-react'
import { type Props as ReactSelectProps } from 'react-select'
import { Loading } from '../../_common/Loading'

interface Option {
  value: string
  label: string
}

// `lazy()` drops the generic parameterisation of the default export, so this
// re-narrows to a non-multi Select<Option> and the passed-through props
// type-check.
const Select = lazy(() => import('react-select')) as unknown as React.ComponentType<
  ReactSelectProps<Option, false>
>

export interface ReactSelectExtraProps {
  /** Forwarded as-is to the underlying `react-select` component (styles,
   *  classNames, isSearchable, isClearable, components, etc.). Anything the
   *  contract owns — options, value, onChange — wins over what's passed
   *  here. */
  reactSelectProps?: Partial<ReactSelectProps<Option, false>>
}

export const ReactSelect = ({
  options,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  autoFocus,
  placeholder,
  name,
  className,
  reactSelectProps,
}: SelectProps & ReactSelectExtraProps) => {
  const optionObjects: Option[] = options.map((v) => ({ value: v, label: v }))
  const findOption = (v: string | undefined): Option | null =>
    v === undefined ? null : (optionObjects.find((o) => o.value === v) ?? null)

  // Mirrors NativeSelect: pass only one of value/defaultValue, rather than
  // straddling controlled and uncontrolled.
  const valueProps =
    value !== undefined
      ? { value: findOption(value) }
      : { defaultValue: findOption(defaultValue ?? '') }

  return (
    <Suspense fallback={<Loading text="Loading select" />}>
      <Select
        {...reactSelectProps}
        options={optionObjects}
        onChange={(opt) => onChange((opt as Option | null)?.value ?? '')}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        placeholder={placeholder}
        name={name}
        className={className}
        {...valueProps}
      />
    </Suspense>
  )
}
