import { type CustomTextDefinitions, type NodeData } from './types'
import { isObject } from './utils/misc'

const localisedStrings = {
  ITEM_SINGLE: '{{count}} item',
  ITEMS_MULTIPLE: '{{count}} items',
  ITEMS_FILTERED: '{{visible}} of {{total}} items',
  KEY_NEW: 'Enter new key',
  KEY_SELECT: 'Select key',
  NO_KEY_OPTIONS: 'No key options',
  ERROR_KEY_EXISTS: 'Key already exists',
  ERROR_INVALID_JSON: 'Invalid JSON',
  ERROR_UPDATE: 'Update unsuccessful',
  ERROR_DELETE: 'Delete unsuccessful',
  ERROR_ADD: 'Adding node unsuccessful',
  ERROR_RENAME: 'Rename unsuccessful',
  ERROR_MOVE: 'Move unsuccessful',
  DEFAULT_NEW_KEY: 'key',
  SHOW_LESS: '(Show less)',
  EMPTY_STRING: '<empty string>',
  TOOLTIP_COPY: 'Copy to clipboard',
  TOOLTIP_EDIT: 'Edit',
  TOOLTIP_DELETE: 'Delete',
  TOOLTIP_ADD: 'Add',
}

export type LocalisedStrings = typeof localisedStrings
export type TranslateFunction = (
  key: keyof LocalisedStrings,
  customData: NodeData,
  counts?: number | Record<string, string | number>
) => string

const translate = (
  translations: Partial<LocalisedStrings>,
  customText: CustomTextDefinitions,
  customTextData: NodeData,
  key: keyof LocalisedStrings,
  counts?: number | Record<string, string | number>
): string => {
  if (customText[key]) {
    const output = customText[key](customTextData)
    if (output !== null) return output
  }

  let string = key in translations ? (translations[key] as string) : localisedStrings[key]
  if (counts !== undefined) {
    const tokens = isObject(counts) ? counts : { count: counts }
    for (const [token, value] of Object.entries(tokens)) {
      string = string?.replace(`{{${token}}}`, String(value))
    }
  }
  return string
}

export const getTranslateFunction = (
  translations: Partial<LocalisedStrings>,
  customText: CustomTextDefinitions
) => {
  return (
    key: keyof LocalisedStrings,
    customTextData: NodeData,
    counts?: number | Record<string, string | number>
  ) => translate(translations, customText, customTextData, key, counts)
}
