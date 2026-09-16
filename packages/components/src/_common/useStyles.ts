import { useInsertionEffect } from 'react'

// Per-component stylesheet injection.
//
// The package ships as one bundled file per entry point, so a top-level
// `import './style.css'` would be a bare side-effecting statement that nothing
// can drop: `sideEffects: false` is module-granular, and there's only one
// module, while no `/*#__PURE__*/` annotation applies to a bare statement.
// That same flag also tells `@rollup/plugin-node-resolve` the import is
// droppable while the build runs, which shakes the CSS out of the published
// bundles altogether (issue #398).
//
// Importing each stylesheet as a string and injecting it from here avoids both
// halves of that. The CSS becomes an ordinary constant reachable only from the
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
// One consequence to design around: React runs insertion effects bottom-up, so
// a child's sheet lands in `<head>` before its parent's, and a component's
// before core's (every component is a descendant of `JsonEditor`). Cascade
// order therefore favours core, and a rule here cannot outrank a core rule of
// equal specificity. Keep these stylesheets to selectors core doesn't define —
// they all use component-specific class names — rather than relying on order.
//
// Dedupe is keyed on the `<style>` element rather than on module state, so it
// survives module re-evaluation: when Vite's HMR reloads a component after a
// stylesheet edit, the text is swapped in place instead of the edit being
// swallowed by a module-level flag this module never gets to clear. It also
// means the sheet is restored if something tears `<head>` down.
//
// `?inline` is Vite's convention for "give me the text, don't inject it". A
// plain `.css` specifier is injected by Vite and exports nothing, which breaks
// direct consumers of `src/`, such as the demo's `local` mode. Rollup has no
// such convention, so the build resolves the query itself — see the
// `inlineCss` plugin used in rollup.config.mjs.

const MARKER = 'data-jer-component-styles'

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
    if (typeof document === 'undefined') return
    const existing = document.head.querySelector(`style[${MARKER}="${id}"]`)
    if (existing) {
      if (existing.textContent !== css) existing.textContent = css
      return
    }
    const style = document.createElement('style')
    style.setAttribute(MARKER, id)
    style.textContent = css
    document.head.appendChild(style)
  }, [id, css])
}
