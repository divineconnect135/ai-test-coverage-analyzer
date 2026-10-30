import { Router } from 'express'

import { requireAuth } from '../middleware/requireAuth.js'

import { analyzeProject, saveSuggestionAsTestCase } from '../controllers/analyses.controller.js'

export const analysesRouter = Router({
  mergeParams: true,
})

// All analysis endpoints require authentication.
analysesRouter.use(requireAuth)

// Run a new analysis.
analysesRouter.post('/', analyzeProject)

// Save one suggestion as a real test case.
// Repeated requests return the existing test case.
analysesRouter.post('/:analysisId/suggestions/:suggestionId/save', saveSuggestionAsTestCase)
