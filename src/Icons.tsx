import { type JSX, type SVGProps } from 'react'
import { useTheme } from './contexts'
import { type NodeData, type ThemeableElement, type ThemeIcons } from './types'

// The icon:text size ratio. Icons read a little larger than body text, so the
// standard icon renders at 1.4em (~22px against the editor's 16px base). This
// is the one global size policy; per-glyph art corrections ride on top of it
// via `IconDefinition.scale`.
const ICON_TEXT_SIZE_RATIO = 1.4

// The renderer for an `IconDefinition`: pass its parts — `scale`, `viewBox`,
// the inner markup as `children`, and any extra `<svg>` attributes (a stroke
// icon's `{ fill: 'none', stroke: 'currentColor' }`, a transform, …) by
// spreading its `svgProps`. `scale` is multiplied onto the icon:text size
// baseline (`ICON_TEXT_SIZE_RATIO`) to set the rendered em size; the common
// attributes (24×24 viewBox, fill="currentColor") are defaulted so a glyph only
// declares what differs. Colour flows in via `currentColor`.
export const IconSvg = ({
  scale = 1,
  viewBox = '0 0 24 24',
  fill = 'currentColor',
  children,
  ...props
  // `scale` is our size multiplier — omit SVG's own (rarely-used) `scale`
  // attribute so spreading a definition's `svgProps` can't shadow it.
}: { scale?: number } & Omit<SVGProps<SVGSVGElement>, 'scale'>): JSX.Element => {
  const size = `${ICON_TEXT_SIZE_RATIO * scale}em`
  return (
    <svg viewBox={viewBox} fill={fill} width={size} height={size} {...props}>
      {children}
    </svg>
  )
}

// Renders a themed icon by name. The glyph comes from the merged theme `icons`
// (always complete — `defaultTheme` is layer 0), and its paint key is derived
// by the naming invariant (`icon` + PascalCase), so the whole icon set renders
// through one path with no per-name switch and no fallback.
export const Icon = ({
  name,
  nodeData,
}: {
  name: keyof ThemeIcons
  nodeData: NodeData
}): JSX.Element => {
  const { getStyles, icons } = useTheme()
  const def = icons[name]
  const styleKey = `icon${name[0].toUpperCase()}${name.slice(1)}` as ThemeableElement
  return (
    <IconSvg
      viewBox={def.viewBox}
      {...def.svgProps}
      scale={def.scale}
      // The collapse chevron (`collection`) is positioned and animated by its
      // wrapper; it doesn't take the action icons' :hover affordance.
      className={name === 'collection' ? undefined : 'jer-icon'}
      style={getStyles(styleKey, nodeData)}
    >
      {def.content}
    </IconSvg>
  )
}
