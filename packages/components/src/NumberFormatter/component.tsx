import { useMemo } from 'react'
import { type CustomComponentProps } from 'json-edit-react'

export interface NumberFormatterProps {
  // Options forwarded verbatim to `Intl.NumberFormat`. Covers decimal /
  // currency / percent / unit styles, compact & scientific notation,
  // grouping, sign display, fraction & significant digits, and rounding.
  options?: Intl.NumberFormatOptions
  // BCP-47 locale tag(s) for `Intl.NumberFormat`. Omit to use the runtime's
  // default locale.
  locale?: string | string[]
}

/**
 * Display-only formatter for number values: renders each number through
 * `Intl.NumberFormat` (thousands separators, currency, percent, …) while the
 * stored value is left untouched. Editing is delegated to the node's standard
 * number editor (the definition sets `showOnEdit: false`), so the raw,
 * unformatted number is always what you edit.
 */
export const NumberFormatter = (props: CustomComponentProps<NumberFormatterProps>) => {
  const { value, setIsEditing, canEdit, getStyles, nodeData, componentProps } = props
  const { options, locale } = componentProps ?? {}

  // Stable across renders while `componentProps` is (it's fixed in the
  // definition), so the formatter isn't rebuilt for every node on each render.
  // A malformed `options` (e.g. `style: 'currency'` with no `currency`) throws
  // here — deliberately loud, so the misconfiguration surfaces in development.
  const formatter = useMemo(() => new Intl.NumberFormat(locale, options), [locale, options])

  // Only ever rendered in view mode (`showOnEdit: false`). A non-number can't
  // reach here past the guard, but fall back defensively rather than throw.
  const displayValue = typeof value === 'number' ? formatter.format(value) : String(value)

  return (
    <span
      onDoubleClick={() => canEdit && setIsEditing(true)}
      className="jer-value-number"
      style={getStyles('number', nodeData)}
    >
      {displayValue}
    </span>
  )
}
