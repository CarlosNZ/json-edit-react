import { isCollection, type CustomNodeDefinition } from 'json-edit-react'
import { EnhancedLinkCustomComponent, EnhancedLinkProps } from './component'

const TEXT_FIELD = 'text'
const URL_FIELD = 'url'

export const EnhancedLinkCustomNodeDefinition: CustomNodeDefinition<EnhancedLinkProps> = {
  condition: ({ value }) => isCollection(value) && TEXT_FIELD in value && URL_FIELD in value,
  component: EnhancedLinkCustomComponent,
  name: 'Enhanced Link', // shown in the Type selector menu
  showInTypeSelector: true,
  editOnTypeSwitch: true,
  defaultValue: {
    [TEXT_FIELD]: 'This is the text that is displayed',
    [URL_FIELD]: 'https://link.goes.here',
  },
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
}
