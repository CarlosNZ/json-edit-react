const localisedStrings = {
  ITEM_SINGLE: '{{count}} item',
  ITEMS_MULTIPLE: '{{count}} items',
  KEY_NEW: 'Enter new key',
  ERROR_KEY_EXISTS: 'Key already exists',
  ERROR_INVALID_JSON: 'Invalid JSON',
  ERROR_UPDATE: 'Update unsuccessful',
  ERROR_DELETE: 'Delete unsuccessful',
  ERROR_ADD: 'Adding node unsuccessful',
}

export type LocalisedStrings = typeof localisedStrings
export type TranslateFunction = (key: keyof LocalisedStrings, count?: number) => string

const translate = (
  translations: Partial<LocalisedStrings>,
  key: keyof LocalisedStrings,
  count?: number
): string => {
  const string = key in translations ? (translations[key] as string) : localisedStrings[key]
  return count === undefined ? string : string?.replace('{{count}}', String(count))
}

export const getTranslateFunction =
  (translations: Partial<LocalisedStrings>) => (key: keyof LocalisedStrings, count?: number) =>
    translate(translations, key, count)
