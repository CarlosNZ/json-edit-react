import css from './style.css?inline'

// The stylesheet is inlined into the bundle as a plain string (see the
// `styles` plugin config in rollup.config.mjs) and injected from here, rather
// than by a top-level side effect. A consumer's bundler can't drop a
// side-effecting statement at module scope: the package ships as one bundled
// file, so `sideEffects: false` is no help and no purity annotation applies to
// a bare statement. Referencing the CSS from a function makes it an ordinary
// constant that only the editor path reaches, so importing a helper on its own
// leaves the ~2 kB of CSS behind (issue #396).
//
// The call site is a `useInsertionEffect` in JsonEditor, which React runs in
// the commit's mutation phase — ahead of every layout effect and before the
// browser can paint — so the rules are in place the first time the editor's
// markup is on screen.
//
// `?inline` is Vite's convention for "give me the text, don't inject it". A
// plain `.css` specifier is injected by Vite and exports nothing, which breaks
// this module when `src/` is consumed directly, as in the demo's `local` mode.
// Rollup has no such convention, so the build strips the query — see
// `stripCssQuery` in rollup.config.mjs. The upshot is that the dev harness runs
// the same injection path as the published bundle.

let injected = false

export const injectStyles = () => {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('type', 'text/css')
  style.appendChild(document.createTextNode(css))
  document.head.appendChild(style)
}
