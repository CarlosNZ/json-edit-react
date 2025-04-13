/**
 * This script causes the correct version of json-edit-react to be imported to
 * the Demo app on launch, based on the environment variable VITE_USE_LOCAL_SRC.
 *
 * If VITE_USE_LOCAL_SRC=true, it will import from the local src directory.
 * Otherwise it will use the built package from npm
 */

const fs = require('fs')
const path = require('path')

// Read the provider from the environment variable
const provider = process.env.VITE_USE_LOCAL_SRC === 'true' ? 'local' : 'package'

const src = path.resolve(__dirname, `import.${provider}.ts`)
const dest = path.resolve(__dirname, 'import.ts')

if (!fs.existsSync(src)) {
  console.error(`❌ No file found for provider "${provider}". Expected at: ${src}`)
  process.exit(1)
}

fs.copyFileSync(src, dest)
console.log(`✅ Copied ${provider} import file to import.ts`)
