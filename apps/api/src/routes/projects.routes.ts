import { Router } from 'express'

import { createProject } from '../controllers/projects.controller.js'
import { validateBody } from '../middleware/validateBody.js'
import { createProjectSchema } from '../schemas/project.schema.js'

export const projectsRouter = Router()

projectsRouter.post('/', validateBody(createProjectSchema), createProject)
