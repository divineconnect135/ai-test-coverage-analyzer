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

import { testCasesRouter } from './test-cases.routes.js'

export const projectsRouter = Router()

// GET /api/projects
projectsRouter.get('/', requireAuth, listProjects)

// POST /api/projects
projectsRouter.post('/', validateBody(createProjectSchema), requireAuth, createProject)

// Nested test case routes.
projectsRouter.use('/:projectId/test-cases', testCasesRouter)

// GET /api/projects/:projectId
projectsRouter.get('/:projectId', requireAuth, getProject)

// PATCH /api/projects/:projectId
projectsRouter.patch('/:projectId', requireAuth, validateBody(updateProjectSchema), updateProject)

// DELETE /api/projects/:projectId
projectsRouter.delete('/:projectId', requireAuth, deleteProject)
