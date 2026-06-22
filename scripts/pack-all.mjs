#!/usr/bin/env node
/**
 * Pack all four packages and extract them to `pack-output/` so the demo can
 * consume them via `VITE_JRE_SOURCE=pack`.
 *
 * Runs each package's `preview-publish` script (which performs the same
 * build + pack steps that `pnpm publish` would), then untars each `.tgz` into
 * its own dir under `pack-output/`. The extracted dirs contain a `package/`
 * subdir — vite aliases point straight at that.
 *
 * Run from repo root: `pnpm pack-all`
 */

import { execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(repoRoot, 'pack-output')

const targets = [
  {
    label: 'json-edit-react (core)',
    srcDir: repoRoot,
    tarballPrefix: 'json-edit-react-',
    previewPublishCwd: repoRoot,
    destName: 'json-edit-react',
  },
  {
    label: '@json-edit-react/themes',
    srcDir: join(repoRoot, 'packages', 'themes'),
    tarballPrefix: 'json-edit-react-themes-',
    previewPublishCwd: join(repoRoot, 'packages', 'themes'),
    destName: 'themes',
  },
  {
    label: '@json-edit-react/components',
    srcDir: join(repoRoot, 'packages', 'components'),
    tarballPrefix: 'json-edit-react-components-',
    previewPublishCwd: join(repoRoot, 'packages', 'components'),
    destName: 'components',
  },
  {
    label: '@json-edit-react/utils',
    srcDir: join(repoRoot, 'packages', 'utils'),
    tarballPrefix: 'json-edit-react-utils-',
    previewPublishCwd: join(repoRoot, 'packages', 'utils'),
    destName: 'utils',
  },
]

function findStaleTarballs({ srcDir, tarballPrefix }) {
  return readdirSync(srcDir)
    .filter((f) => f.startsWith(tarballPrefix) && f.endsWith('.tgz'))
    .map((f) => join(srcDir, f))
}

// 1. Clean previous output and any stale tarballs so the post-pack scan finds
// exactly one .tgz per package
console.log('Cleaning previous pack-output/ and stale .tgz files...')
rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })
for (const target of targets) {
  for (const tgz of findStaleTarballs(target)) unlinkSync(tgz)
}

// 2. Pack each package via its preview-publish script
for (const target of targets) {
  console.log(`\n→ Packing ${target.label}...`)
  execSync('pnpm preview-publish', {
    cwd: target.previewPublishCwd,
    stdio: 'inherit',
  })
}

// 3. Extract each tarball into pack-output/<destName>/ (yielding
// pack-output/<destName>/package/) and install its runtime deps so things
// like `react-datepicker` resolve when vite walks up the node_modules tree
// from the packed file's location. Peer deps and dev deps are skipped —
// peers are provided by the consumer (the demo), and dev deps aren't needed
// at runtime.
console.log('')
for (const target of targets) {
  const tarballs = findStaleTarballs(target)
  if (tarballs.length !== 1) {
    throw new Error(
      `Expected exactly one ${target.tarballPrefix}*.tgz in ${target.srcDir}, found ${tarballs.length}`
    )
  }
  const [tarball] = tarballs
  const dest = join(outputDir, target.destName)
  mkdirSync(dest, { recursive: true })
  execSync(`tar -xzf "${tarball}" -C "${dest}"`, { stdio: 'inherit' })
  unlinkSync(tarball)
  const pkgDir = join(dest, 'package')
  const pkgJsonPath = join(pkgDir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  // Strip peer + dev deps before npm install — both can reference
  // workspace-internal versions (e.g. `json-edit-react@2.0.0-dev`) that aren't
  // on npm. We only need runtime `dependencies` resolvable so vite can walk
  // the node_modules tree for things like `react-datepicker`. Peers come from
  // the consumer (the demo); dev deps aren't needed at all at this stage.
  let mutated = false
  if (pkg.peerDependencies) { delete pkg.peerDependencies; mutated = true }
  if (pkg.devDependencies) { delete pkg.devDependencies; mutated = true }
  if (mutated) writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n')
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
    console.log(`  installing runtime deps for ${target.label}...`)
    // --omit=peer: npm 7+ auto-installs peer deps of runtime deps (e.g.
    //   `react-datepicker` declares `react` as a peer), which would put a
    //   second copy of React inside `pack-output/<name>/package/node_modules/`.
    //   Vite's walk-up resolution would find that copy first, giving the demo
    //   two React instances and breaking hooks. The consumer (the demo)
    //   already provides React, so skip peer installation here.
    execSync(
      'npm install --omit=peer --no-package-lock --no-audit --no-fund --silent',
      { cwd: pkgDir, stdio: 'inherit' }
    )
  }
  console.log(`✓ ${target.label} → pack-output/${target.destName}/package/`)
}

if (!existsSync(join(outputDir, 'json-edit-react', 'package', 'package.json'))) {
  throw new Error('pack-all completed but pack-output/json-edit-react/package/package.json is missing')
}

console.log('\nAll four packages packed and extracted. Run `yarn start:pack` or `yarn build:pack` in demo.')
