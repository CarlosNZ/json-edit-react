/**
 * A reference wrapper around `react-select` that satisfies the
 * `CustomSelectProps` contract, so it can be passed to JsonEditor's
 * `CustomSelect` prop to replace the built-in native <select>.
 *
 * Adapts the contract's `string[]` options + value-based onChange to
 * react-select's `{value, label}` option objects + option-based onChange.
 * Kept minimal on purpose — fork this for richer use cases (virtualization,
 * creatable, async, themed styles).
 */

import React, { lazy, Suspense } from 'react'
import { type CustomSelectProps } from 'json-edit-react'
import { type Props as ReactSelectProps } from 'react-select'
import { Loading } from '../_common/Loading'

interface Option {
  value: string
  label: string
}

// `lazy()` drops the generic parameterization of the default export; re-narrow
// to a non-multi Select<Option> so the props we pass through type-check.
const Select = lazy(() => import('react-select')) as unknown as React.ComponentType<
  ReactSelectProps<Option, false>
>

export interface ReactSelectExtraProps {
  /** Forwarded as-is to the underlying `react-select` component (styles,
   *  classNames, isSearchable, isClearable, components, etc.). Anything our
   *  contract owns (options, value, onChange) wins over what's passed here. */
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
}: CustomSelectProps & ReactSelectExtraProps) => {
  const optionObjects: Option[] = options.map((v) => ({ value: v, label: v }))
  const findOption = (v: string | undefined): Option | null =>
    v === undefined ? null : (optionObjects.find((o) => o.value === v) ?? null)

  // Mirror NativeSelect: pass only one of value/defaultValue so we don't
  // straddle controlled/uncontrolled.
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
