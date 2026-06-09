// Removes demo-only scaffolding from an example's source before it's displayed,
// so the shown snippet is the clean, copy-pasteable version while the running
// file keeps whatever wiring the shell needs (e.g. the theme picker). Follows
// the Shiki/twoslash convention: a trailing `// ---cut---` drops that single
// line, and a `// ---cut-start---` / `// ---cut-end---` pair drops everything
// between them.
export const stripCutRegions = (source: string): string => {
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

  // Collapse the blank gap a removed import/line can leave behind, then trim
  // the leading/trailing whitespace `?raw` includes.
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
