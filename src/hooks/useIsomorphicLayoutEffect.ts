import { useEffect, useLayoutEffect } from 'react'

// `useLayoutEffect` warns during server rendering, so falling back to
// `useEffect` on the server silences that while keeping the pre-paint timing in
// the browser. The standard SSR-safe pattern.
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
