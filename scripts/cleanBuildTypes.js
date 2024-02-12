/**
 * There is a problem with the export of the Typescript declarations file: the
 * current version of Typescript exports types with the "type" prefix, e.g.
 *
 * {export type Type1, type Type2, normalFunction...}
 *
 * However, older versions of Typescript don't understand this syntax, and throw
 * an error when using this package. Current workaround is to run this script
 * immediately after build (postbuild script in package.json), which replaces
 * the "type" exports with "old" style ones, e.g:
 *
 * {export Type1, Type2, normalFunction...}
 *
 * This will then work on both new and old Typescript environments.
 *
 * There has to a better way to handle this, but I haven't found it. If you
 * know, please let me know: https://github.com/CarlosNZ/json-edit-react
 */

const fs = require('fs-extra')

const exportTextMatch = /^export { type .+ };$/m

const cleanBuildTypes = async () => {
  const data = await fs.readFile('build/index.d.ts', 'utf8')
  const exportText = exportTextMatch.exec(data)[0]
  const cleanedText = exportText.replace(/ type(.+?)/gm, '$1')
  const newData = data.replace(exportText, cleanedText)
  console.log('Cleaning up type declarations...')

  await fs.writeFile('build/index.d.ts', newData)
}

cleanBuildTypes()
