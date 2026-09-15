import { useMemo } from 'react'
import { type CustomComponentProps } from 'json-edit-react'

export interface NumberFormatterProps {
  // Options forwarded verbatim to `Intl.NumberFormat`: the decimal, currency,
  // percent and unit styles, compact and scientific notation, grouping, sign
  // display, fraction and significant digits, and rounding.
  options?: Intl.NumberFormatOptions
  // BCP-47 locale tags for `Intl.NumberFormat`. Omit for the runtime's default.
  locale?: string | string[]
}

/**
 * Display-only formatter for number values: each number renders through
 * `Intl.NumberFormat` (thousands separators, currency, percent, …) while the
 * stored value is left untouched. Editing goes to the node's standard number
 * editor, since the definition sets `showOnEdit: false`, so the raw
 * unformatted number is always what's edited.
 */
export const NumberFormatter = (props: CustomComponentProps<NumberFormatterProps>) => {
  const { value, setIsEditing, canEdit, getStyles, nodeData, componentProps } = props
  const { options, locale } = componentProps ?? {}

  // Stable across renders while `componentProps` is, which it is, being fixed
  // in the definition, so the formatter isn't rebuilt per node per render. A
  // malformed `options` (`style: 'currency'` with no `currency`, say) throws
  // here, deliberately loudly, so the misconfiguration surfaces in
  // development.
  const formatter = useMemo(() => new Intl.NumberFormat(locale, options), [locale, options])

  // Only ever rendered in view mode (`showOnEdit: false`). A non-number can't
  // get past the guard, but this falls back defensively rather than throwing.
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
