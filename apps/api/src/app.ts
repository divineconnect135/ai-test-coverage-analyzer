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
import { projectsRouter } from './routes/projects.routes.js'

import { meRouter } from './routes/me.routes.js'

export const app = express()

// Remove the Express identification header.
app.disable('x-powered-by')

// Security headers.
app.use(helmet())

// Cross-origin requests from our frontend.
if (env.CORS_ORIGIN) {
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )
}

// Log incoming requests.
app.use(requestLogger)

// Better Auth routes.
// Express 5 requires a named wildcard.
// IMPORTANT: Mount before express.json().
app.all('/api/auth/*splat', toNodeHandler(auth))

// Parse JSON for our own API routes.
app.use(express.json({ limit: '100kb' }))

// Application routes.
app.use('/api', healthRouter)
app.use('/api/me', meRouter)
app.use('/api/projects', projectsRouter)

// Unknown API routes.
app.use('/api', notFound)

// Centralized error handler.
app.use(errorHandler)
