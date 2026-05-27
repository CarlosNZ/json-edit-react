#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const [baseFile, prFile] = process.argv.slice(2)
if (!baseFile || !prFile) {
  process.stderr.write('Usage: format-size-diff.mjs <base-sizes.json> <pr-sizes.json>\n')
  process.exit(1)
}

const base = JSON.parse(readFileSync(baseFile, 'utf8'))
const pr = JSON.parse(readFileSync(prFile, 'utf8'))

const fmtBytes = (n) => {
  const abs = Math.abs(n)
  if (abs < 1024) return `${n} B`
  if (abs < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

const fmtDelta = (b, p) => {
  if (b === undefined) return '— (new)'
  const d = p - b
  const pct = b === 0 ? 0 : (d / b) * 100
  const sign = d > 0 ? '🔺 +' : d < 0 ? '🟢 ' : ''
  return `${sign}${fmtBytes(d)} (${d >= 0 ? '+' : ''}${pct.toFixed(2)}%)`
}

let out = '## Bundle size impact\n\n'
const pkgKeys = Object.keys(pr)
if (pkgKeys.length === 0) {
  out += '_No tracked source files changed in this PR._\n'
  process.stdout.write(out)
  process.exit(0)
}

for (const key of pkgKeys) {
  out += `### \`${pr[key].name}\`\n\n`
  out += '| Format | Base raw | PR raw | Δ raw | Base gzip | PR gzip | Δ gzip |\n'
  out += '|---|---:|---:|---:|---:|---:|---:|\n'
  for (const fmt of ['esm', 'cjs']) {
    const b = base[key]?.files?.[fmt]
    const p = pr[key]?.files?.[fmt]
    if (!p) continue
    if (p.missing) {
      out += `| ${fmt} | — | ⚠️ missing | — | — | — | — |\n`
      continue
    }
    const bRaw = b && !b.missing ? b.raw : undefined
    const bGz = b && !b.missing ? b.gzip : undefined
    out += `| ${fmt} | ${bRaw === undefined ? '— (new)' : fmtBytes(bRaw)} | ${fmtBytes(p.raw)} | ${fmtDelta(bRaw, p.raw)} | ${bGz === undefined ? '— (new)' : fmtBytes(bGz)} | ${fmtBytes(p.gzip)} | ${fmtDelta(bGz, p.gzip)} |\n`
  }
  out += '\n'
}
out += '<sub>Measured from `build/index.{cjs,esm}.js`. Gzip at level 9.</sub>\n'
process.stdout.write(out)
