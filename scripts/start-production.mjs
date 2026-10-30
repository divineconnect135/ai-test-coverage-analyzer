import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()

const webBuild = resolve(root, 'apps/web/dist/index.html')

if (!existsSync(webBuild)) {
  throw new Error('Frontend build missing: apps/web/dist/index.html')
}

const serverCandidates = ['apps/api/dist/server.js', 'apps/api/dist/src/server.js']

const serverFile = serverCandidates
  .map((relativePath) => resolve(root, relativePath))
  .find(existsSync)

if (!serverFile) {
  throw new Error(
    [
      'Compiled API server not found.',
      'Run the API production build.',
      `Checked: ${serverCandidates.join(', ')}`,
    ].join(' '),
  )
}

console.log('Starting AI Test Coverage Analyzer')
console.log('Frontend build found.')
console.log('Compiled API server found.')

await import(pathToFileURL(serverFile).href)
