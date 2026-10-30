import { Router } from 'express'

import {
  createTestCase,
  deleteTestCase,
  getTestCase,
  listTestCases,
  updateTestCase,
} from '../controllers/test-cases.controller.js'

import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validateBody.js'

import { createTestCaseSchema, updateTestCaseSchema } from '../schemas/test-case.schema.js'

export const testCasesRouter = Router({
  mergeParams: true,
})

testCasesRouter.use(requireAuth)

testCasesRouter.get('/', listTestCases)

testCasesRouter.post('/', validateBody(createTestCaseSchema), createTestCase)

testCasesRouter.get('/:testCaseId', getTestCase)

testCasesRouter.patch('/:testCaseId', validateBody(updateTestCaseSchema), updateTestCase)

testCasesRouter.delete('/:testCaseId', deleteTestCase)
