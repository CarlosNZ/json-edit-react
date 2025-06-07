import { isCollection, type CustomNodeDefinition } from '@json-edit-react'
import { EnhancedLinkCustomComponent, EnhancedLinkProps } from './component'

const TEXT_FIELD = 'text'
const URL_FIELD = 'url'

export const EnhancedLinkCustomNodeDefinition: CustomNodeDefinition<EnhancedLinkProps> = {
  condition: ({ value }) => isCollection(value) && TEXT_FIELD in value && URL_FIELD in value,
  element: EnhancedLinkCustomComponent,
  name: 'Enhanced Link', // shown in the Type selector menu
  showInTypesSelector: true,
  defaultValue: {
    [TEXT_FIELD]: 'This is the text that is displayed',
    [URL_FIELD]: 'https://link.goes.here',
  },
  customNodeProps: { fieldNames: { text: TEXT_FIELD, url: URL_FIELD } },
  showOnEdit: true,
  renderCollectionAsValue: true,
}
