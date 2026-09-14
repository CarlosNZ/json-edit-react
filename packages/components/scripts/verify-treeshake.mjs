// End-to-end guard for per-component tree-shaking (issue #388) and for the
// stylesheets surviving the build (issue #398).
//
// Bundles a single definition against the *shipped* `build/index.esm.js` with
// its third-party deps bundled in — the same thing a consumer's bundler does —
// and checks what rides along. The whole package is bundled into one ESM file,
// so `sideEffects: false` (which is module-granular) can't drop unused
// components; only the `/*#__PURE__*/` annotations enable the within-module DCE
// that strips them. If that pipeline regresses (injection breaks, terser stops
// preserving the annotations, or a component regains a top-level side effect),
// the heavy components ride along and their deps balloon the bundle
// (~1 kB → ~160 kB).
//
// Uses esbuild, NOT rollup: rollup analyses our local `createDefinitionFactory`
// for purity on its own and shakes the definitions with or without the
// annotations, so a rollup-based guard can't see the regression. esbuild (like
// webpack and other consumer bundlers) relies on the annotations, so it does —
// and `/*#__PURE__*/` is honoured identically across them. The heavy libs are
// regular deps, so they're installed and resolvable when this runs.
//
// The CSS checks are the inverse of the JS ones, and the reason they exist is
// that the failure is silent: `@rollup/plugin-node-resolve` honours our own
// `sideEffects: false` for our own source files, so every `import './style.css'`
// was treated as droppable and shaken out — the package published with none of
// its CSS and only looked slightly off. `src/_common/useStyles.ts` explains the
// fix. Nothing in the type system or the test suite notices if it breaks again,
// so it's asserted here.

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.join(here, '..')
const esm = path.join(pkgRoot, 'build', 'index.esm.js')
const widgetsEsm = path.join(pkgRoot, 'build', 'widgets.esm.js')

// A correct shake is ~1 kB of glue; a broken one inlines react-markdown &
// friends (~160 kB). The gap is enormous, so this only trips on a real
// regression — generous enough to absorb the small exotic-type definitions that
// still ride along until their eager `defaultValue` calls are de-eagered (#388).
const THRESHOLD = 20_000
// Distinctive in-code markers, for a clearer message when something leaks.
const HEAVY_DEPS = {
  'react-markdown': 'remarkjs/react-markdown',
  'react-colorful': 'react-colorful__',
  colord: 'colord',
}
// Minified-CSS markers: a selector plus its opening brace, which survives
// minification unchanged (property order does not, so don't match on that) and
// can't collide with the bare `className` strings in the compiled JSX.
const STYLES = {
  loader: '.jer-simple-loader{',
  unix: '.jer-unix-badge{',
  errorIndicator: '.jer-error-indicator-wrapper{',
  datePicker: '.react-datepicker-popper',
}

const failures = []

const bundleDefinition = async (name) => {
  const result = await build({
    stdin: {
      contents: `export { ${name} } from ${JSON.stringify(esm)}`,
      resolveDir: pkgRoot,
      loader: 'js',
    },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    // Peer deps a consumer supplies; everything else (the heavy libs) is bundled.
    external: ['react', 'react-dom', 'react/jsx-runtime', 'json-edit-react'],
    logLevel: 'silent',
  })
  return result.outputFiles[0].text
}

const stylesIn = (code) =>
  Object.entries(STYLES)
    .filter(([, marker]) => code.includes(marker))
    .map(([name]) => name)

// 1. Every stylesheet reaches the shipped bundles. Without this the package
//    publishes unstyled and nothing else complains.
const indexCode = readFileSync(esm, 'utf8')
const widgetsCode = readFileSync(widgetsEsm, 'utf8')
const missingFromIndex = ['loader', 'unix', 'errorIndicator'].filter(
  (name) => !indexCode.includes(STYLES[name])
)
const missingFromWidgets = ['loader', 'datePicker'].filter(
  (name) => !widgetsCode.includes(STYLES[name])
)
if (missingFromIndex.length || missingFromWidgets.length) {
  failures.push(
    `stylesheets missing from the build:` +
      (missingFromIndex.length ? ` index.esm.js [${missingFromIndex.join(', ')}]` : '') +
      (missingFromWidgets.length ? ` widgets.esm.js [${missingFromWidgets.join(', ')}]` : '') +
      `. The CSS is being dropped before it reaches the bundle — check ` +
      `\`stripCssQuery\` and the \`styles\` plugin's \`mode\` in rollup.config.mjs, ` +
      `and that the components still import their \`./style.css?inline\`.`
  )
}

// 2. A definition with no stylesheet of its own carries no CSS, and no heavy
//    deps. This is what makes injecting per component worth the indirection:
//    with an import-time side effect instead, every consumer pays for every
//    stylesheet in the entry point.
const LEAN = 'hyperlinkDefinition'
const leanCode = await bundleDefinition(LEAN)
const leanSize = Buffer.byteLength(leanCode, 'utf8')
const leakedDeps = Object.entries(HEAVY_DEPS)
  .filter(([, marker]) => leanCode.includes(marker))
  .map(([dep]) => dep)
const leakedStyles = stylesIn(leanCode)

if (leanSize > THRESHOLD || leakedDeps.length) {
  failures.push(
    `importing { ${LEAN} } bundles to ${(leanSize / 1000).toFixed(1)} kB` +
      (leakedDeps.length ? ` and reaches heavy deps [${leakedDeps.join(', ')}]` : '') +
      ` (threshold ${THRESHOLD / 1000} kB). The pure-annotation pipeline is broken — ` +
      `see issue #388 and rollup.config.mjs.`
  )
}
if (leakedStyles.length) {
  failures.push(
    `importing { ${LEAN} } drags in unrelated stylesheets [${leakedStyles.join(', ')}]. ` +
      `A stylesheet is being injected at import time rather than from its ` +
      `component's \`useStyles\` call — see issue #398 and src/_common/useStyles.ts.`
  )
}

// 3. A definition that *does* have a stylesheet still carries it. Guards the
//    opposite failure: CSS that shakes out along with the component's own code
//    because nothing in the retained graph references it.
const STYLED = 'unixTimestampDefinition'
const styledCode = await bundleDefinition(STYLED)
if (!styledCode.includes(STYLES.unix)) {
  failures.push(
    `importing { ${STYLED} } doesn't carry its own stylesheet. The component ` +
      `renders markup it has no rules for — check its \`useStyles\` call in ` +
      `src/UnixTimestamp/component.tsx.`
  )
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`)
  process.exit(1)
}

console.log(
  `✓ tree-shake OK: { ${LEAN} } → ${(leanSize / 1000).toFixed(1)} kB, no heavy deps, no CSS\n` +
    `✓ stylesheets OK: all present in the build, each carried only by its own component`
)
