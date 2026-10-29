import type { RequestHandler } from 'express'

import { AppError } from '../errors/AppError.js'

export const createProject: RequestHandler = () => {
  // Real project creation will be added in Phase 6.
  throw new AppError(501, 'NOT_IMPLEMENTED', 'Project creation is not implemented yet.')
}
