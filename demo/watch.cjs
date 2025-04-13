// Watch parent repo for changes and updates inner copy if so
const { execSync } = require('child_process')

console.log('Relaunching...')

execSync('cp -R ../src/* ./src/json-edit-react/src')
execSync('cp ../package.json ./src/json-edit-react')

// Copy to fig tree repo (temporary)
// execSync('cp -R ../src/* ../../fig-tree-evaluator/expression-builder/src/json-edit-react')
