#!/usr/bin/env node
/**
 * `pnpm release [core|utils|themes|components] [--dry-run]` — cut and publish
 * a release of one package from this machine.
 *
 *  1. Asks which package to release, unless it's named on the command line.
 *  2. Checks the npm login, and logs in through the browser when there is
 *     none. `npm login` sessions last two hours, and a publish on a lapsed
 *     one fails rather than prompting, so this runs before anything changes.
 *  3. Asks for the next version, suggesting the likely ones. A pre-release is
 *     `X.Y.Z-beta.N`, published under the `beta` dist-tag, never `latest`.
 *  4. Stops unless the package's CHANGELOG.md has a `## X.Y.Z` entry for it.
 *     A beta passes on its release's entry, or on one of its own,
 *     `## X.Y.Z-beta.N`.
 *  5. Bumps the package's package.json.
 *  6. Runs the checks: lint, tests, typecheck and build. A sub-package
 *     typechecks against core's `build/`, so core is built first.
 *  7. Commits the bump and tags it (annotated): core as `vX.Y.Z`, a
 *     sub-package as `@json-edit-react/<name>@X.Y.Z`, so the four packages'
 *     tags never collide.
 *  8. Publishes under the dist-tag, through the same paths as the `pub:*`
 *     scripts: core from the `build_package/` staging dir, a sub-package from
 *     its own dir with its README swapped for the npm form.
 *
 * Nothing is pushed; the last lines printed are the push command and the
 * follow-ups.
 *
 * A sub-package's published peer range on core is frozen from core's
 * `version` at pack time, so when a release needs a new core, release core
 * first. The confirmation prompt shows the range that will ship.
 *
 * `--dry-run` runs every step against the real version bump, but makes no
 * commit or tag, publishes with `--dry-run`, and puts package.json back as
 * it was, even on failure. It only warns about uncommitted changes, where a
 * real release refuses, and about a missing npm login, which a dry-run
 * publish doesn't need.
 *
 * The v1 line is released from the `v1.x` branch, which does not carry this
 * script.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const NAMED = args.find((arg) => !arg.startsWith('--')) ?? null

const SUB_PACKAGES = ['utils', 'themes', 'components']

/** Everything that differs between core and a sub-package. */
const PACKAGES = {
  core: {
    dir: '.',
    checks: [
      ['pnpm', ['lint']],
      ['pnpm', ['test']],
      ['pnpm', ['compile']],
      // prebuild repeats lint and the tests; the tests have just run
      ['pnpm', ['build-package'], { SKIP_TESTS: '1' }],
    ],
    tagFor: (version) => `v${version}`,
    // npm version's convention, which earlier core releases follow
    messageFor: (version) => version,
    publish: (distTag) => ({
      command: 'pnpm',
      args: ['publish', '--tag', distTag, '--no-git-checks'],
    }),
  },
  ...Object.fromEntries(
    SUB_PACKAGES.map((name) => [
      name,
      {
        dir: `packages/${name}`,
        checks: [
          // Covers every package: the root Jest pass picks up packages/*/test
          ['pnpm', ['test']],
          ['pnpm', ['build'], { SKIP_TESTS: '1' }],
          ['pnpm', ['--filter', `@json-edit-react/${name}`, 'compile']],
          ['pnpm', ['--filter', `@json-edit-react/${name}`, 'build']],
        ],
        tagFor: (version) => `@json-edit-react/${name}@${version}`,
        messageFor: (version) => `@json-edit-react/${name}@${version}`,
        // From the package's own dir, since `pnpm -C <dir> publish` is broken
        // on pnpm 10.8.x
        publish: (distTag) => ({
          command: 'node',
          args: [
            '../../scripts/with-npm-readme.mjs',
            '.',
            '--',
            'pnpm',
            'publish',
            '--access',
            'public',
            '--no-git-checks',
            '--tag',
            distTag,
          ],
          cwd: `packages/${name}`,
        }),
      },
    ])
  ),
}

const KEYS = Object.keys(PACKAGES)

const packageJsonOf = (key) => join(PACKAGES[key].dir, 'package.json')
const changelogOf = (key) => join(PACKAGES[key].dir, 'CHANGELOG.md')
const readPackage = (key) => JSON.parse(readFileSync(packageJsonOf(key), 'utf8'))

// ── Versions ───────────────────────────────────────────────────────────────

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/
const PRE_RELEASE = /^beta\.(\d+)$/

const parse = (text) => {
  const match = SEMVER.exec(text)
  if (!match) return null
  const [, major, minor, patch, pre] = match
  return { major: +major, minor: +minor, patch: +patch, pre: pre ?? null }
}

const core = ({ major, minor, patch }) => `${major}.${minor}.${patch}`
const format = (v) => (v.pre ? `${core(v)}-${v.pre}` : core(v))
const isBeta = (v) => PRE_RELEASE.test(v.pre ?? '')
const betaNumber = (v) => Number(PRE_RELEASE.exec(v.pre ?? '')?.[1] ?? NaN)

const compareCore = (a, b) => a.major - b.major || a.minor - b.minor || a.patch - b.patch

/** Semver precedence: a release outranks its own pre-releases. */
const compare = (a, b) => {
  const byCore = compareCore(a, b)
  if (byCore !== 0) return byCore
  if (!a.pre || !b.pre) return (a.pre ? -1 : 0) - (b.pre ? -1 : 0)
  return betaNumber(a) - betaNumber(b)
}

/**
 * A current pre-release that isn't a beta (`0.9.0-dev`) is a placeholder that
 * was never published, so any release or beta of the same version or later
 * follows it.
 */
const isPlaceholder = (v) => v.pre !== null && !isBeta(v)

const follows = (next, current) =>
  isPlaceholder(current) ? compareCore(next, current) >= 0 : compare(next, current) > 0

const suggestionsFor = (current) => {
  const { major, minor, patch } = current
  const v = (major, minor, patch, pre = null) => ({ major, minor, patch, pre })
  if (isPlaceholder(current)) return [v(major, minor, patch, 'beta.0'), v(major, minor, patch)]
  if (current.pre)
    return [v(major, minor, patch, `beta.${betaNumber(current) + 1}`), v(major, minor, patch)]
  return [
    v(major, minor, patch + 1),
    v(major, minor + 1, 0),
    v(major + 1, 0, 0),
    v(major, minor, patch + 1, 'beta.0'),
    v(major, minor + 1, 0, 'beta.0'),
    v(major + 1, 0, 0, 'beta.0'),
  ]
}

const distTag = (v) => (v.pre ? 'beta' : 'latest')

// ── Shell ──────────────────────────────────────────────────────────────────

class ReleaseError extends Error {}

const run = (command, args, { capture = false, env, cwd } = {}) => {
  const result = spawnSync(command, args, {
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    env: env ? { ...process.env, ...env } : process.env,
    cwd,
  })
  if (result.status !== 0) throw new ReleaseError(`\`${[command, ...args].join(' ')}\` failed`)
  return capture ? result.stdout.trim() : ''
}

const loggedIn = () => spawnSync('npm', ['whoami'], { stdio: 'ignore' }).status === 0

const tagExists = (tag) =>
  spawnSync('git', ['rev-parse', '--quiet', '--verify', `refs/tags/${tag}`]).status === 0

/** The version `dist-tag` points at on npm, or null. */
const publishedUnder = (name, tag) => {
  const result = spawnSync('npm', ['view', name, `dist-tags.${tag}`], {
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
  })
  return result.status === 0 ? parse(result.stdout.trim()) : null
}

const step = (text) => console.log(`\n▸ ${text}`)

/**
 * The version whose CHANGELOG.md entry covers `v`, or null. A beta may have
 * an entry of its own, but usually shares its release's: the top entry runs
 * one version ahead of package.json, collecting notes as they land.
 */
const changelogEntryFor = (key, v) => {
  const changelog = readFileSync(changelogOf(key), 'utf8')
  const heading = (version) => new RegExp(`^## ${version.replace(/\./g, '\\.')}\\s*$`, 'm')
  const candidates = v.pre ? [format(v), core(v)] : [format(v)]
  return candidates.find((version) => heading(version).test(changelog)) ?? null
}

// ── The release ────────────────────────────────────────────────────────────

/**
 * Lines are read through the iterator, which buffers them, rather than
 * rl.question(), which drops input typed or piped ahead of the prompt and
 * never settles if input ends.
 */
const prompter = () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const lines = rl[Symbol.asyncIterator]()
  const ask = async (prompt) => {
    process.stdout.write(prompt)
    const { value, done } = await lines.next()
    if (done) throw new ReleaseError('no answer — input ended')
    return value.trim()
  }
  return { ask, close: () => rl.close() }
}

const choosePackage = async (ask) => {
  if (NAMED) {
    if (!KEYS.includes(NAMED))
      throw new ReleaseError(`'${NAMED}' is not a package — use one of: ${KEYS.join(', ')}`)
    return NAMED
  }
  console.log('Packages:\n')
  KEYS.forEach((key, i) => {
    const { name, version } = readPackage(key)
    console.log(`  ${i + 1}) ${name.padEnd(30)}${version}`)
  })
  const answer = await ask('\nRelease which package (a number above, or its name)? ')
  const picked = /^\d+$/.test(answer) ? KEYS[Number(answer) - 1] : answer
  if (!KEYS.includes(picked))
    throw new ReleaseError(`'${answer}' is neither a listed number nor a package`)
  console.log()
  return picked
}

const chooseVersion = async (ask, key, name, current) => {
  const suggestions = suggestionsFor(current)
  console.log(`${name}: current version ${format(current)}\n`)
  suggestions.forEach((v, i) => console.log(`  ${i + 1}) ${format(v)}${v.pre ? '  (beta)' : ''}`))
  const answer = await ask('\nNext version (a number above, or type one): ')
  const picked = /^\d+$/.test(answer) ? suggestions[Number(answer) - 1] : parse(answer)
  if (!picked) throw new ReleaseError(`'${answer}' is neither a listed number nor a version`)
  if (picked.pre && !isBeta(picked))
    throw new ReleaseError(`a pre-release must be X.Y.Z-beta.N, not ${format(picked)}`)
  if (!follows(picked, current))
    throw new ReleaseError(`${format(picked)} does not follow the current ${format(current)}`)
  const tag = PACKAGES[key].tagFor(format(picked))
  if (tagExists(tag)) throw new ReleaseError(`the tag ${tag} already exists`)
  const entry = changelogEntryFor(key, picked)
  if (!entry)
    throw new ReleaseError(
      `${changelogOf(key)} has no entry for ${format(picked)} — add a "## ${core(picked)}" ` +
        `section first${picked.pre ? `, or one headed "## ${format(picked)}"` : ''}`
    )
  console.log(`\nCHANGELOG entry: ## ${entry}`)
  if (key !== 'core')
    console.log(`Peer range on core: json-edit-react ^${readPackage('core').version}`)
  const branch = run('git', ['branch', '--show-current'], { capture: true })
  const confirm = await ask(
    `\n${DRY_RUN ? 'Dry run: release' : 'Release'} ${name}@${format(picked)} under the npm ` +
      `dist-tag "${distTag(picked)}", from branch ${branch}? [y/N] `
  )
  if (!/^y(es)?$/i.test(confirm)) throw new ReleaseError('cancelled')
  return picked
}

const main = async () => {
  if (DRY_RUN) console.log('DRY RUN — no commit, no tag, and publish --dry-run\n')

  const dirty = run('git', ['status', '--porcelain'], { capture: true })
  if (dirty && !DRY_RUN)
    throw new ReleaseError('the working tree has uncommitted changes — commit or stash them first')
  if (dirty) console.log('Note: the working tree has uncommitted changes (allowed in a dry run)\n')

  const { ask, close } = prompter()
  let key, current, next
  try {
    key = await choosePackage(ask)

    if (!loggedIn()) {
      if (DRY_RUN) console.log('Note: not logged in to npm (a real release logs in first)\n')
      else {
        step('Not logged in to npm: logging in through the browser')
        run('npm', ['login', '--auth-type=web'])
        console.log()
      }
    }

    const { name, version: currentText } = readPackage(key)
    current = parse(currentText)
    if (!current) throw new ReleaseError(`${packageJsonOf(key)}'s version is not semver`)
    next = await chooseVersion(ask, key, name, current)
  } finally {
    close()
  }

  const pkg = PACKAGES[key]
  const { name } = readPackage(key)
  const packageJson = packageJsonOf(key)
  const originalPackage = readFileSync(packageJson, 'utf8')
  const version = format(next)
  const tag = pkg.tagFor(version)
  const publish = pkg.publish(distTag(next))
  if (DRY_RUN) publish.args.push('--dry-run')
  const publishCommand = [publish.command, ...publish.args].join(' ')
  const publishHint = publish.cwd ? `(cd ${publish.cwd} && ${publishCommand})` : publishCommand

  // A child receives Ctrl-C itself; ignoring it here lets the failed step
  // unwind through the restore below instead of exiting mid-release
  process.on('SIGINT', () => {})

  let committed = false
  const restore = () => writeFileSync(packageJson, originalPackage)
  try {
    step(`Bumping ${name} ${format(current)} → ${version}`)
    writeFileSync(
      packageJson,
      originalPackage.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`)
    )

    for (const [command, args, env] of pkg.checks) {
      step(
        [...(env ? Object.entries(env).map(([k, v]) => `${k}=${v}`) : []), command, ...args].join(
          ' '
        )
      )
      run(command, args, { env })
    }

    if (!DRY_RUN) {
      step(`Committing and tagging ${tag}`)
      const message = pkg.messageFor(version)
      run('git', ['add', packageJson])
      run('git', ['commit', '--quiet', '-m', message])
      run('git', ['tag', '-a', tag, '-m', message])
      committed = true
    }

    step(publishHint)
    run(publish.command, publish.args, { cwd: publish.cwd })
  } catch (error) {
    if (committed)
      console.error(
        `\nThe commit and tag ${tag} exist locally only. Fix the problem and run ` +
          `\`${publishHint}\`, or undo them with ` +
          `\`git tag -d ${tag} && git reset --soft HEAD~1\`.`
      )
    else if (!DRY_RUN) restore()
    throw error
  } finally {
    if (DRY_RUN) restore()
  }

  if (DRY_RUN) {
    console.log(`\nDry run of ${name}@${version} complete; ${packageJson} restored.`)
    return
  }
  console.log(
    `\nPublished ${name}@${version} under "${distTag(next)}". Push with:\n  git push --follow-tags`
  )
  // `beta` left behind `latest` would make `@beta` install an older version
  const beta = next.pre ? null : publishedUnder(name, 'beta')
  if (beta && compare(beta, next) < 0)
    console.log(
      `\n"beta" still points at ${format(beta)}. Move it up with:\n` +
        `  npm dist-tag add ${name}@${version} beta`
    )
  console.log('\nThen `pnpm sync-demos` to bump the demo to the new version.')
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof ReleaseError ? error.message : error.stack}`)
  process.exit(1)
})
