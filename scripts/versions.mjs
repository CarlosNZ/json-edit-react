// One-glance release status: local (next publish) vs what's on npm.
// Run from the repo root: `pnpm run versions`
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packages = [
  ['json-edit-react', 'package.json'],
  ['@json-edit-react/utils', 'packages/utils/package.json'],
  ['@json-edit-react/themes', 'packages/themes/package.json'],
  ['@json-edit-react/components', 'packages/components/package.json'],
]

for (const [name, path] of packages) {
  const local = JSON.parse(readFileSync(path, 'utf8')).version
  let tags
  try {
    tags = execSync(`npm dist-tag ls ${name}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')
      .join('   ')
  } catch {
    tags = '(never published)'
  }
  console.log(`\n${name}`)
  console.log(`  local (next publish): ${local}`)
  console.log(`  on npm:               ${tags || '(no tags)'}`)
}
console.log('')
