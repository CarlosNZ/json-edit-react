import React from 'react'

export interface CustomSelectProps {
  /** Available options, in display order. */
  options: string[]
  /** Controlled value. Mutually exclusive with `defaultValue`. */
  value?: string
  /** Initial value when used uncontrolled — typically `''` so the
   *  placeholder shows first. Mutually exclusive with `value`. */
  defaultValue?: string
  /** Fired with the selected option's value. */
  onChange: (value: string) => void
  /** Forwarded to the underlying input. Lets the call site keep
   *  ownership of keyboard semantics via `handleKeyboard(...)`. */
  onKeyDown?: (e: React.KeyboardEvent) => void
  /** Grab focus on mount. */
  autoFocus?: boolean
  /** Disabled first option shown when nothing is selected. */
  placeholder?: string
  /** Form name / id hint. */
  name?: string
  /** Class applied to the inner control. */
  className?: string
}

export const NativeSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  defaultValue,
  onChange,
  placeholder,
  className,
  // Remaining props (name, onKeyDown, autoFocus) are spread onto
  // the <select> unchanged.
  ...passthrough
}) => {
  // React warns if both `value` and `defaultValue` are passed —
  // only spread whichever the caller supplied.
  const valueProps =
    value !== undefined ? { value } : { defaultValue: defaultValue ?? '' }

  return (
    <div className="jer-select">
      <select
        className={className ?? 'jer-select-inner'}
        onChange={(e) => onChange(e.target.value)}
        {...passthrough}
        {...valueProps}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="focus"></span>
    </div>
  )
}
