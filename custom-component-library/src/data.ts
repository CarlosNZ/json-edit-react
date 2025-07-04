/**
 * The data to be shown in the json-edit-react component, which showcases the
 * custom components defined here.
 */

export const testData = {
  Intro: `# json-edit-react
  
  ## Custom Component library
  
  ### Components available:
  - Hyperlink
  - DatePicker
  - DateObject
  - Undefined
  - Markdown
  - "Enhanced" link
  - BigInt
  - BooleanToggle
  - NaN
  - Symbol
  - Image

  Click [here](https://github.com/CarlosNZ/json-edit-react/blob/main/custom-component-library/README.md) for more info
  `,
  'Active Links': {
    Url: 'https://carlosnz.github.io/json-edit-react/',
    'Long URL':
      'https://www.google.com/maps/place/Sky+Tower/@-36.8465603,174.7609398,818m/data=!3m1!1e3!4m6!3m5!1s0x6d0d47f06d4bdc25:0x2d1b5c380ad9387!8m2!3d-36.848448!4d174.762191!16zL20vMDFuNXM2?entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoASAFQAw%3D%3D',
    'Enhanced Link': {
      text: 'This link displays custom text — try editing me!',
      url: 'https://github.com/CarlosNZ/json-edit-react/tree/main/custom-component-library#custom-component-library',
    },
  },
  'Simple boolean toggle': false,
  'Date & Time': {
    Date: new Date().toISOString(),
    'Date Object': new Date(),
    'Show Time in Date?': true,
    // info: 'Inserted in App.tsx',
  },

  'Non-JSON types': {
    Undefined: undefined,
    'Not a Number': NaN,
    Symbol1: Symbol('First one'),
    Symbol2: Symbol('Second one'),
    BigInt: 1234567890123456789012345678901234567890n,
  },
  Markdown:
    'Uses [react-markdown](https://www.npmjs.com/package/react-markdown) to render **Markdown** *text content*. ',
  Images: {
    JPG: 'https://film-grab.com/wp-content/uploads/2014/07/51.jpg',
    PNG: 'https://github.com/CarlosNZ/json-edit-react/blob/main/image/logo192.png?raw=true',
    GIF: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnV0aHB0c2xiMHFmdGY3Z2NkenBkb3Rmd3hvdTlkaTlkNGYxOXFtOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9E7kUhnT9eDok/giphy.gif',
    'Image properties': {
      maxWidth: 200,
      maxHeight: 100,
    },
  },
}
