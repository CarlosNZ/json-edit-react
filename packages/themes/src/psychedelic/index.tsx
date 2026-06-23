import { type Theme, type ThemeIcons } from 'json-edit-react'

// Solar Bold icon set by 480 Design (https://icon-sets.iconify.design/solar/,
// CC BY 4.0) for the Psychedelic theme — bold, bubbly, solid glyphs that pop as
// vivid colour-blocks against the gradient. Each is a `fill="currentColor"`
// path on the standard 24×24 grid (no svgProps, no viewBox needed) that adopts
// each `icon*` colour; `fillRule: 'evenodd'` is preserved where the source uses
// it (the circle/square counters). Solar is CC BY 4.0, so its attribution is
// carried in the published README (build strips these comments) — see the
// "Icon set credits" section there.
const solarBoldIcons: ThemeIcons = {
  // solar:add-square-bold
  add: {
    content: (
      <path
        fillRule="evenodd"
        d="M12 22c-4.714 0-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12s0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22m0-13.75a.75.75 0 0 1 .75.75v2.25H15a.75.75 0 0 1 0 1.5h-2.25V15a.75.75 0 0 1-1.5 0v-2.25H9a.75.75 0 0 1 0-1.5h2.25V9a.75.75 0 0 1 .75-.75"
        clipRule="evenodd"
      />
    ),
  },
  // solar:pen-bold
  edit: {
    content: (
      <path d="m11.4 18.161l7.396-7.396a10.3 10.3 0 0 1-3.326-2.234a10.3 10.3 0 0 1-2.235-3.327L5.839 12.6c-.577.577-.866.866-1.114 1.184a6.6 6.6 0 0 0-.749 1.211c-.173.364-.302.752-.56 1.526l-1.362 4.083a1.06 1.06 0 0 0 1.342 1.342l4.083-1.362c.775-.258 1.162-.387 1.526-.56q.647-.308 1.211-.749c.318-.248.607-.537 1.184-1.114m9.448-9.448a3.932 3.932 0 0 0-5.561-5.561l-.887.887l.038.111a8.75 8.75 0 0 0 2.092 3.32a8.75 8.75 0 0 0 3.431 2.13z" />
    ),
  },
  // solar:trash-bin-trash-bold
  delete: {
    content: (
      <>
        <path d="M3 6.386c0-.484.345-.877.771-.877h2.665c.529-.016.996-.399 1.176-.965l.03-.1l.115-.391c.07-.24.131-.45.217-.637c.338-.739.964-1.252 1.687-1.383c.184-.033.378-.033.6-.033h3.478c.223 0 .417 0 .6.033c.723.131 1.35.644 1.687 1.383c.086.187.147.396.218.637l.114.391l.03.1c.18.566.74.95 1.27.965h2.57c.427 0 .772.393.772.877s-.345.877-.771.877H3.77c-.425 0-.77-.393-.77-.877" />
        <path
          fillRule="evenodd"
          d="M11.596 22h.808c2.783 0 4.174 0 5.08-.886c.904-.886.996-2.339 1.181-5.245l.267-4.188c.1-1.577.15-2.366-.303-2.865c-.454-.5-1.22-.5-2.753-.5H8.124c-1.533 0-2.3 0-2.753.5s-.404 1.288-.303 2.865l.267 4.188c.185 2.906.277 4.36 1.182 5.245c.905.886 2.296.886 5.079.886m-1.35-9.811c-.04-.434-.408-.75-.82-.707c-.413.043-.713.43-.672.864l.5 5.263c.04.434.408.75.82.707c.413-.043.713-.43.672-.864zm4.329-.707c.412.043.713.43.671.864l-.5 5.263c-.04.434-.409.75-.82.707c-.413-.043-.713-.43-.672-.864l.5-5.263c.04-.434.409-.75.82-.707"
          clipRule="evenodd"
        />
      </>
    ),
  },
  // solar:copy-bold
  copy: {
    content: (
      <>
        <path d="M15.24 2h-3.894c-1.764 0-3.162 0-4.255.148c-1.126.152-2.037.472-2.755 1.193c-.719.721-1.038 1.636-1.189 2.766C3 7.205 3 8.608 3 10.379v5.838c0 1.508.92 2.8 2.227 3.342c-.067-.91-.067-2.185-.067-3.247v-5.01c0-1.281 0-2.386.118-3.27c.127-.948.413-1.856 1.147-2.593s1.639-1.024 2.583-1.152c.88-.118 1.98-.118 3.257-.118h3.07c1.276 0 2.374 0 3.255.118A3.6 3.6 0 0 0 15.24 2" />
        <path d="M6.6 11.397c0-2.726 0-4.089.844-4.936c.843-.847 2.2-.847 4.916-.847h2.88c2.715 0 4.073 0 4.917.847S21 8.671 21 11.397v4.82c0 2.726 0 4.089-.843 4.936c-.844.847-2.202.847-4.917.847h-2.88c-2.715 0-4.073 0-4.916-.847c-.844-.847-.844-2.21-.844-4.936z" />
      </>
    ),
  },
  // solar:check-circle-bold
  ok: {
    content: (
      <path
        fillRule="evenodd"
        d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10m-5.97-3.03a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47l2.235-2.235L14.97 8.97a.75.75 0 0 1 1.06 0"
        clipRule="evenodd"
      />
    ),
  },
  // solar:close-circle-bold
  cancel: {
    content: (
      <path
        fillRule="evenodd"
        d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10M8.97 8.97a.75.75 0 0 1 1.06 0L12 10.94l1.97-1.97a.75.75 0 0 1 1.06 1.06L13.06 12l1.97 1.97a.75.75 0 0 1-1.06 1.06L12 13.06l-1.97 1.97a.75.75 0 0 1-1.06-1.06L10.94 12l-1.97-1.97a.75.75 0 0 1 0-1.06"
        clipRule="evenodd"
      />
    ),
  },
  // solar:alt-arrow-down-bold — rotated -90deg by core CSS when collapsed.
  // Scaled down a touch so the wide arrow doesn't crowd the key (core's
  // `.jer-collapse-icon` offset is tuned to the default chevron's footprint).
  collection: {
    content: (
      <path d="m12.37 15.835l6.43-6.63C19.201 8.79 18.958 8 18.43 8H5.57c-.528 0-.771.79-.37 1.205l6.43 6.63c.213.22.527.22.74 0" />
    ),
    scale: 0.9,
  },
}

export const psychedelicTheme: Theme = {
  displayName: 'Psychedelic',
  fragments: {
    fluroYellow: 'rgb(242, 228, 21)',
    fluroGreen: 'rgb(68, 255, 62)',
    paleWhite: { color: 'white', opacity: 0.8 },
  },
  icons: solarBoldIcons,
  styles: {
    container: {
      backgroundColor: 'unset',
      background: 'linear-gradient(90deg, hsla(333, 100%, 53%, 1) 0%, hsla(33, 94%, 57%, 1) 100%)',
      color: 'black',
    },
    dropZone: 'fluroYellow',
    property: ['black', { fontWeight: 'bold' }],
    bracket: 'fluroYellow',
    itemCount: { color: '#A8DADC', opacity: 0.7 },
    string: 'white',
    number: { color: '#33d9ff', fontSize: '90%', fontWeight: 'bold' },
    boolean: ['fluroGreen', { fontWeight: 'bold', fontSize: '80%' }],
    null: {
      color: 'black',
      fontWeight: 'bold',
      opacity: 0.3,
      backgroundColor: 'rgb(255, 255, 255, 0.5)',
      padding: '0 0.4em',
      borderRadius: '0.4em',
    },
    inputHighlight: '#f0abd8',
    iconCollection: 'fluroYellow',
    iconEdit: 'fluroYellow',
    iconDelete: 'paleWhite',
    iconAdd: 'paleWhite',
    iconCopy: '#33d9ff',
    iconOk: 'fluroGreen',
    iconCancel: 'paleWhite',
  },
}
