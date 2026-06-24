#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const PACKAGES = [
  { name: 'json-edit-react', pkgJsonPath: 'package.json' },
  { name: '@json-edit-react/themes', pkgJsonPath: 'packages/themes/package.json' },
  { name: '@json-edit-react/components', pkgJsonPath: 'packages/components/package.json' },
]

const CONSUMERS = ['demo']

const POLL_INTERVAL_MS = 5_000
const POLL_MAX_ATTEMPTS = 24 // 24 * 5s = 2 min

const readJson = (relPath) => JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const getConsumerDep = (consumerPkg, name) =>
  consumerPkg.dependencies?.[name] ?? consumerPkg.devDependencies?.[name] ?? null

const npmHasVersion = (name, version) => {
  try {
    execSync(`npm view ${name}@${version} version`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return true
  } catch {
    return false
  }
}

const waitForPublish = async (name, version) => {
  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
    if (npmHasVersion(name, version)) return true
    console.log(`    waiting for ${name}@${version} on npm (${attempt}/${POLL_MAX_ATTEMPTS})`)
    if (attempt < POLL_MAX_ATTEMPTS) await sleep(POLL_INTERVAL_MS)
  }
  return false
}

const syncDemos = async () => {
  console.log('Syncing demo apps to published library versions\n')

  const targets = PACKAGES.map((p) => ({
    name: p.name,
    version: readJson(p.pkgJsonPath).version,
  }))

  for (const consumer of CONSUMERS) {
    console.log(`[${consumer}]`)
    const consumerPkg = readJson(`${consumer}/package.json`)

    for (const { name, version } of targets) {
      const currentDep = getConsumerDep(consumerPkg, name)
      if (!currentDep) {
        console.log(`  - ${name}: not a dependency, skipping`)
        continue
      }
      if (currentDep === version) {
        console.log(`  - ${name}@${version}: already current`)
        continue
      }
      console.log(`  - ${name}: ${currentDep} -> ${version}`)

      const available = await waitForPublish(name, version)
      if (!available) {
        console.error(
          `    ! ${name}@${version} not on npm after ${POLL_MAX_ATTEMPTS} attempts, skipping`
        )
        continue
      }

      execSync(`yarn add ${name}@${version}`, {
        cwd: join(ROOT, consumer),
        stdio: 'inherit',
      })
    }
    console.log()
  }
}

syncDemos().catch((err) => {
  console.error('sync-demos failed:', err)
  process.exit(1)
})
