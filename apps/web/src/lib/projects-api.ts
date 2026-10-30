export type Project = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  requirementCount: number
  testCaseCount: number
  analysisCount: number
}

export type CreatedProject = Project

export type CreateProjectInput = {
  name: string
  description: string
}

export type UpdateProjectInput = {
  name?: string
  description?: string
}

export class ApiRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

function getErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }

  if (!('error' in data)) {
    return undefined
  }

  const error = data.error

  if (!error || typeof error !== 'object') {
    return undefined
  }

  if (!('message' in error)) {
    return undefined
  }

  return typeof error.message === 'string' ? error.message : undefined
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      getErrorMessage(data) ?? `Request failed with HTTP ${response.status}.`,
    )
  }

  if (data === null) {
    throw new Error('The server returned invalid JSON.')
  }

  return data as T
}

// GET /api/projects
export async function getProjects(signal?: AbortSignal): Promise<Project[]> {
  const response = await fetch('/api/projects', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const data = await parseResponse<{
    projects: Project[]
  }>(response)

  return data.projects
}

// POST /api/projects
export async function createProject(input: CreateProjectInput): Promise<CreatedProject> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(input),
  })

  const data = await parseResponse<{
    project: Project
  }>(response)

  return data.project
}

// GET /api/projects/:projectId
export async function getProject(projectId: string, signal?: AbortSignal): Promise<Project> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const data = await parseResponse<{
    project: Project
  }>(response)

  return data.project
}

// PATCH /api/projects/:projectId
export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(input),
  })

  const data = await parseResponse<{
    project: Project
  }>(response)

  return data.project
}

// DELETE /api/projects/:projectId
export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    await parseResponse<unknown>(response)
  }

  // HTTP 204 has no response body.
}
