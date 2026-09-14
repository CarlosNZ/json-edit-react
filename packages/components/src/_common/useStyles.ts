import { useInsertionEffect } from 'react'

// Per-component stylesheet injection.
//
// The package ships as one bundled file per entry point, so a top-level
// `import './style.css'` becomes a bare side-effecting statement that nothing
// can drop: `sideEffects: false` is module-granular (there is only one module)
// and no `/*#__PURE__*/` annotation applies to a bare statement. Worse, that
// same flag tells `@rollup/plugin-node-resolve` the import is droppable while
// the build runs, so the CSS was shaken out of the published bundles entirely
// (issue #398).
//
// Importing each stylesheet as a string and injecting it from here fixes both
// halves. The CSS becomes an ordinary constant reachable only from the
// component that renders it, so a consumer importing one definition carries
// that component's CSS and no other's — which is what keeps the per-component
// tree-shaking of #388 meaningful. `scripts/verify-treeshake.mjs` guards both
// directions: the CSS is present in the bundle, and an unrelated definition
// doesn't drag it along.
//
// `useInsertionEffect` is the right phase: React runs these in the commit's
// mutation phase, ahead of every layout effect and before the browser can
// paint, so the rules are in place the first time the markup is on screen.
// Core injects its stylesheet the same way — see src/injectStyles.ts there.
//
// `?inline` is Vite's convention for "give me the text, don't inject it"; a
// plain `.css` specifier gets injected by Vite and exports nothing, which
// breaks direct consumers of `src/` (the demo's `local` mode). Rollup has no
// such convention, so the build strips the query — see `stripCssQuery` in
// rollup.config.mjs.

const injected = new Set<string>()

/**
 * Inject a component's stylesheet into `<head>` on first render.
 *
 * Call it at the top of any component whose folder has a `style.css`:
 *
 * ```tsx
 * import css from './style.css?inline'
 * import { useStyles } from '../_common/useStyles'
 *
 * export const MyComponent = (props: CustomComponentProps) => {
 *   useStyles('jer-my-component', css)
 *   ...
 * }
 * ```
 *
 * `id` de-duplicates across every instance and every render, so the rules land
 * in `<head>` exactly once however many nodes the editor renders. Give each
 * stylesheet its own stable id.
 */
export const useStyles = (id: string, css: string) => {
  useInsertionEffect(() => {
    if (injected.has(id) || typeof document === 'undefined') return
    injected.add(id)
    const style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    style.appendChild(document.createTextNode(css))
    document.head.appendChild(style)
  }, [id, css])
}
