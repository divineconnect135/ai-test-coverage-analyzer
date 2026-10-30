export type Requirement = {
  id: string
  projectId: string
  code: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
}

export type CreateRequirementInput = {
  code: string
  title: string
  description: string
}

export type UpdateRequirementInput = Partial<CreateRequirementInput>

export class RequirementApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'RequirementApiError'
    this.status = status
  }
}

function extractError(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }

  if (!('error' in data)) {
    return undefined
  }

  const error = data.error

  if (!error || typeof error !== 'object' || !('message' in error)) {
    return undefined
  }

  return typeof error.message === 'string' ? error.message : undefined
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new RequirementApiError(
      response.status,
      extractError(data) ?? `Request failed with HTTP ${response.status}.`,
    )
  }

  if (data === null) {
    throw new Error('The server returned invalid JSON.')
  }

  return data as T
}

function basePath(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/requirements`
}

function requirementPath(projectId: string, requirementId: string): string {
  return `${basePath(projectId)}/${encodeURIComponent(requirementId)}`
}

export async function getRequirements(
  projectId: string,
  signal?: AbortSignal,
): Promise<Requirement[]> {
  const response = await fetch(basePath(projectId), {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const data = await parseResponse<{
    requirements: Requirement[]
  }>(response)

  return data.requirements
}

export async function getRequirement(
  projectId: string,
  requirementId: string,
): Promise<Requirement> {
  const response = await fetch(requirementPath(projectId, requirementId), {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  const data = await parseResponse<{
    requirement: Requirement
  }>(response)

  return data.requirement
}

export async function createRequirement(
  projectId: string,
  input: CreateRequirementInput,
): Promise<Requirement> {
  const response = await fetch(basePath(projectId), {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(input),
  })

  const data = await parseResponse<{
    requirement: Requirement
  }>(response)

  return data.requirement
}

export async function updateRequirement(
  projectId: string,
  requirementId: string,
  input: UpdateRequirementInput,
): Promise<Requirement> {
  const response = await fetch(requirementPath(projectId, requirementId), {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(input),
  })

  const data = await parseResponse<{
    requirement: Requirement
  }>(response)

  return data.requirement
}

export async function deleteRequirement(projectId: string, requirementId: string): Promise<void> {
  const response = await fetch(requirementPath(projectId, requirementId), {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    await parseResponse<unknown>(response)
  }

  // Successful deletion returns HTTP 204 with no JSON body.
}
