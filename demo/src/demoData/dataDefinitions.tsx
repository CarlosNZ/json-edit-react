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
} from '../../../custom-component-library/components'
import { testData } from '../../../custom-component-library/src/data'
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
  UpdateFunction,
  ErrorString,
  TypeOptions,
  UpdateFunctionProps,
} from '@json-edit-react'
import { type Input } from 'object-property-assigner'
import jsonSchema from './jsonSchema.json'
import customNodesSchema from './customNodesSchema.json'
import Ajv from 'ajv'

const ajv = new Ajv()
const validateJsonSchema = ajv.compile(jsonSchema)
const validateCustomNodes = ajv.compile(customNodesSchema)

// @ts-expect-error only used in Custom component demo app
delete testData['Date & Time']['Date']

export interface DemoData {
  name: string
  description: React.JSX.Element
  data: object
  rootName?: string
  collapse?: number | FilterFunction
  restrictEdit?: boolean | FilterFunction
  restrictDelete?: boolean | FilterFunction
  restrictAdd?: boolean | FilterFunction
  restrictTypeSelection?: boolean | TypeOptions | TypeFilterFunction
  searchFilter?: 'key' | 'value' | 'all' | SearchFilterFunction
  searchPlaceholder?: string
  onUpdate?: (
    props: UpdateFunctionProps,
    toast: (options: unknown) => void
  ) => void | ErrorString | boolean | Promise<boolean | ErrorString | void>
  onAdd?: UpdateFunction
  onEdit?: UpdateFunction
  onChange?: OnChangeFunction
  onError?: OnErrorFunction
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
    // restrictEdit: ({ key }) => key === 'number',
    customTextEditorAvailable: true,
    restrictTypeSelection: ({ key }) => {
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
      return false
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
          achieved by specifying filter functions for the <span className="code">restrictEdit</span>
          , <span className="code">restrictDelete</span>, <span className="code">restrictAdd</span>{' '}
          and <span className="code">restrictTypeSelection</span> props.{' '}
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
    restrictEdit: ({ value }) => typeof value === 'object' && value !== null,
    restrictDelete: ({ value }) => typeof value === 'object' && value !== null,
    restrictAdd: ({ value }) => !Array.isArray(value),
    restrictTypeSelection: ({ key, path }) => {
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
      return true
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
            <span className="code">restrictEdit</span> function
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
    restrictEdit: ({ key, level }) => key === 'id' || level === 0 || level === 1,
    restrictAdd: ({ level }) => level === 1,
    restrictDelete: ({ level }) => level !== 1,
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
    onChange: ({ newValue, name }) => {
      if (name === 'name') return (newValue as string).replace(/[^a-zA-Z\s]|\n|\r/gm, '')
      if (['username', 'email', 'phone', 'website'].includes(name as string))
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
        return 'JSON Schema error'
      }
    },
    restrictTypeSelection: ({ key }) => {
      if (key === 'category')
        return [
          ...standardDataTypes,
          {
            enum: 'Category',
            values: ['human', 'enhanced human', 'extra-terrestrial'],
            matchPriority: 1,
          },
        ]
      return false
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
          Notice also (these are achieved by customising the <span className="code">onEdit</span>{' '}
          and <span className="code">onAdd</span> props):
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
    restrictEdit: ({ key, value, level, parentData }) => {
      if (level < 3) return true
      if (parentData && 'timeStamp' in parentData) {
        const timeStamp = parentData.timeStamp as string
        if (Date.now() - new Date(timeStamp).getTime() > 300_000) return true
      }
      if (key === 'timeStamp') return true
      if (value instanceof Object) return true
      return false
    },
    restrictDelete: ({ level, key, parentData }) => {
      if (level !== 3 || ['name', 'timeStamp', 'message'].includes(key as string)) return true
      if (parentData && 'timeStamp' in parentData) {
        const timeStamp = parentData.timeStamp as string
        if (Date.now() - new Date(timeStamp).getTime() > 300_000) return true
      }
      return false
    },
    restrictAdd: ({ path, parentData, value, key }) => {
      if (path[0] !== 'messages') return true
      if (key !== 'messages' && path.slice(-1)[0] !== 0) return true
      if (value instanceof Object && 'timeStamp' in value) {
        const timeStamp = value.timeStamp as string
        if (Date.now() - new Date(timeStamp).getTime() > 300_000) return true
      }
      if (parentData && 'timeStamp' in parentData) {
        const timeStamp = parentData.timeStamp as string
        if (Date.now() - new Date(timeStamp).getTime() > 300_000) return true
      }
      return false
    },
    onEdit: ({ newData, path }) => {
      if (path[0] !== 'messages' && path.length !== 3) return ['value', newData]
      const parentPath = [path[0], path[1]]
      const messageObject = (newData as { messages: { [key: number]: { timeStamp: string } } })
        ?.messages?.[path[1] as number]
      messageObject.timeStamp = new Date().toISOString()
      const data = assign(newData as Input, parentPath, messageObject)
      return ['value', data]
    },
    onAdd: ({ path, newData }) => {
      if (path[0] === 'messages' && path.length === 2) {
        // @ts-expect-error TO-DO
        const messages = [...(newData?.messages ?? [])]
        messages.sort((a, b) => new Date(b.timeStamp).getTime() - new Date(a.timeStamp).getTime())
        const data = assign(newData as Input, 'messages', messages)
        return ['value', data]
      }
      return
    },
    restrictTypeSelection: ['string', 'number', 'boolean'],
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
        element: ({ data, getStyles, nodeData }) => {
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
    restrictEdit: ({ key, level }) =>
      level === 0 || ['fragments', 'styles'].includes(key as string),
    restrictDelete: ({ key }) => ['displayName', 'fragments', 'styles'].includes(key as string),
    restrictAdd: ({ level }) => level === 0,
    restrictTypeSelection: ['string', 'object', 'array'],
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
    restrictEdit: ({ level }) => level > 0,
    restrictAdd: true,
    restrictDelete: true,
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
        return 'JSON Schema error'
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
        element: ({ data }) => {
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
        element: ({ data }) => {
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
        hideKey: true,
      },
      {
        ...DatePickerDefinition,
        showOnView: true,
        showInTypesSelector: true,
        customNodeProps: { showTime: false, dateFormat: 'MMM d, yyyy' },
      },
      // Uncomment to test a custom Collection node
      // {
      //   condition: ({ key }) => key === 'portrayedBy',
      //   element: ({ nodeData, data, getStyles, children }) => {
      //     const styles = getStyles('string', nodeData)
      //     return (
      //       <div style={{ border: '1px solid red', padding: '0.5em', borderRadius: '1em' }}>
      //         <p style={{ marginBottom: '0.5em' }}>
      //           <em>Regular custom element</em>
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
      //   wrapperElement: ({ children }) => (
      //     <div
      //       style={{
      //         border: '1px solid blue',
      //         padding: '0.5em',
      //         borderRadius: '1em',
      //         marginTop: '1em',
      //         marginBottom: '1em',
      //       }}
      //     >
      //       <em>Custom Wrapper element</em>: {children}
      //     </div>
      //   ),
      //   showOnEdit: true,
      //   showOnView: true,
      //   // showEditTools: false,
      //   // hideKey: true,
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
  customComponentLibrary: {
    name: '📚 Custom Component Library',
    description: (
      <Flex flexDir="column" gap={2}>
        <Text>
          Here are examples of all the custom components available in the{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/blob/main/custom-component-library/README.md"
            isExternal
          >
            Custom Component Library
          </Link>
          , which aims to provide ready-to-go{' '}
          <Link href="https://github.com/CarlosNZ/json-edit-react#custom-nodes" isExternal>
            Custom Nodes
          </Link>{' '}
          for common (yet non-JSON) data types or useful data structures.
        </Text>
        <Text>
          See their implementation in the{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/blob/main/custom-component-library/src/App.tsx"
            isExternal
          >
            example App
          </Link>{' '}
          for how to use.
        </Text>
        <Text>
          If you've made a custom component that could be useful to others, please consider{' '}
          <Link
            href="https://github.com/CarlosNZ/json-edit-react/blob/main/custom-component-library/README.md#development"
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
    data: testData,
    customNodeDefinitions: [
      // Must keep this one first as we override it by index in App.tsx
      {
        ...DateObjectDefinition,
        customNodeProps: { showTime: false },
      },
      ImageNodeDefinition,
      LinkCustomNodeDefinition,
      EnhancedLinkCustomNodeDefinition,
      UndefinedDefinition,
      BooleanToggleDefinition,
      NanDefinition,
      SymbolDefinition,
      BigIntDefinition,
      {
        ...MarkdownNodeDefinition,
        condition: ({ key }) => key === 'Markdown',
      },
      {
        ...MarkdownNodeDefinition,
        condition: ({ key }) => key === 'Intro',
        hideKey: true,
        customNodeProps: {
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
