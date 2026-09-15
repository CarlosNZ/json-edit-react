import { type SVGProps } from 'react'
import { useTheme } from './contexts'
import { type NodeData, type ThemeableElement, type ThemeIcons } from './types'

// The icon:text size ratio. Icons read a little larger than body text, so the
// standard icon renders at 1.4em (~22px against the editor's 16px base). The
// one global size policy; per-glyph art corrections ride on top via
// `IconDefinition.scale`.
const ICON_TEXT_SIZE_RATIO = 1.4

// The renderer for an `IconDefinition`: pass its `scale`, `viewBox`, inner
// markup as `children`, and any extra `<svg>` attributes by spreading its
// `svgProps`. `scale` multiplies `ICON_TEXT_SIZE_RATIO` to set the rendered em
// size, and the common attributes (24×24 viewBox, fill="currentColor") are
// defaulted, so a glyph declares only what differs. Colour flows in via
// `currentColor`.
export const IconSvg = ({
  scale = 1,
  viewBox = '0 0 24 24',
  fill = 'currentColor',
  children,
  ...props
  // `scale` is the size multiplier here, so SVG's own (rarely-used) `scale`
  // attribute is omitted and a spread `svgProps` can't shadow it.
}: { scale?: number } & Omit<SVGProps<SVGSVGElement>, 'scale'>): React.JSX.Element => {
  const size = `${ICON_TEXT_SIZE_RATIO * scale}em`
  return (
    <svg viewBox={viewBox} fill={fill} width={size} height={size} {...props}>
      {children}
    </svg>
  )
}

// Renders a themed icon by name. The glyph comes from the merged theme `icons`
// (always complete, `defaultTheme` being layer 0) and its paint key from the
// naming invariant (`icon` + PascalCase), so the whole set renders through one
// path with no per-name switch and no fallback.
export const Icon = ({
  name,
  nodeData,
}: {
  name: keyof ThemeIcons
  nodeData: NodeData
}): React.JSX.Element => {
  const { getStyles, icons } = useTheme()
  const def = icons[name]
  const styleKey = `icon${name[0].toUpperCase()}${name.slice(1)}` as ThemeableElement
  return (
    <IconSvg
      viewBox={def.viewBox}
      {...def.svgProps}
      scale={def.scale}
      // The collapse chevron (`collection`) is positioned and animated by its
      // wrapper, and doesn't take the action icons' :hover affordance.
      className={name === 'collection' ? undefined : 'jer-icon'}
      style={getStyles(styleKey, nodeData)}
    >
      {def.content}
    </IconSvg>
  )
}
