// `?inline` asks a bundler for a stylesheet's text rather than an injected
// side effect (Vite's convention; core's rollup build strips the query and
// inlines the CSS as a string). Ambient declarations have to be program root
// files, and the root tsconfig uses `files` rather than an `include` glob, so
// this is listed there explicitly.
declare module '*.css?inline' {
  const css: string
  export default css
}
