import type { RequestHandler } from 'express'
import type { z } from 'zod'

import { AppError } from '../errors/AppError.js'

export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }))

      next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', details))

      return
    }

    req.body = result.data

    next()
  }
}
