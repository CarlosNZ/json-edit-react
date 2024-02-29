import React from 'react'
import { data } from './data'
import { Flex, Box, Link, Text } from '@chakra-ui/react'
import { dateNodeDefinition } from '../customComponents/DateTimePicker'
import {
  CustomNodeDefinition,
  FilterFunction,
  CustomTextDefinitions,
  LinkCustomNodeDefinition,
} from '../JsonEditImport'
import { DataType, DefaultValueFunction, ThemeStyles } from '../json-edit-react/src/types'

interface DemoData {
  name: string
  description: JSX.Element
  data: object
  rootName?: string
  collapse?: number
  restrictEdit?: FilterFunction
  restrictDelete?: FilterFunction
  restrictAdd?: FilterFunction
  restrictTypeSelection?: boolean | DataType[]
  defaultValue?: unknown | DefaultValueFunction
  customNodeDefinitions?: CustomNodeDefinition[]
  customTextDefinitions?: CustomTextDefinitions
  styles?: Partial<ThemeStyles>
}

export const demoData: Record<string, DemoData> = {
  intro: {
    name: '📘 Intro',
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
    collapse: 2,
    data: data.intro,
    customNodeDefinitions: [dateNodeDefinition],
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
    restrictEdit: ({ value }) => typeof value === 'object' && value !== null,
    restrictDelete: ({ value }) => typeof value === 'object' && value !== null,
    restrictAdd: ({ value }) => !Array.isArray(value),
    restrictTypeSelection: true,
    collapse: 1,
    customNodeDefinitions: [dateNodeDefinition, LinkCustomNodeDefinition],
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
          <span className="code">restrictEdit</span> function as been included which targets the{' '}
          <span className="code">id</span> field specifically.
        </Text>
        <Text>
          Also, notice that when a new item is added at the top level, a correctly structured{' '}
          <strong>Person</strong> object is added, but adding new items elsewhere adds simple string
          values. This is done by specifying a function for the{' '}
          <span className="code">defaultValue</span> prop.
        </Text>
      </Flex>
    ),
    restrictEdit: ({ key, level }) => key === 'id' || level === 0 || level === 1,
    restrictDelete: ({ key }) => key === 'id',
    collapse: 2,
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
    data: data.jsonPlaceholder,
  },
  vsCode: {
    name: '⚙️ VSCode settings file',
    description: (
      <Text>
        A typical{' '}
        <Link href="https://code.visualstudio.com/" isExternal>
          VSCode
        </Link>{' '}
        config file.
      </Text>
    ),
    collapse: 2,
    data: data.vsCode,
  },
  liveData: {
    name: '📖 Live Data (from database)',
    description: (
      <Text>
        Let's try a little experiment. You can save this JSON object to a live database, so feel
        free to use it to leave the world a message or find some way to be creative.
        <br />
        Note the deletion restriction and the restriction on being able to modify a whole object
        node. Let's see how long it lasts... 😉
      </Text>
    ),
    rootName: 'liveData',
    collapse: 3,
    restrictEdit: ({ key, value, level, path, size }) => {
      return level === 0 || key === 'messages' || key === 'lastEdited'
    },
    restrictDelete: () => true,
    restrictAdd: ({ level }) => level === 0,
    data: {},
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
    data: {},
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
    data: data.customNodes,
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
        ...dateNodeDefinition,
        showOnView: true,
        showInTypesSelector: true,
        customNodeProps: { showTimeSelect: false, dateFormat: 'MMM d, yyyy' },
      },
    ],
    customTextDefinitions: {
      ITEM_SINGLE: ({ key, value, size }) => {
        if (value instanceof Object && 'name' in value)
          return `${value.name} (${(value as any)?.publisher ?? ''})`
        if (key === 'aliases' && Array.isArray(value))
          return `${size} ${size === 1 ? 'name' : 'names'}`
        return null
      },
      ITEMS_MULTIPLE: ({ key, value, size }) => {
        if (value instanceof Object && 'name' in value)
          return `${value.name} (${(value as any)?.publisher ?? ''})`
        if (key === 'aliases' && Array.isArray(value))
          return `${size} ${size === 1 ? 'name' : 'names'}`
        return null
      },
    },
    styles: {
      string: ({ key }) => (key === 'name' ? { fontWeight: 'bold', fontSize: '120%' } : null),
    },
  },
  // Enable to test more complex features of Custom nodes
  //   testCustomNodes: {
  //     name: '🔧 Custom Nodes',
  //     description: (
  //       <Flex flexDir="column" gap={2}>
  //         <Text>
  //           This data set shows <strong>Custom Nodes</strong> — you can provide your own components to
  //           present specialised data in a unique way, or provide a more complex editing mechanism for
  //           a specialised data structure, say.
  //         </Text>
  //         <Text>
  //           In this example, compare the raw JSON (edit the data root) with what is presented here.
  //         </Text>
  //         <Text>
  //           See the{' '}
  //           <a href="https://github.com/CarlosNZ/json-edit-react#custom-nodes">Custom Nodes</a>{' '}
  //           section of the documentation for more info.
  //         </Text>
  //       </Flex>
  //     ),
  //     rootName: 'Superheroes',
  //     collapse: 2,
  //     data: data.customNodes,
  //     customNodeDefinitions: [
  //       {
  //         condition: ({ key, value }) =>
  //           key === 'logo' &&
  //           typeof value === 'string' &&
  //           value.startsWith('http') &&
  //           value.endsWith('.png'),
  //         element: ({ data }) => {
  //           const truncate = (string: string, length = 50) =>
  //             string.length < length ? string : `${string.slice(0, length - 2).trim()}...`
  //           return (
  //             <div style={{ maxWidth: 250 }}>
  //               <a href={data} target="_blank">
  //                 <img src={data} style={{ maxHeight: 75 }} />
  //                 <p style={{ fontSize: '0.75em' }}>{truncate(data)}</p>{' '}
  //               </a>
  //             </div>
  //           )
  //         },
  //       },
  //       {
  //         condition: ({ key }) => key === 'publisher',
  //         element: ({ data }) => {
  //           return (
  //             <p
  //               style={{
  //                 padding: '0.5em 1em',
  //                 border: '2px solid red',
  //                 borderRadius: '1.5em',
  //                 backgroundColor: 'yellow',
  //                 marginTop: '0.5em',
  //                 marginRight: '1em',
  //                 fontFamily: 'sans-serif',
  //               }}
  //             >
  //               Presented by: <strong>{data}</strong>
  //             </p>
  //           )
  //         },
  //         hideKey: true,
  //         showEditTools: false,
  //       },
  //       {
  //         condition: ({ key }) => key === 'aliases',
  //         element: ({ data }) => {
  //           return (
  //             <ol style={{ paddingLeft: 50, color: 'orange' }}>
  //               {data.map((val) => (
  //                 <li key={val}>{val}</li>
  //               ))}
  //             </ol>
  //           )
  //         },
  //         // showOnEdit: true,
  //         // showOnView: false,
  //         // hideKey: true,
  //       },
  //     ],
  //   },
}
