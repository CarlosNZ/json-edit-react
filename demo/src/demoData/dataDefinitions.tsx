import React from 'react'
import { Flex, Link, Text, UnorderedList, ListItem } from '@chakra-ui/react'
import { datePickerDefinition } from '@json-edit-react/components'
import {
  CustomNodeDefinition,
  IconDefinition,
  IconSvg,
  JsonData,
  FilterFunction,
  CustomTextDefinitions,
  assign,
  matchNode,
  DefaultValueFunction,
  NewKeyOptionsFunction,
  OnChangeFunction,
  OnErrorFunction,
  SearchFilterFunction,
  ThemeStyles,
  TypeFilterFunction,
  UpdateResult,
  TypeOptions,
  UpdateFunctionProps,
  type AssignInput,
} from '@json-edit-react'
import { and, byKey, not, root } from '@json-edit-react/utils/filters'
import { blurbs } from './blurbs'
import { Description } from './Description'
// The `intro` data set is the landing view, so it's imported eagerly (its
// example page is the source of truth, but we don't want a loading spinner on
// first paint). Every other example-backed data set is loaded lazily via a
// `load` thunk below, so its chunk stays out of the main bundle.
import {
  initialData as introData,
  allowTypeSelection as introAllowTypeSelection,
  customNodeDefinitions as introCustomNodeDefinitions,
} from '../examples/static/intro/Example'

// eslint-disable-next-line -- any is correct here
type DemoNodeDefinitions = CustomNodeDefinition<Record<string, any>>[]

// A dataset's runtime config — everything the editor needs once the dataset is
// active. Eager datasets declare these fields inline on the registry entry;
// lazy (example-backed) datasets return them from `DemoData.load`, so the whole
// payload (data + logic + any heavy custom-node deps) lands in its own chunk
// rather than the main bundle. See App.tsx for how the active payload is
// resolved (and gated behind a spinner while a lazy chunk loads).
export interface DemoPayload {
  data: object
  allowEdit?: boolean | FilterFunction
  allowDelete?: boolean | FilterFunction
  allowAdd?: boolean | FilterFunction
  allowTypeSelection?: boolean | TypeOptions | TypeFilterFunction
  searchFilter?: 'key' | 'value' | 'all' | SearchFilterFunction
  onUpdate?: (
    props: UpdateFunctionProps,
    toast: (options: unknown) => void
  ) => UpdateResult | Promise<UpdateResult>
  // `onAdd`/`onEdit` are dispatched *within* the editor's single `onUpdate`
  // (see App.tsx), never passed as a prop — so they take the node props
  // only, not core's `control` gate.
  onAdd?: (props: UpdateFunctionProps) => UpdateResult | Promise<UpdateResult>
  onEdit?: (props: UpdateFunctionProps) => UpdateResult | Promise<UpdateResult>
  onChange?: OnChangeFunction
  // Demo datasets return an error *string* to display in a toast; core's
  // `OnErrorFunction` returns `void`, so we reuse only its input shape here.
  onError?: (props: Parameters<OnErrorFunction>[0]) => string
  showErrorMessages?: boolean
  defaultValue?: DefaultValueFunction
  newKeyOptions?: string[] | NewKeyOptionsFunction
  // Either a static list, or — for data sets whose definitions are
  // configured by values in the data itself — a function of the current data
  customNodeDefinitions?: DemoNodeDefinitions | ((data: JsonData) => DemoNodeDefinitions)
  customTextDefinitions?: CustomTextDefinitions
  styles?: Partial<ThemeStyles>
  customTextEditorAvailable?: boolean
}

// A registry entry. The metadata (name/description/rootName/collapse/
// searchPlaceholder) is always synchronous — the picker lists `name`, and
// switching seeds `rootName`/`collapse` before any payload resolves. The
// payload is either inline (eager) or behind `load` (lazy / example-backed);
// exactly one applies, but they're kept optional here so both shapes assign
// cleanly, with App.tsx branching on `load`.
export interface DemoData extends Partial<DemoPayload> {
  name: string
  description: React.JSX.Element
  rootName?: string
  collapse?: number | FilterFunction
  searchPlaceholder?: string
  load?: () => Promise<DemoPayload>
}

export const demoDataDefinitions: Record<string, DemoData> = {
  intro: {
    name: '📣 Intro',
    description: <Description>{blurbs.intro}</Description>,
    rootName: 'data',
    collapse: 2,
    data: introData,
    customNodeDefinitions: introCustomNodeDefinitions,
    customTextEditorAvailable: true,
    allowTypeSelection: introAllowTypeSelection,
  },
  starWars: {
    name: '🚀 Star Wars',
    description: <Description>{blurbs.starWars}</Description>,
    rootName: 'Star Wars data',
    collapse: 1,
    load: async () => {
      const m = await import('../examples/static/star-wars/Example')
      return {
        data: m.initialData,
        allowEdit: m.allowEdit,
        allowDelete: m.allowDelete,
        allowAdd: m.allowAdd,
        allowTypeSelection: m.allowTypeSelection,
        customNodeDefinitions: m.customNodeDefinitions,
      }
    },
  },
  jsonPlaceholder: {
    name: '👥 Client list',
    description: <Description>{blurbs.jsonPlaceholder}</Description>,
    rootName: 'Clients',
    collapse: 2,
    searchPlaceholder: 'Search by name or username',
    load: async () => {
      const m = await import('../examples/static/json-placeholder/Example')
      return {
        data: m.initialData,
        allowEdit: m.allowEdit,
        allowAdd: m.allowAdd,
        allowDelete: m.allowDelete,
        searchFilter: m.searchFilter,
        defaultValue: m.defaultValue,
        onChange: m.onChange,
      }
    },
  },
  jsonSchemaValidation: {
    name: '⚙️ JSON Schema validation',
    description: <Description>{blurbs.jsonSchemaValidation}</Description>,
    rootName: 'data',
    collapse: 2,
    // Lazy: the example page owns the data + logic and ships as its own chunk.
    load: async () => {
      const m = await import('../examples/static/json-schema-validation/Example')
      return {
        data: m.initialData,
        allowTypeSelection: m.allowTypeSelection,
        newKeyOptions: m.newKeyOptions,
        defaultValue: m.defaultValue,
        customTextEditorAvailable: true,
        onUpdate: ({ newData }, toast) => {
          const error = m.validate(newData)
          if (error !== null) {
            toast({
              title: 'Not compliant with JSON Schema',
              description: error,
              status: 'error',
              duration: 5000,
              isClosable: true,
            })
            return { error: 'JSON Schema error' }
          }
        },
      }
    },
  },
  liveData: {
    name: '📖 Live Guestbook',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          Here's a live "guestbook" — your changes can be saved permanently to the cloud. However,
          there are restrictions:
        </Text>
        <UnorderedList>
          <ListItem>
            <Text>You can only add new messages, or fields within your message</Text>
          </ListItem>
          <ListItem>
            <Text>Only the most recent message is editable, and only for five minutes</Text>
          </ListItem>
        </UnorderedList>
        <Text>
          Notice also (these are achieved by customising the <span className="code">onUpdate</span>{' '}
          prop):
        </Text>
        <UnorderedList>
          <ListItem>
            <Text>
              The messages list gets sorted so the most recent is at the <em>top</em>
            </Text>
          </ListItem>
          <ListItem>
            <Text>The timestamps get updated automatically after each edit</Text>
          </ListItem>
        </UnorderedList>
        <Text>
          You can also filter full "Message" objects by searching any text value (
          <span className="code">message</span>, <span className="code">name</span>,{' '}
          <span className="code">from</span>).
        </Text>
      </Flex>
    ),
    rootName: 'liveData',
    data: ['Loading...'],
    collapse: ({ key, parentData }) => {
      if (typeof key !== 'number') return false
      // Expand only the most recent and the last item (my one)
      if (key === 0) return false
      if (Array.isArray(parentData) && key === parentData.length - 1) return false
      return true
    },
    allowEdit: ({ key, value, level, parentData }) => {
      if (level < 3) return false
      if (parentData && 'timeStamp' in parentData) {
        const timeStamp = parentData.timeStamp as string
        if (Date.now() - new Date(timeStamp).getTime() > 300_000) return false
      }
      if (key === 'timeStamp') return false
      if (value instanceof Object) return false
      return true
    },
    allowDelete: ({ level, key, parentData }) => {
      if (level !== 3 || ['name', 'timeStamp', 'message'].includes(key as string)) return false
      if (parentData && 'timeStamp' in parentData) {
        const timeStamp = parentData.timeStamp as string
        if (Date.now() - new Date(timeStamp).getTime() > 300_000) return false
      }
      return true
    },
    allowAdd: ({ path, parentData, value, key }) => {
      if (path[0] !== 'messages') return false
      if (key !== 'messages' && path.slice(-1)[0] !== 0) return false
      if (value instanceof Object && 'timeStamp' in value) {
        const timeStamp = value.timeStamp as string
        if (Date.now() - new Date(timeStamp).getTime() > 300_000) return false
      }
      if (parentData && 'timeStamp' in parentData) {
        const timeStamp = parentData.timeStamp as string
        if (Date.now() - new Date(timeStamp).getTime() > 300_000) return false
      }
      return true
    },
    onEdit: ({ newData, path }) => {
      if (path[0] !== 'messages' && path.length !== 3) return { value: newData }
      const parentPath = [path[0], path[1]]
      const messageObject = (newData as { messages: { [key: number]: { timeStamp: string } } })
        ?.messages?.[path[1] as number]
      messageObject.timeStamp = new Date().toISOString()
      const data = assign(newData as AssignInput, parentPath, messageObject)
      return { value: data }
    },
    onAdd: ({ path, newData }) => {
      if (path[0] === 'messages' && path.length === 2) {
        // @ts-expect-error TO-DO
        const messages = [...(newData?.messages ?? [])]
        messages.sort((a, b) => new Date(b.timeStamp).getTime() - new Date(a.timeStamp).getTime())
        const data = assign(newData as AssignInput, 'messages', messages)
        return { value: data }
      }
      return
    },
    allowTypeSelection: ['string', 'number', 'boolean'],
    defaultValue: ({ level }) => {
      if (level === 1)
        return {
          message: 'Edit this message or "Undo" to remove it',
          name: 'Enter your username here',
          from: 'Where are you from?',
          timeStamp: new Date().toISOString(),
        }
      return 'New value'
    },
    searchFilter: ({ path, fullData }, searchText) => {
      if (path?.length >= 2 && path[0] === 'messages') {
        const index = path?.[1] as number
        const messages = (
          fullData as {
            messages: Record<string, { message?: string; name?: string; from?: string }>[]
          }
        )?.messages
        return (
          matchNode({ value: messages[index]?.message }, searchText) ||
          matchNode({ value: messages[index]?.name }, searchText) ||
          matchNode({ value: messages[index]?.from }, searchText)
        )
      } else return true
    },
    searchPlaceholder: 'Search guestbook',
    customNodeDefinitions: [
      {
        // Borrow the pre-built definition's ISO-date condition; the component
        // here is a custom read-only display, not the date picker
        condition: datePickerDefinition().condition,
        component: ({ value, getStyles, nodeData }) => {
          return (
            <p style={getStyles('string', nodeData)}>
              {new Date(value as string).toLocaleString()}
            </p>
          )
        },
      },
    ],
    customTextDefinitions: {
      ITEMS_MULTIPLE: ({ level, value }) => {
        const entry = value as { name: string; from?: string }
        if (level === 2) return `${entry.name}${entry.from ? '  from ' + entry.from : ''}`
        return null
      },
    },
  },
  editTheme: {
    name: '🎨 Edit this theme!',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          You are now viewing the <strong>Theme</strong> object being used by the component right
          now — edit it live!
        </Text>
        <Text>
          Notice you are restricted from changing the structure in a way that would break the
          required schema.
        </Text>
        <Text>
          See{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#themes--styles" isExternal>
            here
          </Link>{' '}
          for theming information.
        </Text>
      </Flex>
    ),
    rootName: 'theme',
    // allowEdit: ({ key, level }) => level !== 0 && !['fragments', 'styles'].includes(key as string),
    allowEdit: and(not(root), not(byKey('fragments', 'styles'))),
    // allowDelete: ({ key }) => !['displayName', 'fragments', 'styles'].includes(key as string),
    allowDelete: not(byKey('displayName', 'fragments', 'styles')),
    // allowAdd: ({ level }) => level !== 0,
    allowAdd: not(root),
    allowTypeSelection: ['string', 'object', 'array'],
    collapse: 2,
    searchFilter: 'key',
    searchPlaceholder: 'Search Theme keys',
    data: {},
    // Render each theme icon glyph (an `IconDefinition`) as the actual icon via
    // core's `IconSvg`, rather than the raw React-element internals. Display-only.
    customNodeDefinitions: [
      {
        condition: ({ value }) =>
          !!value &&
          typeof value === 'object' &&
          React.isValidElement((value as { content?: unknown }).content),
        renderCollectionAsValue: true,
        showEditTools: false,
        component: ({ value, nodeData, getStyles }) => {
          const { content, viewBox, svgProps, scale } = value as IconDefinition
          // Derive the paint key (icon + PascalCase) the same way core does, so
          // the preview adopts the theme's icon colour via currentColor.
          const key = String(nodeData.key)
          const paintKey = `icon${key[0].toUpperCase()}${key.slice(1)}` as Parameters<
            typeof getStyles
          >[0]
          return (
            <IconSvg
              viewBox={viewBox}
              {...svgProps}
              scale={scale}
              style={{ ...getStyles(paintKey, nodeData), verticalAlign: 'middle' }}
            >
              {content}
            </IconSvg>
          )
        },
      },
    ],
    customTextEditorAvailable: true,
  },
  customNodes: {
    name: '🔧 Custom Nodes',
    description: <Description>{blurbs.customNodes}</Description>,
    rootName: 'Superheroes',
    collapse: 2,
    searchPlaceholder: 'Search by character name',
    load: async () => {
      const m = await import('../examples/static/custom-nodes/Example')
      return {
        data: m.initialData,
        allowEdit: m.allowEdit,
        allowAdd: m.allowAdd,
        allowDelete: m.allowDelete,
        searchFilter: m.searchFilter,
        customNodeDefinitions: m.customNodeDefinitions,
        customTextDefinitions: m.customTextDefinitions,
        styles: m.styles,
        customTextEditorAvailable: true,
        showErrorMessages: false,
        onUpdate: ({ newData }, toast) => {
          const error = m.validate(newData)
          if (error === null) return
          toast({
            title: 'Not compliant with JSON Schema',
            description: error,
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
          return { error: 'JSON Schema error' }
        },
        onError: (errorData) => errorData.error.message,
      }
    },
  },
  customComponentLibrary: {
    name: '📚 Custom Component Library',
    description: <Description>{blurbs.customComponentLibrary}</Description>,
    rootName: 'components',
    collapse: 3,
    load: async () => {
      const m = await import('../examples/static/custom-component-library/Example')
      return {
        data: m.initialData,
        customNodeDefinitions: m.customNodeDefinitions,
        customTextEditorAvailable: true,
      }
    },
  },
}
