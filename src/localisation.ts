import { type CustomTextDefinitions, type CustomTextFunction, type NodeData } from './types'

const localisedStrings = {
  ITEM_SINGLE: '{{count}} item',
  ITEMS_MULTIPLE: '{{count}} items',
  KEY_NEW: 'Enter new key',
  ERROR_KEY_EXISTS: 'Key already exists',
  ERROR_INVALID_JSON: 'Invalid JSON',
  ERROR_UPDATE: 'Update unsuccessful',
  ERROR_DELETE: 'Delete unsuccessful',
  ERROR_ADD: 'Adding node unsuccessful',
  DEFAULT_STRING: 'New data!',
  DEFAULT_NEW_KEY: 'key',
}

export type LocalisedStrings = typeof localisedStrings
export type TranslateFunction = (
  key: keyof LocalisedStrings,
  customData: NodeData,
  count?: number
) => string

const translate = (
  translations: Partial<LocalisedStrings>,
  customText: CustomTextDefinitions,
  customTextData: NodeData,
  key: keyof LocalisedStrings,
  count?: number
): string => {
  if (customText[key]) {
    const output = (customText[key] as CustomTextFunction)(customTextData)
    if (output !== null) return output
  }

  const string = key in translations ? (translations[key] as string) : localisedStrings[key]
  return count === undefined ? string : string?.replace('{{count}}', String(count))
}

export const getTranslateFunction = (
  translations: Partial<LocalisedStrings>,
  customText: CustomTextDefinitions
) => {
  return (key: keyof LocalisedStrings, customTextData: NodeData, count?: number) =>
    translate(translations, customText, customTextData, key, count)
}
