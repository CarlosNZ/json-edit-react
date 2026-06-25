#!/usr/bin/env node
/**
 * Run a publish/pack command with one or more sub-package READMEs temporarily
 * swapped for their npm-friendly form, then restore the originals — even if the
 * command throws, the publish fails, or the run is interrupted.
 *
 * Why a temporary swap instead of a staging dir? A sub-package's npm README is
 * a pure transform of its committed `README.md` (GitHub admonitions -> bold-
 * label blockquotes), and its `package.json` is already publish-clean. So,
 * unlike core (which assembles a short README from a template and must trim a
 * large root `package.json` — see `stage-package.mjs`), there's nothing to
 * stage: we just transform the README in place for the publish window and put
 * it back. Publishing happens from the normal package root, so pnpm's
 * `workspace:` peer-dep replacement works as usual.
 *
 * Restore is git-based and self-healing: each target README must be tracked and
 * clean before we start, so `git checkout -- <readme>` always returns it to its
 * committed state. Even a hard kill leaves only an obviously-modified tracked
 * file that `git restore` fixes.
 *
 * Usage:
 *   node scripts/with-npm-readme.mjs <pkgDir> [<pkgDir>...] -- <command> [args...]
 *
 * Examples:
 *   # Preview one package's tarball (run from the package dir):
 *   node ../../scripts/with-npm-readme.mjs . -- pnpm pack
 *   # Publish a sub-package to npm (run from the repo root):
 *   node scripts/with-npm-readme.mjs packages/themes -- pnpm publish --access public --no-git-checks
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Split argv into [pkgDir...] and [command ...args] around the `--` separator.
const argv = process.argv.slice(2)
const sep = argv.indexOf('--')
if (sep < 1 || sep === argv.length - 1) {
  console.error(
    'Usage: node scripts/with-npm-readme.mjs <pkgDir> [<pkgDir>...] -- <command> [args...]'
  )
  process.exit(1)
}
const pkgDirs = argv.slice(0, sep).map((d) => resolve(d))
const [command, ...commandArgs] = argv.slice(sep + 1)

// Escape hatch: run the command untouched — no swap, guard, or restore. For
// the rare case of packing with an intentionally-dirty README (e.g. a quick
// `SKIP_NPM_README_SWAP=1 pnpm pack-all` mid-edit). The default everywhere,
// pack-all included, is to swap so the output mirrors what publishes.
if (process.env.SKIP_NPM_README_SWAP) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', cwd: process.cwd() })
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}

const readmeOf = (pkgDir) => join(pkgDir, 'README.md')

function assertRestorable(pkgDir) {
  const readme = readmeOf(pkgDir)
  if (!existsSync(readme)) {
    console.error(`✗ ${readme} not found`)
    process.exit(1)
  }
  // Must be tracked, so `git checkout` can restore it...
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', readme], {
      cwd: repoRoot,
      stdio: 'ignore',
    })
  } catch {
    console.error(`✗ ${readme} is not tracked by git — cannot guarantee restore. Aborting.`)
    process.exit(1)
  }
  // ...and clean, so restoring can't clobber uncommitted work.
  const status = execFileSync('git', ['status', '--porcelain', '--', readme], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (status.trim() !== '') {
    console.error(
      `✗ ${readme} has uncommitted changes — commit or stash it first, or set ` +
        `SKIP_NPM_README_SWAP=1 to run without the README swap. Aborting.`
    )
    process.exit(1)
  }
}

function transform(pkgDir) {
  const readme = readmeOf(pkgDir)
  // Passthrough mode (whole README, admonitions only) with link rewriting off
  // so in-page anchors stay in-page on the npm page.
  execFileSync(
    'python3',
    [
      join(repoRoot, 'scripts', 'build_npm_readme.py'),
      '--source',
      readme,
      '--output',
      readme,
      '--no-link-rewrite',
    ],
    { stdio: 'inherit', cwd: repoRoot }
  )
}

const swapped = []
let restored = false
function restoreAll() {
  if (restored) return
  restored = true
  for (const pkgDir of swapped) {
    const readme = readmeOf(pkgDir)
    try {
      execFileSync('git', ['checkout', '--', readme], { cwd: repoRoot, stdio: 'inherit' })
    } catch {
      console.error(`✗ Failed to restore ${readme} — restore manually: git checkout -- ${readme}`)
    }
  }
}

// Belt-and-suspenders: restore on interruption too. (spawnSync blocks the event
// loop, so during the child these fire only once it returns; the `finally`
// below is the primary guarantee. Registering them also stops Node's default
// terminate-without-cleanup on these signals.)
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    restoreAll()
    process.exit(1)
  })
}

// Validate every target before touching anything.
pkgDirs.forEach(assertRestorable)

let exitCode = 0
try {
  for (const pkgDir of pkgDirs) {
    transform(pkgDir)
    swapped.push(pkgDir)
  }
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', cwd: process.cwd() })
  if (result.error) throw result.error
  exitCode = result.status ?? 1
} finally {
  restoreAll()
}
process.exit(exitCode)
