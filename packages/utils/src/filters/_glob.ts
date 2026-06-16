import type { PathPattern } from './types'

// Compiles a path pattern into a matcher over a node's `path`. The three input
// forms collapse to two strategies: a RegExp is tested against the stringified
// path; a glob string or a segment array compiles to a sequence of per-segment
// matchers plus the `**` globstar. Compilation happens once (at builder-call
// time, behind `intern`); the returned matcher runs per node.
//
// Glob rules (anchored at both ends; segments split on `.`, with `[n]`
// normalised to `.n`):
//   foo      a literal segment — matches the key `foo` exactly
//   *        any one whole segment (does not cross a `.`)
//   *Id      within a segment, `*` is zero-or-more chars — matches `userId`
//   ?        within a segment, exactly one char
//   {a,b}    alternation within a segment (nestable)
//   **       a globstar: zero or more whole segments (a whole subtree)
// So `users.*` matches `users.0` but not `users.0.name`, while `users.**`
// matches `users`, `users.0`, and `users.0.name`. See the package README's
// "Path patterns" section for the full reference.

// Sentinel for the `**` token (zero-or-more whole segments). A symbol so it
// can never be confused with a compiled-segment RegExp.
const GLOBSTAR = Symbol('globstar')
type Token = RegExp | typeof GLOBSTAR

// Render a path the way the editor's copy-path / error strings do — dotted
// keys, `[n]` for numeric indices. This is the string a RegExp pattern tests.
const stringifyPath = (path: Array<string | number>): string =>
  path.reduce<string>(
    (acc, seg) =>
      typeof seg === 'number' ? `${acc}[${seg}]` : acc === '' ? `${seg}` : `${acc}.${seg}`,
    ''
  )

// Split a glob string into segments: bracket indices are normalised to dotted
// (`users[0]` → `users.0`), then we split on `.`, dropping empty pieces (from a
// leading bracket or `..`). Dots are ALWAYS separators here — a key containing
// a literal dot must use the segment-array form instead.
const splitGlob = (pattern: string): string[] =>
  pattern
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((seg) => seg !== '')

// Regex metacharacters with no glob meaning — escaped to match literally.
// (`* ? { } ,` are handled explicitly below, so they're absent here.)
const LITERAL_META = /[.+^$()|[\]\\]/

// Compile one segment pattern to a RegExp anchored to a whole segment. Glob
// tokens within a segment: `*` = any run of chars, `?` = one char, `{a,b}` =
// alternation (comma splits only inside braces; depth tracked so it's robust).
const compileSegment = (segment: string): RegExp => {
  let out = ''
  let depth = 0
  for (const ch of segment) {
    if (ch === '*') out += '[^]*'
    else if (ch === '?') out += '[^]'
    else if (ch === '{') {
      out += '(?:'
      depth++
    } else if (ch === '}' && depth > 0) {
      out += ')'
      depth--
    } else if (ch === ',' && depth > 0) out += '|'
    else out += LITERAL_META.test(ch) ? `\\${ch}` : ch
  }
  if (depth > 0) out += ')'.repeat(depth) // tolerate an unclosed `{`
  return new RegExp(`^${out}$`)
}

// Match a token sequence against path segments. Each RegExp token consumes
// exactly one segment; GLOBSTAR consumes zero or more. Standard greedy wildcard
// matching, backtracking onto the most recent GLOBSTAR when a later token
// fails.
const matchSegments = (tokens: Token[], segments: string[]): boolean => {
  let ti = 0
  let si = 0
  let starTi = -1 // token index of the last GLOBSTAR seen
  let starSi = 0 // segment index where that GLOBSTAR started consuming
  while (si < segments.length) {
    const tok: Token | undefined = ti < tokens.length ? tokens[ti] : undefined
    if (tok instanceof RegExp && tok.test(segments[si])) {
      ti++
      si++
    } else if (tok === GLOBSTAR) {
      starTi = ti
      starSi = si
      ti++ // first try matching zero segments
    } else if (starTi !== -1) {
      ti = starTi + 1 // backtrack: let the GLOBSTAR swallow one more segment
      si = ++starSi
    } else {
      return false
    }
  }
  while (tokens[ti] === GLOBSTAR) ti++ // trailing GLOBSTARs may match zero
  return ti === tokens.length
}

export const compilePathMatcher = (
  pattern: PathPattern
): ((path: Array<string | number>) => boolean) => {
  if (pattern instanceof RegExp) {
    return (path) => pattern.test(stringifyPath(path))
  }
  const segments = Array.isArray(pattern) ? pattern.map(String) : splitGlob(pattern)
  const tokens: Token[] = segments.map((s) => (s === '**' ? GLOBSTAR : compileSegment(s)))
  return (path) => matchSegments(tokens, path.map(String))
}
