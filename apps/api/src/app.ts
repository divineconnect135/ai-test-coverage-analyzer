import express from 'express'

import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { healthRouter } from './routes/health.routes.js'

export const app = express()

app.disable('x-powered-by')

// 1. Log requests.
app.use(requestLogger)

// 2. Parse JSON request bodies.
app.use(express.json({ limit: '100kb' }))

// 3. Register API routes.
app.use('/api', healthRouter)

// 4. Handle unmatched API routes.
app.use('/api', notFound)

// 5. Handle errors last.
app.use(errorHandler)
