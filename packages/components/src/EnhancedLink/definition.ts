import { isCollection, type CustomNodeDefinition } from 'json-edit-react'
import { EnhancedLinkCustomComponent, EnhancedLinkProps } from './component'

const TEXT_FIELD = 'text'
const URL_FIELD = 'url'

const DEFAULT_LINK = {
  [TEXT_FIELD]: 'This is the text that is displayed',
  [URL_FIELD]: 'https://link.goes.here',
}

export const EnhancedLinkCustomNodeDefinition: CustomNodeDefinition<EnhancedLinkProps> = {
  condition: ({ value }) => isCollection(value) && TEXT_FIELD in value && URL_FIELD in value,
  component: EnhancedLinkCustomComponent,
  name: 'Enhanced Link', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  defaultValue: DEFAULT_LINK,
  componentProps: { fieldNames: { text: TEXT_FIELD, url: URL_FIELD } },
  showOnEdit: true,
  renderCollectionAsValue: true,
  // The primitive form preserves both fields: "<url> (<text>)"
  toStandardType: (value) => {
    if (!(isCollection(value) && URL_FIELD in value)) return String(value)
    const url = String(value[URL_FIELD])
    const text = TEXT_FIELD in value ? String(value[TEXT_FIELD]) : ''
    return text ? `${url} (${text})` : url
  },
  // Reverses toStandardType's "<url> (<text>)" form, so a switch away and
  // back round-trips losslessly; otherwise a URL-looking value seeds the url
  // field and anything else seeds the text
  fromStandardType: (value) => {
    // A confirm's buffer already holds the link object — pass it through
    if (isCollection(value)) return value
    const text = String(value ?? '')
    const combined = /^(https?:\/\/\S+) \((.*)\)$/.exec(text)
    if (combined) return { [TEXT_FIELD]: combined[2], [URL_FIELD]: combined[1] }
    return /^https?:\/\//.test(text)
      ? { ...DEFAULT_LINK, [URL_FIELD]: text }
      : { ...DEFAULT_LINK, [TEXT_FIELD]: text }
  },
}
