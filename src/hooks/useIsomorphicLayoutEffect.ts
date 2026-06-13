import { useEffect, useLayoutEffect } from 'react'

// `useLayoutEffect` warns during server rendering ("does nothing on the
// server"). Falling back to `useEffect` server-side silences that while
// keeping the pre-paint timing in the browser. Standard SSR-safe pattern.
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
