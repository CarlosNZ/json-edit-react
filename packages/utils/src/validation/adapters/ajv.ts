import type { ValidationIssue, Validate } from '../types'

/**
 * The slice of an AJV error object this adapter reads. Declared structurally so
 * the package needs no `ajv` dependency — not even a type-only one: a real
 * compiled AJV validate function and its errors satisfy this shape.
 */
export interface AjvErrorLike {
  instancePath: string
  message?: string
  keyword: string
  params?: { missingProperty?: string }
}

/** A compiled AJV validate function (structural — see `AjvErrorLike`). */
export interface AjvValidateFunction {
  (data: unknown): boolean
  errors?: AjvErrorLike[] | null
}

// Parse an AJV `instancePath` — a JSON Pointer like `/payment/method` or
// `/items/0` — into the canonical path array. Empty pointer → `[]` (root).
// Decodes the JSON-Pointer escapes (`~1` → `/`, then `~0` → `~`, per RFC 6901)
// and coerces all-digit segments to numbers (array indices).
const pointerToPath = (pointer: string): (string | number)[] => {
  if (pointer === '') return []
  return pointer
    .split('/')
    .slice(1)
    .map((segment) => {
      const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~')
      return /^\d+$/.test(decoded) ? Number(decoded) : decoded
    })
}

/**
 * Adapt a compiled AJV validate function (`ajv.compile(schema)`) to the
 * `Validate` contract `useValidationState` consumes. Compile AJV with
 * `allErrors: true` to surface every problem at once.
 *
 * ```tsx
 * const ajv = new Ajv({ allErrors: true })
 * const validate = ajvAdapter(ajv.compile(schema))
 * const validation = useValidationState(data, validate)
 * ```
 *
 * `required` errors are reported by AJV at the *parent* object's path with the
 * missing key in `params.missingProperty`. The parent path is kept (the missing
 * child has no node to style) and the property name is folded into the message.
 */
export const ajvAdapter =
  (validate: AjvValidateFunction): Validate =>
  (data) => {
    validate(data)
    return (validate.errors ?? []).map((error): ValidationIssue => {
      const message =
        error.keyword === 'required' && error.params?.missingProperty
          ? `Missing required property '${error.params.missingProperty}'`
          : (error.message ?? 'Invalid')
      return {
        path: pointerToPath(error.instancePath),
        message,
        keyword: error.keyword,
        raw: error,
      }
    })
  }
