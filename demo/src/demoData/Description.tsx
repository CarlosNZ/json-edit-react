import { lazy, Suspense } from 'react'

// Renders a demo data-set description from a shared Markdown blurb (see
// ./blurbs). `MarkdownText` pulls in `react-markdown`, so it's lazy-loaded to
// keep that dependency out of the main bundle — it shares the chunk with the
// example pages, which use the same component. Descriptions tolerate the brief
// async load (the fallback is empty).
const LazyMarkdownText = lazy(() =>
  import('../examples/kit/MarkdownText').then((m) => ({ default: m.MarkdownText }))
)

// `color` / `fontSize` mirror the Chakra `Text` baseStyle (`secondary`, 16) the
// demo descriptions used before they were Markdown — `MarkdownText` is now a
// transparent renderer (its prose inherits the wrapper), so the theme colour
// has to be supplied here rather than picked up from the baseStyle.
export const Description = ({ children }: { children: string }) => (
  <Suspense fallback={null}>
    <LazyMarkdownText color="secondary" fontSize={16}>
      {children}
    </LazyMarkdownText>
  </Suspense>
)
