import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'

const INLINE = '?inline'

// Turn `import css from './style.css?inline'` into a module whose default
// export is the minified stylesheet text.
//
// `?inline` is Vite's convention for importing a stylesheet's text instead of
// injecting it, which is what lets the demo's `local` mode consume `src/`
// directly. Rollup has no query convention, so this plugin resolves the
// specifier itself: the plain `.css` path is located through the normal
// resolver, the `?inline` marker is kept on the module id so the `load` hook
// handles exactly these imports and nothing else, then the file is read and
// minified with esbuild.
//
// The result is `export default '<css>'` with no injector call, so the
// stylesheet is an ordinary string constant that only its consumer references.
// That is what lets a bundler shake it out along with whatever renders it; the
// runtime injection happens in the consumer (core's `src/injectStyles.ts`,
// components' `useStyles`). Issues #396 and #398.
export const inlineCss = () => ({
  name: 'inline-css',
  async resolveId(source, importer) {
    if (!source.endsWith(`.css${INLINE}`)) return null
    const resolved = await this.resolve(source.slice(0, -INLINE.length), importer, {
      skipSelf: true,
    })
    return resolved && `${resolved.id}${INLINE}`
  },
  load(id) {
    if (!id.endsWith(`.css${INLINE}`)) return null
    const file = id.slice(0, -INLINE.length)
    this.addWatchFile(file)
    const { code } = transformSync(readFileSync(file, 'utf8'), { loader: 'css', minify: true })
    return { code: `export default ${JSON.stringify(code.trim())}`, map: { mappings: '' } }
  },
})
