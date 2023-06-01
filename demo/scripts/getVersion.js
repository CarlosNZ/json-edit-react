const pkg = require('../../package.json')
const fs = require('fs')

const { version } = pkg

console.log('Writing version:', version)
fs.writeFileSync('./src/version.ts', `export const version = '${version}'`)
