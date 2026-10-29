import type { ErrorRequestHandler } from 'express'
import { AppError } from '../errors/AppError.js'

function hasErrorType(error: unknown, type: string): boolean {
  return typeof error === 'object' && error !== null && 'type' in error && error.type === type
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  // Delegate if the response has already started.
  if (res.headersSent) {
    next(error)
    return
  }

  // Expected application errors.
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    })
    return
  }

  // Malformed JSON submitted by the client.
  if (hasErrorType(error, 'entity.parse.failed')) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON.',
      },
    })
    return
  }

  // Request body exceeds the configured size limit.
  if (hasErrorType(error, 'entity.too.large')) {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds the allowed size.',
      },
    })
    return
  }

  // Unexpected errors must not expose internal details.
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API] Unexpected error:', error)
  } else {
    console.error('[API] Unexpected server error')
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred.',
    },
  })
}
