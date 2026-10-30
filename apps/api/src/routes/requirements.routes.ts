import { Router } from 'express'

import {
  createRequirement,
  deleteRequirement,
  getRequirement,
  listRequirements,
  updateRequirement,
} from '../controllers/requirements.controller.js'

import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validateBody.js'

import { createRequirementSchema, updateRequirementSchema } from '../schemas/requirement.schema.js'

// Preserve projectId from the parent URL.
export const requirementsRouter = Router({
  mergeParams: true,
})

// Every requirements endpoint requires a session.
requirementsRouter.use(requireAuth)

requirementsRouter.get('/', listRequirements)

requirementsRouter.post('/', validateBody(createRequirementSchema), createRequirement)

requirementsRouter.get('/:requirementId', getRequirement)

requirementsRouter.patch(
  '/:requirementId',
  validateBody(updateRequirementSchema),
  updateRequirement,
)

requirementsRouter.delete('/:requirementId', deleteRequirement)
