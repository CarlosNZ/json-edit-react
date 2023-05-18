// Watch parent repo for changes and updates inner copy if so
const { execSync } = require('child_process')

console.log('Relaunching...')

execSync('cp -R ../src/* ./src/fig-tree-editor/src')
execSync('cp ../package.json ./src/fig-tree-editor')
