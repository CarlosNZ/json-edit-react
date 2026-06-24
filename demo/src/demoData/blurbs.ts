// Markdown blurbs for the demo data sets that also ship as example pages. This
// is the single source of truth, shared by the main demo (rendered as the data
// set `description`) and the examples registry (the example-page `blurb`); both
// render it through <MarkdownText>. The text is converted from the original
// demo descriptions and still leans on the demo context in places (e.g. "the
// toggles above") — it'll be reconciled to read well in both surfaces in a
// later pass.
export const blurbs = {
  intro: `Play around with the JSON structure, and test out various options
  
  There are a range of different demo data sets to play with, showcasing specific features in each one (over and above the modifiable options above). The definitions for all demo data displays can be found in the repo [here](https://github.com/CarlosNZ/json-edit-react/blob/main/demo/src/demoData/dataDefinitions.tsx).
  
  Incorporate into your own React project:

  \`\`\`js
    npm i json-edit-react     // or
    yarn add json-edit-react  // or
    pnpm add json-edit-react
  \`\`\``,
  starWars: `A massive chunk of *Star Wars* data scraped from [The Star Wars API](https://swapi.info/).

  Note the additional editing restrictions in addition to the toggles above. This has been achieved by specifying filter functions for the \`allowEdit\`, \`allowDelete\`, \`allowAdd\` and \`allowTypeSelection\` props. [Learn more](https://github.com/CarlosNZ/json-edit-react#readme).

  Also, notice the ISO date strings are editable by a date picker control, and URL strings are active links — these are [Custom components](https://github.com/CarlosNZ/json-edit-react#custom-nodes).`,
  jsonPlaceholder: `An array of user data, taken from [https://jsonplaceholder.typicode.com/users](https://jsonplaceholder.typicode.com/users).

  You'll note that the \`id\` field is not editable, which would be important if this saved back to a database. An additional [\`allowEdit\` function](https://github.com/CarlosNZ/json-edit-react#filter-functions) has been included which targets the \`id\` field specifically. You also can't add or delete fields to the main "Person" objects.

  Also, notice that when you add a new item in the top level array, a correctly structured "Person" object is added, but adding new items elsewhere adds simple string values. This is done by specifying a function for the \`defaultValue\` prop.

  We've also changed the behaviour of the "Search" input, so that it matches specific people (on \`name\` and \`username\`) and displays all fields associated with the matching people. This is achieved by specifying a custom [Search filter function](https://github.com/CarlosNZ/json-edit-react#searchfiltering).

  Finally, an [\`onChange\` function](https://github.com/CarlosNZ/json-edit-react#onchange-function) has been added to restrict user input in the \`name\` field to alphabetical characters only (with no line breaks too).`,
  jsonSchemaValidation: `This data is being validated against a [JSON Schema](https://json-schema.org/) — it uses a custom [\`onUpdate\`](https://github.com/CarlosNZ/json-edit-react?tab=readme-ov-file#update-functions) function to check the new input against a [Schema validator](https://ajv.js.org/) and, if it doesn't pass, the input is rejected and an error displayed.

  Note that there are no restrictions on the edit controls that are accessible, but you won't be allowed to make any changes that don't comply with the schema. The schema being enforced here is [this one](https://github.com/CarlosNZ/json-edit-react/blob/main/demo/src/examples/static/json-schema-validation/schema.json).

  Also, notice if you try to add additional keys to the \`address\` field or the root node, you'll be limited to allowed options via a drop-down.`,
  customNodes: `This data set demonstrates [Custom Nodes](https://github.com/CarlosNZ/json-edit-react#custom-nodes) — you can provide your own components to present specialised data in a unique way, or provide a more complex editing mechanism for a specialised data structure, say.

  In this example, compare the raw JSON (edit the data root) with what is presented here. (You can also see a custom [\`onError\`](https://github.com/CarlosNZ/json-edit-react#onerror-function) function that displays a Toast notification rather than the standard error message when you enter invalid JSON input or violate [this JSON schema](https://github.com/CarlosNZ/json-edit-react/blob/main/demo/src/examples/static/custom-nodes/schema.json).)

  You can also see how the property count text changes depending on the data. This is using dynamic [Custom Text](https://github.com/CarlosNZ/json-edit-react#custom-text) definitions.

  We are also using a conditional [Theme function](https://github.com/CarlosNZ/json-edit-react#themes--styles) for the character name (to make it bolder and larger than other strings).`,
  customComponentLibrary: `Here are examples of all the custom components available in the [Custom Component Library](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/README.md), which aims to provide ready-to-go [Custom Node definitions & components](https://github.com/CarlosNZ/json-edit-react#custom-nodes) for common data types or useful data structures.

  See their implementation in the [package source](https://github.com/CarlosNZ/json-edit-react/tree/main/packages/components/src) for how to use.

  If you've made a custom component that could be useful to others, please consider [submitting a PR](https://github.com/CarlosNZ/json-edit-react/blob/main/packages/components/README.md#building-your-own) to add it to this library.`,
}
