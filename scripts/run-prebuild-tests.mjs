// Runs `pnpm test` as part of the prebuild chain. Set SKIP_TESTS=1 to skip
// (e.g. for iterating on a build artefact while some unrelated test is red).
import { spawnSync } from 'node:child_process'

if (process.env.SKIP_TESTS === '1') {
  console.log('⚠️  Skipping tests (SKIP_TESTS=1)')
  process.exit(0)
}

const result = spawnSync('pnpm', ['test'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
