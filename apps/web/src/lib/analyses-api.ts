import type { TestCase } from './test-cases-api'

export type RequirementAssessment = {
  requirementId: string
  assessment: 'POTENTIALLY_COVERED' | 'POTENTIAL_GAP' | 'UNCERTAIN'
  relatedExistingTestIds: string[]
  explanation: string
}

export type AnalysisLimitation = {
  description: string
}

export type AnalysisSuggestion = {
  id: string
  analysisRunId: string
  title: string
  description: string
  type: 'POSITIVE' | 'NEGATIVE' | 'EDGE_CASE' | 'SECURITY' | 'OTHER'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  reason: string
  steps: string[]
  expectedResult: string
  relatedRequirementIds: string[]
  createdAt: string
}

export type AnalysisRun = {
  id: string
  projectId: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  model: string | null
  inputSnapshot: unknown
  resultSummary: string | null
  requirementAssessments: RequirementAssessment[] | null
  limitations: AnalysisLimitation[] | null
  suggestions: AnalysisSuggestion[]
  errorCode: string | null
  inputTokens: number | null
  outputTokens: number | null
  createdAt: string
  completedAt: string | null
}

export type SaveSuggestionResult = {
  testCase: TestCase
  alreadySaved: boolean
}

export class AnalysisApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'AnalysisApiError'
    this.status = status
    this.code = code
  }
}

function readApiError(data: unknown): {
  message?: string
  code?: string
} {
  if (!data || typeof data !== 'object' || !('error' in data)) {
    return {}
  }

  const error = data.error

  if (!error || typeof error !== 'object') {
    return {}
  }

  return {
    message: 'message' in error && typeof error.message === 'string' ? error.message : undefined,

    code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = readApiError(data)

    throw new AnalysisApiError(
      response.status,
      error.message ?? `Request failed with HTTP ${response.status}.`,
      error.code,
    )
  }

  if (data === null) {
    throw new Error('The server returned invalid JSON.')
  }

  return data as T
}

function analysisPath(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/analyses`
}

// POST /api/projects/:projectId/analyses
export async function runAnalysis(projectId: string): Promise<AnalysisRun> {
  const response = await fetch(analysisPath(projectId), {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  })

  const data = await parseJson<{
    analysis: AnalysisRun
  }>(response)

  return data.analysis
}

// POST /api/projects/:projectId/analyses/:analysisId/
//      suggestions/:suggestionId/save
export async function saveSuggestion(
  projectId: string,
  analysisId: string,
  suggestionId: string,
): Promise<SaveSuggestionResult> {
  const url =
    `${analysisPath(projectId)}` +
    `/${encodeURIComponent(analysisId)}` +
    `/suggestions/${encodeURIComponent(suggestionId)}/save`

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  })

  return parseJson<SaveSuggestionResult>(response)
}
