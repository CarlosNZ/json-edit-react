#!/usr/bin/env node
/**
 * Bump a sub-package's version, then commit and tag it.
 *
 * `npm version` only creates a commit + tag when run from the git repo root,
 * so inside `packages/<name>` it edits `package.json` and stops there. This
 * wrapper does the git half: a version commit and an annotated tag scoped to
 * the package (`@json-edit-react/<name>@<version>`), so the four packages'
 * tags never collide. Nothing is pushed — `git push --follow-tags` does that.
 *
 * Usage (from the repo root, via the `bump:<name>` scripts):
 *   node scripts/bump-package.mjs <utils|themes|components> <npm version args>
 *   e.g. node scripts/bump-package.mjs themes patch
 *        node scripts/bump-package.mjs themes prerelease --preid=beta
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = ['utils', 'themes', 'components']

const [name, ...versionArgs] = process.argv.slice(2)

const fail = (message) => {
  console.error(`✗ ${message}`)
  process.exit(1)
}

if (!PACKAGES.includes(name)) fail(`First argument must be one of: ${PACKAGES.join(', ')}`)
if (versionArgs.length === 0)
  fail('Missing version argument (patch | minor | major | prerelease --preid=beta | <exact>)')

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()

// Same precondition `npm version` enforces at the root: the version commit
// must contain only the bump, never unrelated work.
if (git('status', '--porcelain')) fail('Working tree is not clean — commit your work first')

const pkgDir = join(repoRoot, 'packages', name)
const pkgJsonPath = join(pkgDir, 'package.json')

execFileSync('npm', ['version', ...versionArgs, '--no-git-tag-version'], {
  cwd: pkgDir,
  stdio: 'inherit',
})

const { name: pkgName, version } = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
const tag = `${pkgName}@${version}`

// Checked before committing, so a clash leaves an uncommitted bump to discard
// rather than a commit with no tag.
if (git('tag', '--list', tag)) {
  fail(
    `Tag ${tag} already exists — revert packages/${name}/package.json and choose another version`
  )
}

git('add', pkgJsonPath)
git('commit', '--message', tag)
git('tag', '--annotate', tag, '--message', tag)

console.log(`✓ ${tag} — version commit + annotated tag created (not pushed)`)
