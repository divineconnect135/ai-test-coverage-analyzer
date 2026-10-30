import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node'

import { env } from './config/env.js'
import { auth } from './lib/auth.js'

import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

import { healthRouter } from './routes/health.routes.js'
import { meRouter } from './routes/me.routes.js'
import { projectsRouter } from './routes/projects.routes.js'
import { requirementsRouter } from './routes/requirements.routes.js'

export const app = express()

app.disable('x-powered-by')

// Security headers.
app.use(helmet())

// Restrict cross-origin requests when configured.
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

// Better Auth must be mounted before express.json().
app.all('/api/auth/*splat', toNodeHandler(auth))

// JSON parsing for our own API endpoints.
app.use(express.json({ limit: '100kb' }))

// Existing application routes.
app.use('/api', healthRouter)
app.use('/api/me', meRouter)

// Requirements routes must receive projectId.
app.use('/api/projects/:projectId/requirements', requirementsRouter)

// Existing project CRUD routes.
app.use('/api/projects', projectsRouter)

// Unknown routes and error handling.
app.use('/api', notFound)
app.use(errorHandler)
