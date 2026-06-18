import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs-extra'
import JSON5 from 'json5'

// Parse `.json5` imports to a plain object at build time, mirroring Vite's
// built-in `.json` handling — consumers get a ready-made object with no runtime
// parse and no `json5` in their bundle. Bare imports only; `?raw` imports keep
// their text (Vite handles those itself).
const json5Plugin = (): Plugin => ({
  name: 'json5',
  transform(code, id) {
    if (!id.endsWith('.json5')) return null
    const data = JSON5.parse(code)
    // `JSON.parse('…')` evaluates faster than a large inline object literal.
    return {
      code: `export default JSON.parse(${JSON.stringify(JSON.stringify(data))})`,
      map: null,
    }
  },
})

type PackageOption = 'npm' | 'local' | 'build' | 'pack'

const provider: PackageOption = (process.env.VITE_JRE_SOURCE as PackageOption) ?? 'npm'

console.log(`Using json-edit-react from: ${provider}`)

const coreSrcMap: Record<PackageOption, { pkgJson: string; src: string }> = {
  npm: {
    pkgJson: path.join('node_modules', 'json-edit-react', 'package.json'),
    src: 'json-edit-react',
  },
  local: {
    pkgJson: path.join('..', 'package.json'),
    src: path.resolve(__dirname, '../src'),
  },
  // `build` mode reads core's raw rollup output (`build/`) directly, so a plain
  // `pnpm build` is enough — no need to re-stage `build_package/`, which exists
  // only to assemble the npm-publish tree (short README + trimmed package.json).
  // `pack` mode below is the true publish dress-rehearsal. Point at the ESM file,
  // not the dir: `build/` has no package.json / index.js for Vite to resolve.
  // Version comes from the root package.json (build/ carries no version).
  build: {
    pkgJson: path.join('..', 'package.json'),
    src: path.resolve(__dirname, '../build/index.esm.js'),
  },
  pack: {
    pkgJson: path.resolve(__dirname, '../pack-output/json-edit-react/package/package.json'),
    src: path.resolve(__dirname, '../pack-output/json-edit-react/package'),
  },
}

// Core's standalone stylesheet ships under its own subpath
// (`json-edit-react/style.css`, for Shadow DOM / manual injection), so it needs
// its own resolution target — the bare `json-edit-react` alias is anchored and
// won't match the subpath.
const coreStyleSrcMap: Record<PackageOption, string> = {
  npm: 'json-edit-react/style.css',
  local: path.resolve(__dirname, '../src/style.css'),
  build: path.resolve(__dirname, '../build/style.css'),
  pack: path.resolve(__dirname, '../pack-output/json-edit-react/package/build/style.css'),
}

// For `npm` mode, scoped sibling packages must be installed in demo/node_modules
// (they fall through to normal node_modules resolution). For `local`, `build`,
// and `pack` modes, vite rewrites the import to the in-repo path.
const themesSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/themes',
  local: path.resolve(__dirname, '../packages/themes/src'),
  build: path.resolve(__dirname, '../packages/themes/build/index.esm.js'),
  pack: path.resolve(__dirname, '../pack-output/themes/package'),
}

const componentsSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/components',
  local: path.resolve(__dirname, '../packages/components/src'),
  build: path.resolve(__dirname, '../packages/components/build/index.esm.js'),
  pack: path.resolve(__dirname, '../pack-output/components/package'),
}

// The editor-slot widgets (`ReactSelect`, `CodeEditor`) ship under their own
// subpath (`@json-edit-react/components/widgets`), so they need their own
// resolution target — the bare `components` alias is anchored and won't match
// the subpath.
const componentsWidgetsSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/components/widgets',
  local: path.resolve(__dirname, '../packages/components/src/widgets'),
  build: path.resolve(__dirname, '../packages/components/build/widgets.esm.js'),
  pack: path.resolve(__dirname, '../pack-output/components/package/build/widgets.esm.js'),
}

const utilsSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/utils',
  local: path.resolve(__dirname, '../packages/utils/src'),
  build: path.resolve(__dirname, '../packages/utils/build/index.esm.js'),
  pack: path.resolve(__dirname, '../pack-output/utils/package'),
}

// The filter toolkit ships under its own subpath (`@json-edit-react/utils/filters`),
// so it needs its own resolution target — the bare `utils` alias is anchored and
// won't match the subpath.
const utilsFiltersSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/utils/filters',
  local: path.resolve(__dirname, '../packages/utils/src/filters'),
  build: path.resolve(__dirname, '../packages/utils/build/filters.esm.js'),
  pack: path.resolve(__dirname, '../pack-output/utils/package/build/filters.esm.js'),
}

const packageFile = coreSrcMap[provider].pkgJson
const jsonEditReactPath = coreSrcMap[provider].src
const pkg = fs.readJsonSync(packageFile)

// The deploy subpath. Defaults to the primary site; override with
// `VITE_BASE_PATH` to build for a different GitHub Pages location (e.g.
// `/json-edit-react-v2/` for a side-by-side preview repo). The router base in
// `main.tsx` derives from this via `import.meta.env.BASE_URL`.
const PRIMARY_BASE = '/json-edit-react/'
const base = process.env.VITE_BASE_PATH ?? PRIMARY_BASE

// Any base other than the primary site is a throwaway preview deploy — mark it
// `noindex` so the temporary URL never competes with the real site in search.
const isPreviewDeploy = base !== PRIMARY_BASE

// On a preview deploy, inject `<meta name="robots" content="noindex">`. Runs
// before `spaFallbackPlugin`'s copy, so the generated `404.html` inherits it too.
const noindexPlugin: Plugin = {
  name: 'noindex-preview',
  transformIndexHtml() {
    if (!isPreviewDeploy) return
    return [
      { tag: 'meta', attrs: { name: 'robots', content: 'noindex' }, injectTo: 'head' },
    ]
  },
}

// Copy index.html → 404.html so GitHub Pages serves the SPA shell for any
// unmatched path (deep links, refreshes, shared URLs), letting wouter
// client-route instead of 404ing. Base-agnostic — it copies whatever base the
// build was made with. See dev-docs/GH-PAGES-SPA-FALLBACK.md.
const spaFallbackPlugin = {
  name: 'spa-404-fallback',
  closeBundle() {
    const out = path.resolve(__dirname, 'build')
    const index = path.join(out, 'index.html')
    if (fs.existsSync(index)) fs.copySync(index, path.join(out, '404.html'))
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), json5Plugin(), noindexPlugin, spaFallbackPlugin],
  base,
  resolve: {
    // Order matters: more specific scoped aliases must come before the bare
    // `@json-edit-react` alias so `@json-edit-react/themes` doesn't accidentally
    // resolve through the core alias's prefix match.
    //
    // The bare `json-edit-react` alias mirrors `@json-edit-react` for the real
    // npm name — sub-packages import from `'json-edit-react'`, and in `pack`
    // mode their files live outside the workspace so node_modules resolution
    // can't find core. In `npm` mode the replacement is just `'json-edit-react'`,
    // which makes the alias a no-op (vite re-resolves through node_modules).
    alias: [
      // The repo-root `data/` dir of generated test fixtures (outside the demo),
      // so examples can import a big data set by a clean name rather than a deep
      // `../../../../../data/...` relative path.
      { find: /^@test-data\//, replacement: path.resolve(__dirname, '../data') + '/' },
      { find: /^@json-edit-react\/themes$/, replacement: themesSrcMap[provider] },
      { find: /^@json-edit-react\/components\/widgets$/, replacement: componentsWidgetsSrcMap[provider] },
      { find: /^@json-edit-react\/components$/, replacement: componentsSrcMap[provider] },
      { find: /^@json-edit-react\/utils\/filters$/, replacement: utilsFiltersSrcMap[provider] },
      { find: /^@json-edit-react\/utils$/, replacement: utilsSrcMap[provider] },
      { find: /^@json-edit-react$/, replacement: jsonEditReactPath },
      // Capture an optional query (`?inline`, `?url`, …) and re-append it via
      // `$1` so callers can ask Vite for the stylesheet as a string rather than
      // having it auto-injected — the anchored find would otherwise reject the
      // query suffix.
      { find: /^json-edit-react\/style\.css(\?.*)?$/, replacement: coreStyleSrcMap[provider] + '$1' },
      { find: /^json-edit-react$/, replacement: jsonEditReactPath },
    ],
    // In `pack` and `build` modes the packed/built sub-packages live outside
    // demo/node_modules. Without dedupe, vite's walk-up resolution from those
    // files can pick up a second copy of a package (from the workspace root's
    // pnpm store, or wherever else it finds one first) — a different on-disk
    // path means a different module instance:
    //   - react / react-dom: a second React breaks hooks/context at runtime.
    //   - @codemirror/state, @codemirror/view: CodeMirror keys its extension
    //     system on `instanceof` against these singletons, so a second copy
    //     makes `@json-edit-react/components`' CodeEditor throw "Unrecognized
    //     extension value … multiple instances of @codemirror/state".
    // Forcing each to resolve from the demo's own deps guarantees one instance.
    dedupe: ['react', 'react-dom', '@codemirror/state', '@codemirror/view'],
  },
  server: {
    port: 5175,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // UI library chunks
          chakra: [
            '@chakra-ui/react',
            '@chakra-ui/icons',
            '@emotion/react',
            '@emotion/styled',
            'framer-motion',
          ],
          // Code editor and related packages
          codemirror: [
            '@uiw/react-codemirror',
            '@codemirror/lang-json',
            '@uiw/codemirror-theme-github',
            '@uiw/codemirror-theme-console',
            '@uiw/codemirror-theme-quietlight',
            '@uiw/codemirror-theme-monokai',
            '@uiw/codemirror-theme-dracula',
            '@uiw/codemirror-theme-solarized',
            '@uiw/codemirror-theme-tokyo-night',
          ],
          // Icons library
          icons: ['react-icons/fa', 'react-icons/bi', 'react-icons/ai'],
          // Core React packages
          vendor: ['react', 'react-dom', 'wouter', 'use-undo'],
          // JSON utilities
          json: ['json5', 'ajv'],
          jsonEditReact: ['json-edit-react'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })
    ),
    __VERSION__: JSON.stringify(pkg.version),
  },
})
