#!/usr/bin/env node
import { statSync, readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'

const PACKAGES = {
  core: { name: 'json-edit-react', dir: 'build' },
  themes: { name: '@json-edit-react/themes', dir: 'packages/themes/build' },
  components: { name: '@json-edit-react/components', dir: 'packages/components/build' },
}

const ENV_FLAGS = {
  core: 'MEASURE_CORE',
  themes: 'MEASURE_THEMES',
  components: 'MEASURE_COMPONENTS',
}

const FORMATS = [
  { format: 'esm', file: 'index.esm.js' },
  { format: 'cjs', file: 'index.cjs.js' },
]

const result = {}
for (const [key, pkg] of Object.entries(PACKAGES)) {
  if (process.env[ENV_FLAGS[key]] !== 'true') continue
  result[key] = { name: pkg.name, files: {} }
  for (const { format, file } of FORMATS) {
    const path = resolve(pkg.dir, file)
    if (!existsSync(path)) {
      result[key].files[format] = { missing: true }
      continue
    }
    const raw = statSync(path).size
    const gzip = gzipSync(readFileSync(path), { level: 9 }).length
    result[key].files[format] = { raw, gzip }
  }
}
process.stdout.write(JSON.stringify(result, null, 2))
