/**
 * This script causes the correct version of json-edit-react to be imported to
 * the Demo app on launch, based on the environment variable VITE_JRE_SOURCE.
 *
 * - VITE_JRE_SOURCE = "local" => use from local src (import.local.ts)
 * - VITE_JRE_SOURCE = "package" => use from locally built package
 *   (import.package.ts)
 * - VITE_JRE_SOURCE = "published" (or undefined) => use from package published
 *   to npm (import.published.ts)
 */

import fs from 'fs'
import path from 'path'

// Read the provider from the environment variable
const provider = process.env.VITE_JRE_SOURCE ?? 'published'

const src = path.resolve('src/imports', `import.${provider}.ts`)
const dest = path.resolve('src/imports', 'import.ts')

if (!fs.existsSync(src)) {
  console.error(`❌ No file found for provider "${provider}". Expected at: ${src}`)
  process.exit(1)
}

fs.copyFileSync(src, dest)
console.log(`✅ Copied ${provider} import file to import.ts`)
