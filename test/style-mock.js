// `.css` imports — with or without the `?inline` query — resolve here (jest
// `moduleNameMapper`). An `?inline` import is the stylesheet's text (see
// src/css.d.ts), so the stub is a string: `injectStyles` puts it in a <style>
// element, and test/styleInjection.test.tsx asserts on this text.
module.exports = '/* stylesheet stub */'
