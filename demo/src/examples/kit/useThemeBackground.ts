import { useEffect, useState, type RefObject } from 'react'
import { type Theme } from '@json-edit-react'

interface Background {
  backgroundColor?: string
  backgroundImage?: string
}

// Lets the example page adopt the selected theme's look: reads the *computed*
// background off the rendered editor container and returns it for the page to
// apply. Reading the resolved style (rather than parsing the `Theme` object)
// handles fragment-string, array, and gradient themes for free — the browser has
// already resolved them. Re-runs when `theme` changes, retrying for a few frames
// so it also catches the first paint after the lazy editor resolves.
export const useThemeBackground = (
  containerRef: RefObject<HTMLElement | null>,
  theme: Theme
): Background => {
  const [background, setBackground] = useState<Background>({})

  useEffect(() => {
    let frame = 0
    let tries = 0
    const read = () => {
      const el = containerRef.current?.querySelector('.jer-editor-container')
      if (!el) {
        if (tries++ < 30) frame = requestAnimationFrame(read)
        return
      }
      const { backgroundColor, backgroundImage } = getComputedStyle(el)
      setBackground({
        backgroundColor,
        // `none` is the computed value when there's no gradient — drop it so the
        // page falls back to the (solid) backgroundColor.
        backgroundImage: backgroundImage === 'none' ? undefined : backgroundImage,
      })
    }
    frame = requestAnimationFrame(read)
    return () => cancelAnimationFrame(frame)
  }, [containerRef, theme])

  return background
}
