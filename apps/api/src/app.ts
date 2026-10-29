import express from 'express'

import { requestLogger } from './middleware/requestLogger.js'
import { healthRouter } from './routes/health.routes.js'

export const app = express()

// Reduce unnecessary server information disclosure.
app.disable('x-powered-by')

// Request logging middleware.
app.use(requestLogger)

// Parse JSON request bodies with a size limit.
app.use(express.json({ limit: '100kb' }))

// API routes.
app.use('/api', healthRouter)
