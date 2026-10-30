import { Router } from 'express'

import { requireAuth } from '../middleware/requireAuth.js'

import { analyzeProject, saveSuggestionAsTestCase } from '../controllers/analyses.controller.js'

import {
  getSavedAnalysis,
  listAnalysisHistory,
} from '../controllers/analysis-history.controller.js'

export const analysesRouter = Router({
  mergeParams: true,
})

// Every analysis route requires authentication.
analysesRouter.use(requireAuth)

// POST: Run a new AI analysis.
analysesRouter.post('/', analyzeProject)

// GET: List saved runs, newest first.
analysesRouter.get('/', listAnalysisHistory)

// GET: Open one previous analysis.
analysesRouter.get('/:analysisId', getSavedAnalysis)

// POST: Save an AI suggestion as a real test case.
analysesRouter.post('/:analysisId/suggestions/:suggestionId/save', saveSuggestionAsTestCase)
