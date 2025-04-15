#!/usr/bin/env node

import { execSync } from 'child_process'

const foldersToInstall = ['demo', 'custom-component-library']

/**
 * Installs the most recent version of a package (stable or beta)
 * @param {string} packageName - The name of the package to check
 */
async function installLatestPackage(packageName = 'json-edit-react') {
  console.log('Installing most recent version of the published package in apps...')
  try {
    // Get all package info in a single call
    const packageData = JSON.parse(execSync(`npm view ${packageName} --json`).toString())

    // Get stable version from dist-tags (always exists)
    const stableVersion = packageData['dist-tags'].latest
    const stableDate = new Date(packageData.time[stableVersion])

    console.log(`Latest stable: ${stableVersion} (${stableDate.toISOString()})`)

    // Check if beta tag exists
    if (!packageData['dist-tags'].beta) {
      console.log('No beta version available. Installing stable version')
      installPackage(packageName, betaVersion, foldersToInstall)
      return
    }

    // Get beta version and timestamp
    const betaVersion = packageData['dist-tags'].beta
    const betaDate = new Date(packageData.time[betaVersion])

    console.log(`Latest beta: ${betaVersion} (${betaDate.toISOString()})`)

    // Compare dates and install the most recent version
    if (betaDate > stableDate) {
      installPackage(packageName, betaVersion, foldersToInstall)
    } else {
      installPackage(packageName, betaVersion, foldersToInstall)
    }
  } catch (error) {
    console.error('Error checking or installing package:', error.message)
  }
}

const installPackage = (packageName, version, installFolders) => {
  for (const folder of installFolders) {
    console.log(`Installing version ${version} in ${folder}`)
    execSync(`cd ${folder} && yarn add ${packageName}@${version}`, { stdio: 'inherit' })
  }
}

// Run the function with default package or pass a different package name
const packageName = process.argv[2] || 'json-edit-react'
installLatestPackage(packageName)
