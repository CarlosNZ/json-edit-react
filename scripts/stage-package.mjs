#!/usr/bin/env node
/**
 * Assemble a self-contained publish-ready directory for the core
 * `json-edit-react` package at `build_package/`.
 *
 * Why a staging dir? The repo-root `README.md` is the long GitHub one — not
 * what we want on the npm page. Rather than swap it in-place (the old
 * `prepublishOnly` flow, fragile if publish fails mid-way), we publish from a
 * different directory whose `README.md` is the short, npm-appropriate version.
 *
 * Invoked by `pnpm build-package` after `pnpm build` has produced `build/`.
 * `publishConfig.directory: "build_package"` in the root package.json tells
 * pnpm / Changesets to publish from here.
 */

import { execFileSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  readdirSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const stagingDir = join(repoRoot, 'build_package')
const buildDir = join(repoRoot, 'build')

// Fields kept in the staged package.json. Anything not in this list is
// dropped — in particular `scripts`, `devDependencies`, `pnpm`,
// `packageManager`, and `publishConfig` (the last is mandatory: pnpm
// double-resolves the path if `publishConfig.directory` is left in the staged
// copy).
const KEEP_FIELDS = [
  'name',
  'version',
  'description',
  'main',
  'module',
  'types',
  'sideEffects',
  'exports',
  'files',
  'repository',
  'author',
  'license',
  'homepage',
  'peerDependencies',
  'dependencies',
  'keywords',
]

function ensureBuildExists() {
  try {
    if (!statSync(buildDir).isDirectory()) throw new Error()
  } catch {
    console.error(`✗ ${buildDir} not found. Run \`pnpm build\` first.`)
    process.exit(1)
  }
}

function resetStagingDir() {
  rmSync(stagingDir, { recursive: true, force: true })
  mkdirSync(stagingDir, { recursive: true })
}

function writeTrimmedPackageJson() {
  const sourcePkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
  const stagedPkg = {}
  for (const field of KEEP_FIELDS) {
    if (field in sourcePkg) stagedPkg[field] = sourcePkg[field]
  }
  writeFileSync(join(stagingDir, 'package.json'), JSON.stringify(stagedPkg, null, 2) + '\n')
}

function copyBuild() {
  cpSync(buildDir, join(stagingDir, 'build'), { recursive: true })
}

function copyRootFile(name, { required = true } = {}) {
  const src = join(repoRoot, name)
  try {
    statSync(src)
  } catch {
    if (required) {
      console.error(`✗ ${name} not found at repo root`)
      process.exit(1)
    }
    return false
  }
  cpSync(src, join(stagingDir, name))
  return true
}

function generateReadme() {
  execFileSync(
    'python3',
    [join(repoRoot, 'scripts', 'build_npm_readme.py'), '--output', join(stagingDir, 'README.md')],
    { stdio: 'inherit', cwd: repoRoot }
  )
}

function dirSizeBytes(dir) {
  let total = 0
  let files = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const sub = dirSizeBytes(full)
      total += sub.bytes
      files += sub.files
    } else {
      total += statSync(full).size
      files += 1
    }
  }
  return { bytes: total, files }
}

function summarize() {
  const { bytes, files } = dirSizeBytes(stagingDir)
  const kb = (bytes / 1024).toFixed(1)
  console.log(`✓ Staged ${files} files (${kb} KB) at build_package/`)
}

ensureBuildExists()
resetStagingDir()
writeTrimmedPackageJson()
copyBuild()
copyRootFile('LICENSE')
copyRootFile('CHANGELOG.md', { required: false })
generateReadme()
summarize()
