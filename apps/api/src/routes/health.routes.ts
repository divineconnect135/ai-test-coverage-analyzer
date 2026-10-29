import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'AI Test Coverage Analyzer API is running',
  })
})
