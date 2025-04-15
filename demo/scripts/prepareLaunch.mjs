import path from 'path'
import fs from 'fs-extra'

fs.emptyDirSync('./src/json-edit-react')
fs.copySync(path.join('..', 'src'), path.join('src', 'json-edit-react', 'src'))
fs.copySync(path.join('..', 'package.json'), path.join('src', 'json-edit-react', 'package.json'))
