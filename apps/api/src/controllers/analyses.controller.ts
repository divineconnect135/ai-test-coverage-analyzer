import type { Request, RequestHandler, Response } from 'express'

import { AppError } from '../errors/AppError.js'
import { runProjectAnalysis } from '../services/analysis.service.js'
import { saveAnalysisSuggestion } from '../services/save-suggestion.service.js'

function getAuthenticatedUserId(res: Response): string {
  const user = res.locals.authUser as { id?: unknown } | undefined

  if (typeof user?.id !== 'string' || !user.id) {
    throw new AppError(401, 'UNAUTHORIZED', 'You must be signed in.')
  }

  return user.id
}

function getRouteParam(req: Request, paramName: string): string {
  const value = req.params[paramName]

  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found.')
  }

  return value
}

// POST /api/projects/:projectId/analyses
export const analyzeProject: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res)
  const projectId = getRouteParam(req, 'projectId')

  const analysis = await runProjectAnalysis(projectId, userId)

  res.status(201).json({
    analysis,
  })
}

// POST /api/projects/:projectId/analyses/
//      :analysisId/suggestions/:suggestionId/save
export const saveSuggestionAsTestCase: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res)
  const projectId = getRouteParam(req, 'projectId')
  const analysisId = getRouteParam(req, 'analysisId')
  const suggestionId = getRouteParam(req, 'suggestionId')

  const result = await saveAnalysisSuggestion({
    projectId,
    analysisId,
    suggestionId,
    userId,
  })

  res.status(result.alreadySaved ? 200 : 201).json(result)
}
