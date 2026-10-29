import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

import { env } from './config/env.js'
import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

import { healthRouter } from './routes/health.routes.js'
import { projectsRouter } from './routes/projects.routes.js'

export const app = express()

// Remove the Express identification header.
app.disable('x-powered-by')

// Security-related HTTP headers.
app.use(helmet())

// Allow a specific cross-origin frontend only when configured.
if (env.CORS_ORIGIN) {
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )
}

// Request logging.
app.use(requestLogger)

// JSON body parsing with a size limit.
app.use(express.json({ limit: '100kb' }))

// API routes.
app.use('/api', healthRouter)
app.use('/api/projects', projectsRouter)

// Handle unknown API routes.
app.use('/api', notFound)

// Centralized error handling must be last.
app.use(errorHandler)
