import { Router } from 'express'

import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../controllers/projects.controller.js'

import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validateBody.js'

import { createProjectSchema, updateProjectSchema } from '../schemas/project.schema.js'

export const projectsRouter = Router()

// List projects
projectsRouter.get('/', requireAuth, listProjects)

// Create project
projectsRouter.post('/', validateBody(createProjectSchema), requireAuth, createProject)

// Get one project
projectsRouter.get('/:projectId', requireAuth, getProject)

// Update project
projectsRouter.patch('/:projectId', requireAuth, validateBody(updateProjectSchema), updateProject)

// Delete project
projectsRouter.delete('/:projectId', requireAuth, deleteProject)
