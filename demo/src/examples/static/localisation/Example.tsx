import { useState } from 'react'
import {
  JsonEditor,
  type EnumDefinition,
  type JsonData,
  type LocalisedStrings,
  type NewKeyOptionsFunction,
  type TypeFilterFunction,
  type UpdateFunction,
} from '@json-edit-react'
import { SearchBox } from '../../kit/SearchBox'
import { useExampleProps } from '../../kit/exampleProps' // ---cut---

// Localise the editor's whole UI from inside the data. The
// first field, `Language`, is an enum locked to English /
// Japanese / French (flag emojis included); changing it
// swaps the `translations` prop, so every label, tooltip,
// count and error re-renders in that language. Only the UI
// chrome translates — your data stays as-is.
//
// The setup is tuned to surface as many UI strings as it can:
//   - `showIconTooltips` shows the TOOLTIP_* strings on hover
//   - `showCollectionCount` keeps ITEM_SINGLE / ITEMS_MULTIPLE
//     counts visible
//   - `onUpdate` keeps `settings` live (add keys, edit its
//     values) plus the language switch; everything else is
//     rejected, so the localised error strings show — edit /
//     add / delete / drag / rename elsewhere, or invalid JSON
//   - adding shows KEY_NEW (free text) or, on `settings`,
//     KEY_SELECT; add its two free options to exhaust the
//     list and reveal NO_KEY_OPTIONS (`locked` shows it
//     immediately)
//   - in `settings`, change a value's type to "object" to
//     seed a child under the default key (DEFAULT_NEW_KEY)
//   - the empty property key shows EMPTY_STRING; the long
//     `bio` truncates to reveal SHOW_LESS
//   - typing in the search box filters the tree, switching
//     the counts to ITEMS_FILTERED

// `translations` only needs the keys you want to override, but
// translating them all is what makes the whole UI switch.
const japanese: Partial<LocalisedStrings> = {
  ITEM_SINGLE: '{{count}} 件',
  ITEMS_MULTIPLE: '{{count}} 件',
  ITEMS_FILTERED: '{{total}} 件中 {{visible}} 件',
  KEY_NEW: '新しいキーを入力',
  KEY_SELECT: 'キーを選択',
  NO_KEY_OPTIONS: 'キーの選択肢がありません',
  ERROR_KEY_EXISTS: 'キーが既に存在します',
  ERROR_INVALID_JSON: '無効な JSON です',
  ERROR_UPDATE: '更新できませんでした',
  ERROR_DELETE: '削除できませんでした',
  ERROR_ADD: '追加できませんでした',
  ERROR_RENAME: '名前を変更できませんでした',
  ERROR_MOVE: '移動できませんでした',
  DEFAULT_NEW_KEY: 'キー',
  SHOW_LESS: '(表示を減らす)',
  EMPTY_STRING: '<空の文字列>',
  TOOLTIP_COPY: 'クリップボードにコピー',
  TOOLTIP_EDIT: '編集',
  TOOLTIP_DELETE: '削除',
  TOOLTIP_ADD: '追加',
  TOOLTIP_OK: 'OK',
  TOOLTIP_CANCEL: 'キャンセル',
}

const french: Partial<LocalisedStrings> = {
  ITEM_SINGLE: '{{count}} élément',
  ITEMS_MULTIPLE: '{{count}} éléments',
  ITEMS_FILTERED: '{{visible}} sur {{total}} éléments',
  KEY_NEW: 'Saisir une nouvelle clé',
  KEY_SELECT: 'Sélectionner une clé',
  NO_KEY_OPTIONS: 'Aucune clé disponible',
  ERROR_KEY_EXISTS: 'La clé existe déjà',
  ERROR_INVALID_JSON: 'JSON invalide',
  ERROR_UPDATE: 'Échec de la mise à jour',
  ERROR_DELETE: 'Échec de la suppression',
  ERROR_ADD: 'Échec de l’ajout',
  ERROR_RENAME: 'Échec du renommage',
  ERROR_MOVE: 'Échec du déplacement',
  DEFAULT_NEW_KEY: 'clé',
  SHOW_LESS: '(Afficher moins)',
  EMPTY_STRING: '<chaîne vide>',
  TOOLTIP_COPY: 'Copier dans le presse-papiers',
  TOOLTIP_EDIT: 'Modifier',
  TOOLTIP_DELETE: 'Supprimer',
  TOOLTIP_ADD: 'Ajouter',
  TOOLTIP_OK: 'OK',
  TOOLTIP_CANCEL: 'Annuler',
}

// English is the built-in default, so its entry is empty.
const translationsByLanguage: Record<string, Partial<LocalisedStrings>> = {
  '🇬🇧 English': {},
  '🇯🇵 Japanese': japanese,
  '🇫🇷 French': french,
}

// Deriving the enum values from the map keys keeps the two in
// sync. `matchPriority` lets the stored string load AS this
// enum, so the field is always the language dropdown.
const languageEnum: EnumDefinition = {
  enum: 'Language',
  values: Object.keys(translationsByLanguage),
  matchPriority: 1,
}

const initialData = {
  Language: '🇬🇧 English',
  greeting: 'Hello! Try editing me — the server will say no.',
  tags: ['featured'], // a single-item collection → ITEM_SINGLE
  bio: 'This biography is intentionally long, so the editor truncates it — expand it with the ellipsis to reveal the localised Show-less link.',
  details: {
    author: 'Ada Lovelace',
    '': 'a field with no name', // empty key → EMPTY_STRING
  },
  settings: {
    theme: 'dark',
    fontSize: 14,
  },
  locked: {
    sealed: true,
  },
}

// Lock `Language` to the language enum (the only type it can
// be); everything else keeps the standard type options.
const allowTypeSelection: TypeFilterFunction = ({ key }) =>
  key === 'Language' ? [languageEnum] : true

// Already-present keys are filtered out automatically, so
// `locked` (its one allowed key already exists) resolves to an
// empty list → NO_KEY_OPTIONS. `null` = free-text key entry.
const newKeyOptions: NewKeyOptionsFunction = ({ key }) => {
  if (key === 'settings') return ['theme', 'fontSize', 'autosave', 'compact']
  if (key === 'locked') return ['sealed']
  return null
}

// `settings` is the one live branch: add keys and edit its
// values (changing a value's type to "object" even seeds a
// child under the localised DEFAULT_NEW_KEY). Switching the
// language also sticks. Everything else — including deleting
// or renaming in `settings` — returns `false`, rejecting with
// the built-in (localised) error: ERROR_UPDATE / ERROR_ADD /
// ERROR_DELETE / ERROR_RENAME / ERROR_MOVE.
const onUpdate: UpdateFunction = ({ event, path }) => {
  if (path[0] === 'settings' && (event === 'edit' || event === 'add')) return
  if (event === 'edit' && path[0] === 'Language') return
  return false
}

export default function Localisation() {
  const [data, setData] = useState<JsonData>(initialData)
  const [searchText, setSearchText] = useState('')

  // The selected language IS the first field's value, so the
  // editor's own UI drives its own localisation.
  const { Language } = data as { Language: string }
  const translations = translationsByLanguage[Language] ?? {}

  // The wrapping div is the positioning context for the
  // floating SearchBox; filtering switches the item counts to
  // ITEMS_FILTERED.
  return (
    <div style={{ position: 'relative' }}>
      <SearchBox value={searchText} onChange={setSearchText} placeholder="Search the data" />
      <JsonEditor
        data={data}
        setData={setData}
        {...useExampleProps()} // ---cut---
        rootName="document"
        translations={translations}
        searchText={searchText}
        allowTypeSelection={allowTypeSelection}
        newKeyOptions={newKeyOptions}
        onUpdate={onUpdate}
        showCollectionCount
        showIconTooltips
        allowDrag
        stringTruncateLength={90}
      />
    </div>
  )
}
