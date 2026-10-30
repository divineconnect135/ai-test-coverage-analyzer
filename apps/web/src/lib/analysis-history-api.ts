import { AnalysisApiError, type AnalysisRun, type AnalysisSuggestion } from './analyses-api'

export type AnalysisHistoryItem = {
  id: string
  projectId: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  model: string | null
  resultSummary: string | null
  errorCode: string | null
  createdAt: string
  completedAt: string | null
  suggestionCount: number
}

export type HistoryPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type AnalysisHistoryResponse = {
  analyses: AnalysisHistoryItem[]
  pagination: HistoryPagination
}

export type SavedAnalysisSuggestion = AnalysisSuggestion & {
  savedTestCase: {
    id: string
  } | null
}

export type SavedAnalysis = Omit<AnalysisRun, 'suggestions'> & {
  suggestions: SavedAnalysisSuggestion[]
}

function basePath(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/analyses`
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    let message = `Request failed with HTTP ${response.status}.`
    let code: string | undefined

    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      data.error &&
      typeof data.error === 'object'
    ) {
      const error = data.error

      if ('message' in error && typeof error.message === 'string') {
        message = error.message
      }

      if ('code' in error && typeof error.code === 'string') {
        code = error.code
      }
    }

    throw new AnalysisApiError(response.status, message, code)
  }

  if (data === null) {
    throw new Error('The server returned invalid JSON.')
  }

  return data as T
}

// GET /api/projects/:projectId/analyses?page=N
export async function getAnalysisHistory(
  projectId: string,
  page = 1,
): Promise<AnalysisHistoryResponse> {
  const response = await fetch(`${basePath(projectId)}?page=${encodeURIComponent(page)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  return parseResponse<AnalysisHistoryResponse>(response)
}

// GET /api/projects/:projectId/analyses/:analysisId
export async function getSavedAnalysis(
  projectId: string,
  analysisId: string,
): Promise<SavedAnalysis> {
  const response = await fetch(`${basePath(projectId)}/${encodeURIComponent(analysisId)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  const data = await parseResponse<{
    analysis: SavedAnalysis
  }>(response)

  return data.analysis
}
