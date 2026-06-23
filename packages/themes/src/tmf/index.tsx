import { type Theme, type ThemeIcons } from 'json-edit-react'

// TMF (mSupply Foundation) theme — a medical-app brand theme, so it wears
// medically-themed glyphs at a larger-than-normal size.
//
// Action glyphs are Phosphor Fill (https://phosphoricons.com/, MIT) — a filled
// weight so the linear gradients actually show. Each action icon defines its
// own `<linearGradient>` and paints with `fill="url(#id)"`; the gradient
// overrides the theme's `icon*` colour, so those style entries no longer apply
// to the gradiented glyphs. Stops below are brand-flavoured placeholders — tweak
// freely. (The same gradient id repeats per rendered node; that's harmless since
// every instance is identical and resolves to the first match.)
//
// ok/cancel are NOT from the set — they're self-coloured "button" glyphs: a
// white tick on a blue disc, and its reverse (blue ✕ on a white disc with a blue
// ring so it reads on the light canvas). They paint with explicit colours, so
// the `iconOk`/`iconCancel` style colours don't apply to them.
const BRAND_BLUE = 'rgb(62, 123, 250)'

// Larger-than-normal action/button glyphs (the collapse caret stays smaller —
// enlarging it crowds the key, which core's `.jer-collapse-icon` offset is
// tuned around).
const actionScale = 1.2

const tmfIcons: ThemeIcons = {
  // ph:first-aid-fill — the medical cross doubles as a "first aid" logo
  add: {
    content: (
      <>
        <defs>
          <linearGradient id="tmfGradAdd" x1="0" y1="0" x2="1" y2="1">
            <stop offset="4%" stopColor="#f80" />
            <stop offset="96%" stopColor="#e63535" />
          </linearGradient>
        </defs>
        <path
          fill="url(#tmfGradAdd)"
          d="M232,108v40a16,16,0,0,1-16,16H164v52a16,16,0,0,1-16,16H108a16,16,0,0,1-16-16V164H40a16,16,0,0,1-16-16V108A16,16,0,0,1,40,92H92V40a16,16,0,0,1,16-16h40a16,16,0,0,1,16,16V92h52A16,16,0,0,1,232,108Z"
        />
      </>
    ),
    viewBox: '0 0 256 256',
    scale: actionScale,
  },
  // Feather edit-2 pencil (feathericons.com, MIT) — the conventional pencil the
  // mSupply app uses. Stroke-based, so the gradient paints the stroke (subtler
  // than on a fill); `userSpaceOnUse` keeps one ramp along the whole path.
  edit: {
    content: (
      <>
        <defs>
          <linearGradient
            id="tmfGradEdit"
            gradientUnits="userSpaceOnUse"
            x1="2"
            y1="2"
            x2="22"
            y2="22"
          >
            <stop offset="4%" stopColor="#f80" />
            <stop offset="96%" stopColor="#e63535" />
          </linearGradient>
        </defs>
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </>
    ),
    svgProps: {
      fill: 'none',
      stroke: 'url(#tmfGradEdit)',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    viewBox: '0 0 24 24',
    scale: actionScale * 0.9,
  },
  // --- Previous edit glyph (ph:syringe-fill, gradient-filled). Uncomment this
  //     and comment out the Feather block above to switch back: ---
  /* edit: {
    content: (
      <>
        <defs>
          <linearGradient id="tmfGradEdit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="4%" stopColor="#f80" />
            <stop offset="96%" stopColor="#e63535" />
          </linearGradient>
        </defs>
        <path
          fill="url(#tmfGradEdit)"
          d="M237.66,77.6a8,8,0,0,1-11.32,0L208,59.25,179.3,88l34.35,34.35a8,8,0,0,1-11.32,11.32L196,127.27l-84,84A16,16,0,0,1,100.65,216H51.26L29.6,237.66a8,8,0,0,1-11.72-.43,8.21,8.21,0,0,1,.61-11.1l21.45-21.46V155.28A16,16,0,0,1,44.63,144l15.18-15.18a4,4,0,0,1,5.66,0L94.3,157.63a8,8,0,1,0,11.32-11.32L76.78,117.47a4,4,0,0,1,0-5.66l11-11a4,4,0,0,1,5.66,0l28.84,28.84a8,8,0,1,0,11.32-11.32L104.79,89.46a4,4,0,0,1,0-5.66l23.87-23.86-6.35-6.35a8,8,0,0,1,.18-11.49,8.22,8.22,0,0,1,11.37.41L168,76.63l28.69-28.7L178.33,29.58a8,8,0,0,1,.17-11.49,8.23,8.23,0,0,1,11.38.41l47.78,47.78A8,8,0,0,1,237.66,77.6Z"
        />
      </>
    ),
    viewBox: '0 0 256 256',
    scale: actionScale,
  }, */
  // ph:trash-fill — clear "delete" affordance. Swap the d for ph:biohazard-fill
  // (commented below) if you want the explicit medical-waste read instead.
  delete: {
    content: (
      <>
        <defs>
          <linearGradient id="tmfGradDelete" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F26532" />
            <stop offset="100%" stopColor="#C60023" />
          </linearGradient>
        </defs>
        <path
          fill="url(#tmfGradDelete)"
          d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM112,168a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm0-120H96V40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8Z"
        />
        {/* ph:biohazard-fill alt:
          d="M239.83,159.58a60.09,60.09,0,0,0-54.17-55.31..." */}
      </>
    ),
    viewBox: '0 0 256 256',
    scale: actionScale,
  },
  // Feather copy (feathericons.com, MIT) — the conventional two-sheets copy the
  // mSupply app uses. Stroke-based; gradient paints the stroke. `userSpaceOnUse`
  // gives one continuous ramp across both sub-paths.
  copy: {
    content: (
      <>
        <defs>
          <linearGradient
            id="tmfGradCopy"
            gradientUnits="userSpaceOnUse"
            x1="2"
            y1="2"
            x2="22"
            y2="22"
          >
            <stop offset="4%" stopColor="#78a3fc" />
            <stop offset="96%" stopColor="#3e7bfa" />
          </linearGradient>
        </defs>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    svgProps: {
      fill: 'none',
      stroke: 'url(#tmfGradCopy)',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    viewBox: '0 0 24 24',
    scale: actionScale * 0.9,
  },
  // --- Previous copy glyph (ph:clipboard-text-fill, gradient-filled). Uncomment
  //     this and comment out the Feather block above to switch back: ---
  /* copy: {
    content: (
      <>
        <defs>
          <linearGradient id="tmfGradCopy" x1="0" y1="0" x2="1" y2="1">
            <stop offset="4%" stopColor="#78a3fc" />
            <stop offset="96%" stopColor="#3e7bfa" />
          </linearGradient>
        </defs>
        <path
          fill="url(#tmfGradCopy)"
          d="M200,32H163.74a47.92,47.92,0,0,0-71.48,0H56A16,16,0,0,0,40,48V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm-72,0a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm32,128H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z"
        />
      </>
    ),
    viewBox: '0 0 256 256',
    scale: actionScale,
  }, */
  // Custom "button": white tick on a brand-blue disc.
  ok: {
    content: (
      <>
        <circle cx="12" cy="12" r="11" fill={BRAND_BLUE} />
        <path
          d="M6.8 12.4l3.4 3.5L17.4 8"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    viewBox: '0 0 24 24',
    scale: actionScale,
  },
  // Custom "button": reversed — blue ✕ on a white disc with a blue ring.
  cancel: {
    content: (
      <>
        <circle cx="12" cy="12" r="10.5" fill="#fff" stroke={BRAND_BLUE} strokeWidth="1.5" />
        <path
          d="M8.5 8.5l7 7M15.5 8.5l-7 7"
          fill="none"
          stroke={BRAND_BLUE}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </>
    ),
    viewBox: '0 0 24 24',
    scale: actionScale,
  },
  // ph:caret-down-fill — rotated -90deg by core CSS when collapsed. Kept at the
  // smaller scale (see actionScale note) to avoid crowding the key.
  // collection: {
  //   content: (
  //     <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,48,88H208a8,8,0,0,1,5.66,13.66Z" />
  //   ),
  //   viewBox: '0 0 256 256',
  //   scale: 0.9,
  // },
}

// Open mSupply / mSupply Foundation house palette: a warm sand canvas,
// charcoal-slate ink and the signature coral-orange accent, with a muted
// teal secondary and a deep brand red. Palette sampled from
// msupply.foundation/open-msupply.
export const tmfTheme: Theme = {
  displayName: 'TMF',
  fragments: {
    coral: '#F26532', // primary brand accent
    charcoal: '#2F3D45', // ink / headings
    teal: '#3F7E83', // muted secondary
    gold: '#B07A00', // legible take on the brand gold (#FEC503)
    red: '#C60023', // deep brand red
    taupe: '#A8998A', // warm neutral
  },
  icons: tmfIcons,
  styles: {
    container: {
      // Warm-sand card with the brand's soft, professional feel.
      background: '#fafafc',
      color: '#2F3D45',
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      // borderRadius: '0.55em',
      // border: '1px solid #E7DDD2',
      // boxShadow: '0 2px 16px rgba(47, 61, 69, 0.1)',
    },
    collection: [
      // 'white',
      // { boxShadow: '0 4px 8px 0 rgba(96, 97, 112, 0.16), 0 0 2px 0 rgba(40, 41, 61, 0.04)' },
    ],
    // valueRow: ['white', { border: '1px solid black' }],
    dropZone: 'rgba(242, 101, 50, 0.14)',
    property: ['rgb(233, 92, 48)', { fontWeight: 600 }],
    bracket: ['rgb(62, 123, 250)', { fontWeight: 'bold' }],
    itemCount: { color: 'rgb(143, 144, 166)', fontStyle: 'italic', opacity: 0.85 },
    string: ['rgba(0, 0, 0, 0.87)', { letterSpacing: '-0.02em' }],
    number: [
      'rgb(62, 123, 250)',
      { fontSize: '105%', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    ],
    boolean: ['#c43c11', { fontWeight: 'bold', fontSize: '90%' }],
    null: {
      color: '#ed7d59',
      // fontVariant: 'small-caps',
      fontWeight: 'bold',
    },
    input: {
      color: '#2F3D45',
      backgroundColor: '#FFFFFF',
      border: '1px solid #DFD4C7',
      borderRadius: '0.3em',
    },
    inputHighlight: 'rgba(242, 101, 50, 0.22)',
    error: { fontSize: '0.8em', color: '#C60023', fontWeight: 'bold' },
    iconCollection: ['#8f90a6', { fontSize: '80%' }],
    iconEdit: 'teal',
    iconDelete: 'red',
    iconAdd: 'coral',
    iconCopy: {},
    // `drop-shadow` (not `box-shadow`) so the shadow follows the round glyph,
    // not the square svg box. Kept subtle for the small icon size.
    iconOk: { filter: 'drop-shadow(0 1px 1.5px rgba(40, 41, 61, 0.3))' },
    iconCancel: { filter: 'drop-shadow(0 1px 1.5px rgba(40, 41, 61, 0.3))' },
  },
}
