// Removes demo-only scaffolding from an example's source before it's displayed,
// so the shown snippet is the clean, copy-pasteable version while the running
// file keeps whatever wiring the shell needs (e.g. the theme picker). Follows
// the Shiki/twoslash convention: a trailing `// ---cut---` drops that single
// line, and a `// ---cut-start---` / `// ---cut-end---` pair drops everything
// between them. Also rewrites the core import alias to its real npm name (see
// the return) so copied imports resolve for a consumer.
export const prepareExampleSource = (source: string): string => {
  const kept: string[] = []
  let cutting = false

  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '// ---cut-start---') {
      cutting = true
      continue
    }
    if (trimmed === '// ---cut-end---') {
      cutting = false
      continue
    }
    if (cutting) continue
    if (trimmed.endsWith('// ---cut---')) continue
    kept.push(line)
  }

  // Collapse the blank gap a removed line leaves behind, trim the leading /
  // trailing whitespace `?raw` includes, then rewrite the demo's core alias to
  // the real npm name so the shown imports match what a consumer installs.
  // Only the bare `@json-edit-react` (core — published as `json-edit-react`)
  // loses its `@`; the scoped siblings (`@json-edit-react/utils`, `/themes`,
  // `/components`) keep theirs, since that IS their published name. The `['"]`
  // lookahead pins the match to the end of a module specifier, so a
  // `@json-edit-react/…` subpath (followed by `/`) is left untouched.
  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/@json-edit-react(?=['"])/g, 'json-edit-react')
}
