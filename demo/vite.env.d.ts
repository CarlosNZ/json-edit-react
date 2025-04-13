/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_PROVIDER: string
  // add other VITE_ vars here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
