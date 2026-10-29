import express from 'express'

import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { healthRouter } from './routes/health.routes.js'
import { projectsRouter } from './routes/projects.routes.js'

export const app = express()

app.disable('x-powered-by')

// 1. Log requests.
app.use(requestLogger)

// 2. Parse JSON request bodies.
app.use(express.json({ limit: '100kb' }))

// 3. Register API routes.
app.use('/api', healthRouter)

// API routes
app.use('/api', healthRouter)
app.use('/api/projects', projectsRouter)

// Unknown API routes
app.use('/api', notFound)

// Centralized error handling
app.use(errorHandler)

// 4. Handle unmatched API routes.
app.use('/api', notFound)

// 5. Handle errors last.
app.use(errorHandler)
