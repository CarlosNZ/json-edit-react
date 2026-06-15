// A node location. Mirrors core's `NodeData['path']` (an array of object keys
// and array indices). `CollectionKey` isn't part of core's public API, so the
// element type is inlined here.
type Path = (string | number)[]

/**
 * One normalized validation problem. Adapters (e.g. `ajvAdapter`) map a
 * validation library's native error into this shape; a hand-written normalizer
 * can produce it directly.
 */
export interface ValidationIssue {
  /** Normalized node location. `[]` is the document root. */
  path: Path
  /** Human-readable message, produced by the adapter / normalizer. */
  message: string
  /** Library-specific code, e.g. `'required'`, `'type'`, `'pattern'`. */
  keyword?: string
  /** The library's original error object — an escape hatch; never compared. */
  raw?: unknown
}

/**
 * A normalized validator: runs over the whole document and returns the current
 * set of issues (empty when valid). This is what `useValidationState` consumes
 * — wrap an AJV validator with `ajvAdapter`, or write one inline.
 */
export type Validate = (data: unknown) => ValidationIssue[]

/**
 * The queryable validation index returned by `useValidationState`. Every lookup
 * is O(1). The object's *reference* is stable while the error set is unchanged
 * — see `useValidationState` for why that matters.
 */
export interface ValidationState {
  /** True when there are no issues. */
  isValid: boolean
  /** Every issue, in the order the normalizer produced them. */
  errors: ValidationIssue[]
  /** Is there an issue at exactly this node? (the style-function hot path) */
  hasErrorAt: (path: Path) => boolean
  /** Issues at exactly this node (for tooltips / messages / summaries). */
  errorsAt: (path: Path) => ValidationIssue[]
  /** Is there an issue at this node OR any descendant? (ancestor marking) */
  hasErrorWithin: (path: Path) => boolean
}
