import { Router } from 'express'

import { AppError } from '../errors/AppError.js'
import { validateBody } from '../middleware/validateBody.js'
import { createProjectSchema } from '../schemas/project.schema.js'

export const projectsRouter = Router()

projectsRouter.post('/', validateBody(createProjectSchema), () => {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'Project creation is not implemented yet.')
})
