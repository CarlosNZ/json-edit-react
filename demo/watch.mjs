// Watch parent repo for changes and updates inner copy if so
import path from 'path'
import fs from 'fs-extra'

console.log('Relaunching...')

fs.copySync(path.join('..', 'src'), path.join('src', 'json-edit-react', 'src'))
fs.copySync(path.join('..', 'package.json'), path.join('src', 'json-edit-react', 'package.json'))
