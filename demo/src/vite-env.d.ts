/// <reference types="vite/client" />

declare const __BUILD_TIME__: string
declare const __VERSION__: string

// `.json5` imports are parsed to a plain object at build time by the json5
// plugin in vite.config.ts (see there). Typed `unknown` — narrow at the use
// site, as you would any external data.
declare module '*.json5' {
  const value: unknown
  export default value
}
