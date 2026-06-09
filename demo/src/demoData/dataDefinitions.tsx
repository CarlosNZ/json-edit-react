import React from 'react'
import { data } from './data'
import { Flex, Box, Link, Text, UnorderedList, ListItem } from '@chakra-ui/react'
import {
  DatePickerDefinition,
  LinkCustomNodeDefinition,
  DateObjectDefinition,
  UndefinedDefinition,
  BooleanToggleDefinition,
  NanDefinition,
  SymbolDefinition,
  BigIntDefinition,
  MarkdownNodeDefinition,
  EnhancedLinkCustomNodeDefinition,
  ImageNodeDefinition,
  ColorPickerNodeDefinition,
} from '@json-edit-react/components'
import {
  CustomNodeDefinition,
  FilterFunction,
  CustomTextDefinitions,
  assign,
  matchNode,
  DefaultValueFunction,
  NewKeyOptionsFunction,
  OnChangeFunction,
  OnErrorFunction,
  SearchFilterFunction,
  standardDataTypes,
  ThemeStyles,
  TypeFilterFunction,
  UpdateResult,
  TypeOptions,
  UpdateFunctionProps,
  type AssignInput,
} from '@json-edit-react'
import jsonSchema from './jsonSchema.json'
import customNodesSchema from './customNodesSchema.json'
import Ajv from 'ajv'

const ajv = new Ajv()
const validateJsonSchema = ajv.compile(jsonSchema)
const validateCustomNodes = ajv.compile(customNodesSchema)

// Used by the "Custom Keys" data set — a small glossary of agent codenames
// and field abbreviations, passed via `componentProps` to the matching
// custom-key component.
const codenameGlossary: Record<string, string> = {
  M: 'handler',
  Q: 'quartermaster',
  dob: 'date of birth',
  bp: 'blood pressure',
}

export interface DemoData {
  name: string
  description: React.JSX.Element
  data: object
  rootName?: string
  collapse?: number | FilterFunction
  allowEdit?: boolean | FilterFunction
  allowDelete?: boolean | FilterFunction
  allowAdd?: boolean | FilterFunction
  allowTypeSelection?: boolean | TypeOptions | TypeFilterFunction
  searchFilter?: 'key' | 'value' | 'all' | SearchFilterFunction
  searchPlaceholder?: string
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
  // eslint-disable-next-line -- any is correct here
  customNodeDefinitions?: CustomNodeDefinition<Record<string, any>>[]
  customTextDefinitions?: CustomTextDefinitions
  styles?: Partial<ThemeStyles>
  customTextEditorAvailable?: boolean
}

export const demoDataDefinitions: Record<string, DemoData> = {
  intro: {
    name: '📣 Intro',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>Play around with the JSON structure, and test out various options.</Text>
        <Text>
          There are a range of different demo data sets to play with, showcasing specific features
          in each one (over and above the modifiable options above). The definitions for all demo
          data displays can be found in the repo{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/blob/main/demo/src/demoData/dataDefinitions.tsx"
            isExternal
          >
            here
          </Link>
          .
        </Text>
        <Text>Incorporate into your own React project:</Text>
        <Box fontSize="sm">
          <Text pl={3}>
            <span className="code">npm i json-edit-react</span>
            <br />
            <span style={{ paddingLeft: 10 }}>or:</span>
            <br />
            <span className="code">yarn add json-edit-react</span>
          </Text>
        </Box>
      </Flex>
    ),
    rootName: 'data',
    collapse: 2,
    data: data.intro,
    customNodeDefinitions: [DatePickerDefinition],
    // allowEdit: ({ key }) => key !== 'number',
    customTextEditorAvailable: true,
    allowTypeSelection: ({ key }) => {
      if (key === 'enum')
        return [
          ...standardDataTypes,
          'Date (ISO)',
          {
            enum: 'Custom Type',
            values: ['Option A 🍏', 'Option B 🍌', 'Option C 🍒'],
            matchPriority: 1,
          },
        ]
      return true
    },
  },
  starWars: {
    name: '🚀 Star Wars',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          A massive chunk of <em>Star Wars</em> data scraped from{' '}
          <Link href="https://swapi.dev/" isExternal>
            <strong>The Star Wars API</strong>
          </Link>
        </Text>
        <Text>
          Note the additional editing restrictions in addition to the toggles above. This has been
          achieved by specifying filter functions for the <span className="code">allowEdit</span>,{' '}
          <span className="code">allowDelete</span>, <span className="code">allowAdd</span> and{' '}
          <span className="code">allowTypeSelection</span> props.{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#readme" isExternal>
            Learn more
          </Link>
        </Text>
        <Text>
          Also, notice the ISO date strings are editable by a date picker control, and URL strings
          are active links — these are{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#custom-nodes" isExternal>
            Custom components
          </Link>
          .
        </Text>
      </Flex>
    ),
    rootName: 'Star Wars data',
    allowEdit: ({ value }) => typeof value !== 'object' || value === null,
    allowDelete: ({ value }) => typeof value !== 'object' || value === null,
    allowAdd: ({ value }) => Array.isArray(value),
    allowTypeSelection: ({ key, path }) => {
      if (path.slice(-2)[0] === 'films' || (path.slice(-3)[0] === 'films' && key === 'title'))
        return [
          {
            enum: 'Film',
            values: [
              'A New Hope',
              'The Empire Strikes Back',
              'Return of the Jedi',
              'The Phantom Menace',
              'Attack of the Clones',
              'Revenge of the Sith',
              'The Force Awakens',
              'The Last Jedi',
              'The Rise of Skywalker',
            ],
            matchPriority: 1,
          },
        ]
      if (key === 'eye_color')
        return [
          {
            enum: 'Eye colour',
            values: [
              'blue',
              'brown',
              'green',
              'hazel',
              'red',
              'yellow',
              'black',
              'white',
              'orange',
              'pink',
              'purple',
              'grey',
              'gold',
              'unknown',
            ],
            matchPriority: 1,
          },
        ]
      if (key === 'hair_color')
        return [
          {
            enum: 'Hair colour',
            values: ['black', 'blond', 'brown', 'auburn', 'grey', 'white', 'unknown'],
            matchPriority: 1,
          },
        ]
      if (key === 'skin_color')
        return [
          {
            enum: 'Skin colour',
            values: [
              'fair',
              'brown',
              'dark',
              'gold',
              'white',
              'blue',
              'red',
              'yellow',
              'green',
              'pale',
              'metal',
              'orange',
              'grey',
              'mottled',
              'unknown',
            ],
            matchPriority: 1,
          },
        ]
      return false
    },
    collapse: 1,
    customNodeDefinitions: [DatePickerDefinition, LinkCustomNodeDefinition],
    data: data.starWars,
  },
  jsonPlaceholder: {
    name: '👥 Client list',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          An array of user data, taken from{' '}
          <Link href="https://jsonplaceholder.typicode.com/users" isExternal>
            <strong>https://jsonplaceholder.typicode.com/users</strong>
          </Link>
          .
        </Text>
        <Text>
          You'll note that the <span className="code">id</span> field is not editable, which would
          be important if this saved back to a database. An additional{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#filter-functions" isExternal>
            <span className="code">allowEdit</span> function
          </Link>{' '}
          has been included which targets the <span className="code">id</span> field specifically.
          You also can't add or delete fields to the main "Person" objects.
        </Text>
        <Text>
          Also, notice that when you add a new item in the top level array, a correctly structured{' '}
          "Person" object is added, but adding new items elsewhere adds simple string values. This
          is done by specifying a function for the <span className="code">defaultValue</span> prop.
        </Text>
        <Text>
          We've also changed the behaviour of the "Search" input, so that it matches specific people
          (on <span className="code">name</span> and <span className="code">username</span>) and
          displays all fields associated with the matching people. This is achieved by specifying a
          custom{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#searchfiltering" isExternal>
            Search filter function
          </Link>
          .
        </Text>
        <Text>
          Finally, an{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#onchange-function" isExternal>
            <span className="code">onChange</span> function
          </Link>{' '}
          has been added to restrict user input in the <span className="code">name</span> field to
          alphabetical characters only (with no line breaks too).
        </Text>
      </Flex>
    ),
    rootName: 'Clients',
    allowEdit: ({ key, level }) => key !== 'id' && level !== 0 && level !== 1,
    allowAdd: ({ level }) => level !== 1,
    allowDelete: ({ level }) => level === 1,
    collapse: 2,
    searchFilter: ({ path, fullData }, searchText) => {
      const data = fullData as { name: string; username: string }[]
      if (path?.length >= 2) {
        const index = path?.[0] as number
        return (
          matchNode({ value: data[index].name }, searchText) ||
          matchNode({ value: data[index].username }, searchText)
        )
      } else return false
    },
    searchPlaceholder: 'Search by name or username',
    defaultValue: ({ level }) => {
      if (level === 0)
        return {
          id: Math.floor(Math.random() * 1000) + 10,
          name: 'New User',
          username: 'user',
          email: 'info@test.com',
          address: {
            street: '',
            suite: '',
            city: '',
            zipcode: '',
            geo: {
              lat: 0,
              lng: 0,
            },
          },
          phone: '1234',
          website: '',
          company: {
            name: '',
            catchPhrase: '',
            bs: '',
          },
        }
      return 'New Value'
    },
    onChange: ({ newValue, key }) => {
      if (key === 'name') return (newValue as string).replace(/[^a-zA-Z\s]|\n|\r/gm, '')
      if (['username', 'email', 'phone', 'website'].includes(key as string))
        return (newValue as string).replace(/\n|\r/gm, '')
      return newValue
    },
    data: data.jsonPlaceholder,
  },
  jsonSchemaValidation: {
    name: '⚙️ JSON Schema validation',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          This data is being validated against a{' '}
          <Link href="https://json-schema.org/" isExternal>
            JSON Schema
          </Link>{' '}
          — it uses a custom{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react?tab=readme-ov-file#update-functions"
            isExternal
          >
            <span className="code">onUpdate</span>
          </Link>{' '}
          function to check the new input against a{' '}
          <Link href="https://ajv.js.org/" isExternal>
            Schema validator{' '}
          </Link>
          and, if it doesn't pass, the input is rejected and an error displayed.
        </Text>
        <Text>
          Note that there are no restrictions on the edit controls that are accessible, but you
          won't be allowed to make any changes that don't comply with the schema. The schema being
          enforced here is{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/blob/main/demo/src/demoData/jsonSchema.json"
            isExternal
          >
            this one.
          </Link>
        </Text>
        <Text>
          Also, notice if you try to add additional keys to the{' '}
          <span className="code">address</span> field or the root node, you'll be limited to allowed
          options via a drop-down.
        </Text>
      </Flex>
    ),
    rootName: 'data',
    data: data.jsonSchemaValidation,
    collapse: 2,
    onUpdate: ({ newData }, toast) => {
      const valid = validateJsonSchema(newData)
      if (!valid) {
        console.log('Errors', validateJsonSchema.errors)
        const errorMessage = validateJsonSchema.errors
          ?.map((error) => `${error.instancePath}${error.instancePath ? ': ' : ''}${error.message}`)
          .join('\n')
        toast({
          title: 'Not compliant with JSON Schema',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        return { error: 'JSON Schema error' }
      }
    },
    allowTypeSelection: ({ key }) => {
      if (key === 'category')
        return [
          ...standardDataTypes,
          {
            enum: 'Category',
            values: ['human', 'enhanced human', 'extra-terrestrial'],
            matchPriority: 1,
          },
        ]
      return true
    },
    newKeyOptions: ({ key }) => {
      if (key === 'data') return ['name', 'age', 'address', 'hobbies', 'category', 'isAlive']
      if (key === 'address') return ['street', 'suburb', 'city', 'state', 'postalCode', 'country']
    },
    defaultValue: ({ key }, newKey) => {
      if (key === 'hobbies') return 'Enter a hobby'

      if (newKey === 'country') return 'United States'
      if (newKey === 'suburb') return 'Enter a suburb'
      if (newKey === 'category') return 'human'
      if (newKey === 'isAlive') return true
      if (newKey === 'hobbies') return ['avenging', '...add more']
      if (newKey === 'address')
        return {
          street: 'Enter street address',
          city: 'City',
          state: 'CA',
          postalCode: '12345',
        }
    },
    customTextEditorAvailable: true,
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
        condition: DatePickerDefinition.condition,
        component: ({ data, getStyles, nodeData }) => {
          return (
            <p style={getStyles('string', nodeData)}>{new Date(data as string).toLocaleString()}</p>
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
    allowEdit: ({ key, level }) => level !== 0 && !['fragments', 'styles'].includes(key as string),
    allowDelete: ({ key }) => !['displayName', 'fragments', 'styles'].includes(key as string),
    allowAdd: ({ level }) => level !== 0,
    allowTypeSelection: ['string', 'object', 'array'],
    collapse: 2,
    searchFilter: 'key',
    searchPlaceholder: 'Search Theme keys',
    data: {},
    customTextEditorAvailable: true,
  },
  customNodes: {
    name: '🔧 Custom Nodes',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          This data set demonstrates{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#custom-nodes" isExternal>
            Custom Nodes
          </Link>{' '}
          — you can provide your own components to present specialised data in a unique way, or
          provide a more complex editing mechanism for a specialised data structure, say.
        </Text>
        <Text>
          In this example, compare the raw JSON (edit the data root) with what is presented here.
          (You can also see a custom{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#onerror-function" isExternal>
            <span className="code">onError</span>
          </Link>{' '}
          function that displays a Toast notification rather than the standard error message when
          you enter invalid JSON input or violate{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/blob/main/demo/src/demoData/customNodesSchema.json"
            isExternal
          >
            this JSON schema
          </Link>
          .)
        </Text>
        <Text>
          You can also see how the property count text changes depending on the data. This is using
          dynamic{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#custom-text" isExternal>
            Custom Text
          </Link>{' '}
          definitions.
        </Text>
        <Text>
          We are also using a conditional{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#themes--styles" isExternal>
            Theme function
          </Link>{' '}
          for the character name (to make it bolder and larger than other strings).
        </Text>
      </Flex>
    ),
    rootName: 'Superheroes',
    collapse: 2,
    searchFilter: ({ path, fullData }, searchText = '') => {
      const data = fullData as { name: string }[]
      if (path?.length >= 2) {
        const index = path?.[0] as number
        return matchNode({ value: data[index].name }, searchText)
      } else return false
    },
    searchPlaceholder: 'Search by character name',
    data: data.customNodes,
    allowEdit: ({ level }) => level === 0,
    allowAdd: false,
    allowDelete: false,
    onUpdate: ({ newData }, toast) => {
      const valid = validateCustomNodes(newData)
      if (!valid) {
        console.log('Errors', validateCustomNodes.errors)
        const errorMessage = validateCustomNodes.errors
          ?.map((error) => `${error.instancePath}${error.instancePath ? ': ' : ''}${error.message}`)
          .join('\n')
        toast({
          title: 'Not compliant with JSON Schema',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        return { error: 'JSON Schema error' }
      }
    },
    onError: (errorData) => errorData.error.message,
    showErrorMessages: false,
    customNodeDefinitions: [
      {
        condition: ({ key, value }) =>
          key === 'logo' &&
          typeof value === 'string' &&
          value.startsWith('http') &&
          value.endsWith('.png'),
        component: ({ data }) => {
          const truncate = (string: string, length = 50) =>
            string.length < length ? string : `${string.slice(0, length - 2).trim()}...`
          return (
            <div style={{ maxWidth: 250 }}>
              <a href={data as string} target="_blank" rel="noreferrer">
                <img src={data as string} style={{ maxHeight: 75 }} alt="logo" />
                <p style={{ fontSize: '0.75em' }}>{truncate(data as string)}</p>{' '}
              </a>
            </div>
          )
        },
      },
      {
        condition: ({ key }) => key === 'publisher',
        component: ({ data }) => {
          return (
            <p
              style={{
                padding: '0.5em 1em',
                border: '2px solid red',
                borderRadius: '1.5em',
                backgroundColor: 'yellow',
                marginTop: '0.5em',
                marginRight: '1em',
                fontFamily: 'sans-serif',
                color: 'black',
              }}
            >
              Presented by: <strong>{String(data)}</strong>
            </p>
          )
        },
        showKey: false,
      },
      {
        ...DatePickerDefinition,
        showOnView: true,
        showInTypeSelector: true,
        componentProps: { showTime: false, dateFormat: 'MMM d, yyyy' },
      },
      // Uncomment to test a custom Collection node
      // {
      //   condition: ({ key }) => key === 'portrayedBy',
      //   component: ({ nodeData, data, getStyles, children }) => {
      //     const styles = getStyles('string', nodeData)
      //     return (
      //       <div style={{ border: '1px solid red', padding: '0.5em', borderRadius: '1em' }}>
      //         <p style={{ marginBottom: '0.5em' }}>
      //           <em>Regular custom component</em>
      //         </p>
      //         <ol style={{ ...styles, paddingLeft: '3em' }}>
      //           {data.map((val) => (
      //             <li key={val}>{val}</li>
      //           ))}
      //         </ol>
      //         {/* {children} */}
      //       </div>
      //     )
      //   },
      //   wrapperComponent: ({ children }) => (
      //     <div
      //       style={{
      //         border: '1px solid blue',
      //         padding: '0.5em',
      //         borderRadius: '1em',
      //         marginTop: '1em',
      //         marginBottom: '1em',
      //       }}
      //     >
      //       <em>Custom Wrapper component</em>: {children}
      //     </div>
      //   ),
      //   showOnEdit: true,
      //   showOnView: true,
      //   // showEditTools: false,
      //   // showKey: false,
      //   // showCollectionWrapper: false,
      // },
    ],
    customTextDefinitions: {
      ITEM_SINGLE: ({ key, value }) => {
        if (value instanceof Object && 'name' in value)
          // @ts-expect-error TO-DO
          return `${value.name} (${value?.publisher ?? ''})`
        if (key === 'aliases' && Array.isArray(value)) return `One name`
        if (key === 'portrayedBy' && Array.isArray(value)) return `One actor`
        return null
      },
      ITEMS_MULTIPLE: ({ key, value, size }) => {
        if (value instanceof Object && 'name' in value)
          // @ts-expect-error TO-DO
          return `${value.name} (${value?.publisher ?? ''})`
        if (key === 'aliases' && Array.isArray(value)) return `${size} names`
        if (key === 'portrayedBy' && Array.isArray(value)) return `${size} actors`
        return null
      },
    },
    styles: {
      string: ({ key }) => (key === 'name' ? { fontWeight: 'bold', fontSize: '120%' } : null),
    },
    customTextEditorAvailable: true,
  },
  customKeys: {
    name: '🕵️ Custom Node keys',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          This dossier demonstrates the{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#customising-keys" isExternal>
            <span className="code">keyComponent</span>
          </Link>{' '}
          property of{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#custom-nodes" isExternal>
            Custom Nodes
          </Link>{' '}
          — a definition can render its own component in place of the property label, for both value{' '}
          <em>and</em> collection nodes.
        </Text>
        <Text>Five inline definitions are at work here:</Text>
        <UnorderedList>
          <ListItem>
            <Text>
              Keys starting with <span className="code">_</span> are <em>classified</em> (italic +
              🔒). Try expanding <span className="code">_emergencyContact</span> — this works on
              collection keys, not just leaf values.
            </Text>
          </ListItem>
          <ListItem>
            <Text>
              Keys starting with <span className="code">REDACTED_</span> are blacked out — the
              original key is preserved in the data and shown on hover.
            </Text>
          </ListItem>
          <ListItem>
            <Text>
              Codename keys (<span className="code">M</span>, <span className="code">Q</span>,{' '}
              <span className="code">dob</span>, <span className="code">bp</span>) get an inline
              expansion via a shared <span className="code">componentProps</span> map.
            </Text>
          </ListItem>
          <ListItem>
            <Text>
              Keys ending in <span className="code">!</span> get a ⚠️ priority badge.
            </Text>
          </ListItem>
          <ListItem>
            <Text>
              URLs under <span className="code">Field Reports</span> use{' '}
              <span className="code">keyComponent</span> <em>and</em>{' '}
              <span className="code">component</span> in one definition — 🔗 in the key, clickable
              anchor in the value.
            </Text>
          </ListItem>
        </UnorderedList>
        <Text>
          Double-click any customised key to enter the standard key-edit input. Try renaming{' '}
          <span className="code">REDACTED_passportId</span> to drop the prefix and watch the
          redaction lift.
        </Text>
      </Flex>
    ),
    rootName: 'dossier',
    collapse: 2,
    data: data.customKeys,
    allowAdd: ({ level }) => level !== 0,
    allowDelete: ({ level }) => level !== 0,
    customNodeDefinitions: [
      // 1. "REDACTED_" prefix — blacked-out key, original visible on hover.
      // Must come before the `_` matcher (which would still match these
      // would-be matches only if they started with `_`; they don't, but
      // ordering this first is cleaner).
      {
        condition: ({ key }) => typeof key === 'string' && key.startsWith('REDACTED_'),
        keyComponent: ({ name, canEditKey, styles, handleClick, setIsEditingKey }) => {
          const display = String(name)
          return (
            <span
              className="jer-key-text"
              style={{ ...styles, cursor: 'help' }}
              onClick={handleClick}
              onDoubleClick={() => canEditKey && setIsEditingKey()}
              title={`Encrypted key — double-click to reveal: ${display}`}
            >
              <span
                style={{
                  backgroundColor: 'black',
                  color: 'black',
                  padding: '0 0.3em',
                  borderRadius: '2px',
                  letterSpacing: '-0.05em',
                }}
              >
                {display.replace(/\S/g, '█')}
              </span>
              <span className="jer-key-colon" style={{ marginLeft: '0.25em' }}>
                :
              </span>
            </span>
          )
        },
      },
      // 2. "_" prefix — classified (italic + lock). Works for value AND
      // collection keys: expand `_emergencyContact` to see the
      // collection-key case.
      {
        condition: ({ key }) => typeof key === 'string' && key.startsWith('_'),
        keyComponent: ({ name, canEditKey, styles, handleClick, setIsEditingKey }) => (
          <span
            className="jer-key-text"
            style={{ ...styles, fontStyle: 'italic', opacity: 0.85 }}
            onClick={handleClick}
            onDoubleClick={() => canEditKey && setIsEditingKey()}
          >
            <span style={{ marginRight: '0.25em' }} aria-hidden="true">
              🔒
            </span>
            {String(name)}
            <span className="jer-key-colon">:</span>
          </span>
        ),
      },
      // 3. Codename glossary — keys in the map get a subscript expansion.
      // `componentProps` carries the map so a single component can serve
      // many keys, and the same generic could be shared with a `component`
      // for this definition if you wanted both.
      {
        condition: ({ key }) =>
          typeof key === 'string' && key in (codenameGlossary as Record<string, string>),
        componentProps: { glossary: codenameGlossary },
        keyComponent: ({
          name,
          canEditKey,
          styles,
          handleClick,
          setIsEditingKey,
          componentProps,
        }) => {
          const glossary = (componentProps as { glossary: Record<string, string> } | undefined)
            ?.glossary
          return (
            <span
              className="jer-key-text"
              style={{
                ...styles,
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: '0.35em',
              }}
              onClick={handleClick}
              onDoubleClick={() => canEditKey && setIsEditingKey()}
            >
              <span>{String(name)}</span>
              {glossary?.[String(name)] && (
                <span
                  style={{
                    fontSize: '0.7em',
                    fontStyle: 'italic',
                    opacity: 0.6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ({glossary[String(name)]})
                </span>
              )}
              <span className="jer-key-colon">:</span>
            </span>
          )
        },
      },
      // 4. "!" suffix — priority badge. Shows that the rendered key text
      // can differ from the stored key (we strip the trailing "!").
      {
        condition: ({ key }) => typeof key === 'string' && key.endsWith('!'),
        keyComponent: ({ name, canEditKey, styles, handleClick, setIsEditingKey }) => {
          const display = String(name).slice(0, -1)
          return (
            <span
              className="jer-key-text"
              style={{ ...styles, color: '#c0392b', fontWeight: 'bold' }}
              onClick={handleClick}
              onDoubleClick={() => canEditKey && setIsEditingKey()}
            >
              <span style={{ marginRight: '0.25em' }} aria-hidden="true">
                ⚠️
              </span>
              {display}
              <span className="jer-key-colon">:</span>
            </span>
          )
        },
      },
      // 5. Field-report URLs — `keyComponent` AND `component` on the same node:
      // a link icon in the key slot, clickable anchor in the value slot.
      // Scoped via `path.includes('Field Reports')` so it doesn't fight
      // with normal string values elsewhere.
      {
        condition: ({ value, path }) =>
          typeof value === 'string' &&
          /^https?:\/\/.+\..+$/.test(value) &&
          path.includes('Field Reports'),
        keyComponent: ({ name, canEditKey, styles, handleClick, setIsEditingKey }) => (
          <span
            className="jer-key-text"
            style={{ ...styles }}
            onClick={handleClick}
            onDoubleClick={() => canEditKey && setIsEditingKey()}
          >
            <span style={{ marginRight: '0.25em' }} aria-hidden="true">
              🔗
            </span>
            {String(name)}
            <span className="jer-key-colon">:</span>
          </span>
        ),
        component: ({ nodeData, getStyles, setIsEditing }) => {
          const url = nodeData.value as string
          const styles = getStyles('string', nodeData)
          return (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                ...styles,
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '85%',
              }}
              onClick={(e) => {
                if (e.getModifierState('Control') || e.getModifierState('Meta')) {
                  e.preventDefault()
                  setIsEditing(true)
                }
              }}
            >
              {url}
            </a>
          )
        },
        showOnView: true,
        showOnEdit: false,
      },
    ],
  },
  customComponentLibrary: {
    name: '📚 Custom Component Library',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          Here are examples of all the custom components available in the{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/README.md"
            isExternal
          >
            Custom Component Library
          </Link>
          , which aims to provide ready-to-go{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#custom-nodes" isExternal>
            Custom Node definitions & components
          </Link>{' '}
          for common (yet non-JSON) data types or useful data structures.
        </Text>
        <Text>
          See their implementation in the{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components/src"
            isExternal
          >
            package source
          </Link>{' '}
          for how to use.
        </Text>
        <Text>
          If you've made a custom component that could be useful to others, please consider{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/README.md#building-your-own"
            isExternal
          >
            submitting a PR
          </Link>{' '}
          to add it to this library.
        </Text>
      </Flex>
    ),
    rootName: 'components',
    collapse: 3,
    data: data.customComponentLibrary,
    customNodeDefinitions: [
      // Must keep this one first as we override it by index in App.tsx
      {
        ...DateObjectDefinition,
        componentProps: { showTime: false },
      },
      ImageNodeDefinition,
      LinkCustomNodeDefinition,
      EnhancedLinkCustomNodeDefinition,
      UndefinedDefinition,
      BooleanToggleDefinition,
      NanDefinition,
      SymbolDefinition,
      BigIntDefinition,
      ColorPickerNodeDefinition,
      {
        ...MarkdownNodeDefinition,
        condition: ({ key }) => key === 'Markdown',
      },
      {
        ...MarkdownNodeDefinition,
        condition: ({ key }) => key === 'Intro',
        showKey: false,
        componentProps: {
          components: {
            // @ts-expect-error Ignore _ var
            a: ({ _, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          },
        },
      },
    ],
    customTextEditorAvailable: true,
  },
}
