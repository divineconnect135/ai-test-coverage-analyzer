import { app } from './app.js'
import { env } from './config/env.js'

const port = Number(process.env.PORT ?? env.PORT)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid server port configuration.')
}

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`)

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Local API: http://localhost:${port}`)
  }
})
