import { type SVGProps } from 'react'
import { type Theme } from '../../types'

// Shared presentation attributes for stroke-based glyphs (Lucide/Feather): the
// art is drawn as outlines, so colour comes from `stroke` (via currentColor),
// not `fill`.
const strokeIconProps: SVGProps<SVGSVGElement> = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 2,
}

export const defaultTheme: Theme = {
  displayName: 'Default',
  // The seven built-in glyphs. Core renders the wrapping <svg>; each definition
  // supplies only the inner markup plus the attributes core can't infer.
  // `scale` is a per-glyph size correction (multiplied onto core's
  // ICON_TEXT_SIZE_RATIO) that compensates for source art under/over-filling
  // its viewBox — the set is drawn by different icon families (Boxicons,
  // Lucide, Feather, Typicons, FontAwesome), so at an identical em box they'd
  // otherwise look uneven.
  icons: {
    // icon:bx-plus-circle | Boxicons https://boxicons.com/ | Atisa
    add: {
      content: (
        <>
          <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4z" />
          <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
        </>
      ),
    },
    // icon:bx-edit | Boxicons https://boxicons.com/ | Atisa
    edit: {
      content: (
        <>
          <path d="M7 17.013l4.413-.015 9.632-9.54c.378-.378.586-.88.586-1.414s-.208-1.036-.586-1.414l-1.586-1.586c-.756-.756-2.075-.752-2.825-.003L7 12.583v4.43zM18.045 4.458l1.589 1.583-1.597 1.582-1.586-1.585 1.594-1.58zM9 13.417l6.03-5.973 1.586 1.586-6.029 5.971L9 15.006v-1.589z" />
          <path d="M5 21h14c1.103 0 2-.897 2-2v-8.668l-2 2V19H8.158c-.026 0-.053.01-.079.01-.033 0-.066-.009-.1-.01H5V5h6.847l2-2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2z" />
        </>
      ),
      svgProps: { transform: 'translate(0, 0.5)' },
    },
    // icon:delete-forever | Material Design Icons | Austin Andrews
    delete: {
      content: (
        <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12m2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12M15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z" />
      ),
      scale: 1.04,
    },
    // icon:clipboard-copy | Lucide https://lucide.dev/
    copy: {
      content: (
        <>
          <path d="M9 2 H15 A1 1 0 0 1 16 3 V5 A1 1 0 0 1 15 6 H9 A1 1 0 0 1 8 5 V3 A1 1 0 0 1 9 2 z" />
          <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2v-2M16 4h2a2 2 0 012 2v4M21 14H11" />
          <path d="M15 10l-4 4 4 4" />
        </>
      ),
      svgProps: strokeIconProps,
      scale: 0.86,
    },
    // icon:check-circle | FeatherIcons https://feathericons.com/ | Cole Bemis
    ok: {
      content: (
        <>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <path d="M22 4L12 14.01l-3-3" />
        </>
      ),
      svgProps: strokeIconProps,
      scale: 0.9,
    },
    // icon:cancel | Typicons https://www.s-ings.com/typicons/ | Stephen Hutchings
    cancel: {
      content: (
        <path d="M12 4c-4.411 0-8 3.589-8 8s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8zm-5 8c0-.832.224-1.604.584-2.295l6.711 6.711A4.943 4.943 0 0112 17c-2.757 0-5-2.243-5-5zm9.416 2.295L9.705 7.584A4.943 4.943 0 0112 7c2.757 0 5 2.243 5 5 0 .832-.224 1.604-.584 2.295z" />
      ),
      svgProps: { baseProfile: 'tiny' },
      scale: 1.3,
    },
    // icon:chevron-down | FontAwesome https://fontawesome.com/
    collection: {
      content: (
        <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
      ),
      viewBox: '0 0 512 512',
      scale: 0.7,
    },
  },
  styles: {
    container: {
      backgroundColor: '#f6f6f6',
      fontFamily: 'monospace',
    },
    // collection: {},
    // collectionElement: {},
    // headerRow: {},
    // valueRow: {},
    // dropZone: {},
    property: '#292929',
    bracket: { color: '#002b36', fontWeight: 'bold' },
    itemCount: { color: '#0000004d', fontStyle: 'italic' },
    string: '#cb4b16',
    number: '#268bd2',
    boolean: 'green',
    null: { color: '#dc322f', fontVariant: 'small-caps', fontWeight: 'bold' },
    input: ['#292929'],
    inputHighlight: '#b3d8ff',
    error: { fontSize: '0.8em', color: 'red', fontWeight: 'bold' },
    iconCollection: '#002b36',
    iconEdit: '#2aa198',
    iconDelete: '#cb4b16',
    iconAdd: '#2aa198',
    iconCopy: '#268bd2',
    iconOk: 'green',
    iconCancel: '#cb4b16',
  },
}
