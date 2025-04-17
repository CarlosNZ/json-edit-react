/**
 * The data to be shown in the json-edit-react component, which showcases the
 * custom components defined in here.
 */

export const testData = {
  header: 'A selection of custom components for json-edit-react',
  'Active Links': {
    url: 'https://carlosnz.github.io/json-edit-react/',
    longUrl:
      'https://www.google.com/maps/place/Sky+Tower/@-36.8465603,174.7609398,818m/data=!3m1!1e3!4m6!3m5!1s0x6d0d47f06d4bdc25:0x2d1b5c380ad9387!8m2!3d-36.848448!4d174.762191!16zL20vMDFuNXM2?entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoASAFQAw%3D%3D',
  },
  Dates: { DateObject: new Date(), DateISOstring: new Date().toISOString() },
  'Show Time in Dates?': true,
  'Non-JSON types': {
    undefined: undefined,
    'Not a Number': NaN,
    Symbol1: Symbol('First one'),
    Symbol2: Symbol('Second one'),
    BigInt: 1234567890123456789012345678901234567890n,
  },
}
