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
// The CSS checks are the inverse of the JS ones, and they exist because that
// failure is silent: `@rollup/plugin-node-resolve` honours our own
// `sideEffects: false` for our own source files, so a plain
// `import './style.css'` counts as droppable and gets shaken out, publishing
// the package with none of its CSS and only looking slightly off.
// `src/_common/useStyles.ts` explains the arrangement that avoids it. Nothing
// in the type system or the test suite notices if it breaks, so it's asserted
// here (issue #398).

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.join(here, '..')
// The two shipped entries. Both get shaken against below — the root for the
// definitions, `widgets` for the swappable widgets.
const esm = path.join(pkgRoot, 'build', 'index.esm.js')
const widgetsEsm = path.join(pkgRoot, 'build', 'widgets.esm.js')
// Every shipped bundle, for the stylesheet-presence check. Both formats of
// each entry: `exports.require` ships the CJS ones, and while a dropped
// stylesheet would be an input-stage failure that hits both, the check costs
// a `readFileSync` and this is the list of files that actually publish.
const BUNDLES = {
  'index.esm.js': ['loader', 'unix', 'errorIndicator'],
  'index.cjs.js': ['loader', 'unix', 'errorIndicator'],
  'widgets.esm.js': ['loader', 'datePicker', 'datePickerLib'],
  'widgets.cjs.js': ['loader', 'datePicker', 'datePickerLib'],
}

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
//
// `datePickerLib` is the odd one out — react-datepicker's own sheet is the one
// stylesheet we don't inline, so what reaches the bundle is the import
// specifier rather than any rule text. Asserted here for the same reason as
// the rest: `sideEffects: false` entitles a bundler to drop it, and the
// DatePicker would render unstyled with nothing else complaining.
const STYLES = {
  loader: '.jer-simple-loader{',
  unix: '.jer-unix-badge{',
  errorIndicator: '.jer-error-indicator-wrapper{',
  datePicker: '.react-datepicker-popper{',
  datePickerLib: 'react-datepicker/dist/react-datepicker.css',
}
// Each of our own stylesheets, keyed to the marker that stands for it. Only
// `datePickerLib` has no file of ours behind it.
const STYLE_SOURCES = {
  loader: 'src/_common/style.css',
  unix: 'src/UnixTimestamp/style.css',
  errorIndicator: 'src/ErrorIndicator/style.css',
  datePicker: 'src/widgets/ReactDatePicker/style.css',
}

const failures = []

// 0. The marker table covers every stylesheet in `src`, and every marker still
//    has a file behind it. `STYLES` and `BUNDLES` are hand-maintained, so
//    without this a new component's stylesheet is simply never checked — the
//    guard stays green while the CSS it was built to protect goes unwatched.
const onDisk = readdirSync(path.join(pkgRoot, 'src'), { recursive: true })
  .map((p) => `src/${p.split(path.sep).join('/')}`)
  .filter((p) => p.endsWith('/style.css'))
const tracked = Object.values(STYLE_SOURCES)
const untracked = onDisk.filter((p) => !tracked.includes(p))
const vanished = tracked.filter((p) => !onDisk.includes(p))
if (untracked.length || vanished.length) {
  failures.push(
    `the stylesheet marker table is out of date:` +
      (untracked.length ? ` not checked by this script [${untracked.join(', ')}]` : '') +
      (vanished.length ? ` listed but absent from src [${vanished.join(', ')}]` : '') +
      `. Add a marker to \`STYLES\` + \`STYLE_SOURCES\` and list it against the ` +
      `bundles that should carry it in \`BUNDLES\`.`
  )
}

const bundleExport = async (name, entry = esm) => {
  const result = await build({
    stdin: {
      contents: `export { ${name} } from ${JSON.stringify(entry)}`,
      resolveDir: pkgRoot,
      loader: 'js',
    },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    // Peer deps a consumer supplies; everything else (the heavy libs) is
    // bundled. `*.css` is external so react-datepicker's bare import stays an
    // import, which is both what a consumer's bundler does with it and what
    // makes it visible to the checks below — bundling it would need an output
    // path on disk, and we only want the text.
    external: ['react', 'react-dom', 'react/jsx-runtime', 'json-edit-react', '*.css'],
    logLevel: 'silent',
  })
  return result.outputFiles[0].text
}

const stylesIn = (code) =>
  Object.entries(STYLES)
    .filter(([, marker]) => code.includes(marker))
    .map(([name]) => name)

// 1. Every stylesheet reaches every shipped bundle. Without this the package
//    publishes unstyled and nothing else complains. A bundle that isn't on
//    disk is reported as such rather than thrown as an ENOENT, since an entry
//    point disappearing from the rollup config is its own kind of regression
//    and the stack trace says nothing useful about it.
const absentBundles = Object.keys(BUNDLES).filter(
  (file) => !existsSync(path.join(pkgRoot, 'build', file))
)
const missing = Object.entries(BUNDLES)
  .filter(([file]) => !absentBundles.includes(file))
  .map(([file, expected]) => {
    const code = readFileSync(path.join(pkgRoot, 'build', file), 'utf8')
    const absent = expected.filter((name) => !code.includes(STYLES[name]))
    return absent.length ? `${file} [${absent.join(', ')}]` : null
  })
  .filter(Boolean)
if (absentBundles.length) {
  failures.push(
    `shipped bundles missing from build/: [${absentBundles.join(', ')}]. Either the ` +
      `build didn't run, or an entry point or output format was dropped from ` +
      `rollup.config.mjs while \`package.json\`'s \`exports\` still points at it.`
  )
}
if (missing.length) {
  failures.push(
    `stylesheets missing from the build: ${missing.join(' ')}` +
      `. The CSS is being dropped before it reaches the bundle — check ` +
      `the \`inlineCss\` plugin (scripts/rollup-inline-css.mjs at the repo root), ` +
      `and that the components still import their \`./style.css?inline\`.`
  )
}

// 2. A definition with no stylesheet of its own carries no CSS, and no heavy
//    deps. This is what makes injecting per component worth the indirection:
//    with an import-time side effect instead, every consumer pays for every
//    stylesheet in the entry point.
const LEAN = 'hyperlinkDefinition'
const leanCode = await bundleExport(LEAN)
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
const styledCode = await bundleExport(STYLED)
if (!styledCode.includes(STYLES.unix)) {
  failures.push(
    `importing { ${STYLED} } doesn't carry its own stylesheet. The component ` +
      `renders markup it has no rules for — check its \`useStyles\` call in ` +
      `src/UnixTimestamp/component.tsx.`
  )
}

// 4. The same isolation inside the `widgets` entry, which checks 2 and 3 never
//    reach — they shake against the root entry only. `ReactSelect`,
//    `CodeEditor` and `ReactDatePicker` share one bundle, so a DatePicker
//    stylesheet that regained an import-time injection would ride along with
//    the other two: the #398 failure, one entry over.
//
//    Two sheets legitimately come along and are allowed for. `_common`'s
//    loader, because every widget renders it as its Suspense fallback. And
//    react-datepicker's own sheet, the single bare import in the package: it's
//    the library's file, so there's no text to inline and no component of ours
//    to inject it from. That one IS an entry-wide cost, knowingly accepted —
//    src/widgets/ReactDatePicker/component.tsx has the reasoning.
const WIDGET = 'ReactSelect'
const ALLOWED_IN_WIDGET = ['loader', 'datePickerLib']
const widgetCode = await bundleExport(WIDGET, widgetsEsm)
const leakedIntoWidget = stylesIn(widgetCode).filter((name) => !ALLOWED_IN_WIDGET.includes(name))
if (leakedIntoWidget.length) {
  failures.push(
    `importing { ${WIDGET} } from the widgets entry drags in unrelated ` +
      `stylesheets [${leakedIntoWidget.join(', ')}]. A widget's stylesheet is ` +
      `being injected at import time rather than from its \`useStyles\` call — ` +
      `see issue #398 and src/_common/useStyles.ts.`
  )
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`)
  process.exit(1)
}

console.log(
  `✓ tree-shake OK: { ${LEAN} } → ${(leanSize / 1000).toFixed(1)} kB, no heavy deps, no CSS\n` +
    `✓ stylesheets OK: all present in both formats of both entries, each carried\n` +
    `  only by its own component — in the widgets entry too`
)
