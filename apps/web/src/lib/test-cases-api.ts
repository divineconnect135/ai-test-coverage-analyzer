export const TEST_CASE_TYPES = ['POSITIVE', 'NEGATIVE', 'EDGE_CASE', 'SECURITY', 'OTHER'] as const

export const TEST_CASE_STATUSES = ['DRAFT', 'READY', 'COMPLETED'] as const

export type TestCaseType = (typeof TEST_CASE_TYPES)[number]

export type TestCaseStatus = (typeof TEST_CASE_STATUSES)[number]

export type TestCase = {
  id: string
  projectId: string
  title: string
  description: string
  type: TestCaseType
  status: TestCaseStatus
  steps: string[]
  expectedResult: string
  requirementIds: string[]
  sourceSuggestionId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateTestCaseInput = {
  title: string
  description: string
  type: TestCaseType
  status: TestCaseStatus
  steps: string[]
  expectedResult: string
  requirementIds: string[]
}

export type UpdateTestCaseInput = Partial<CreateTestCaseInput>

export class TestCaseApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'TestCaseApiError'
    this.status = status
  }
}

function getErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('error' in data)) {
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
    throw new TestCaseApiError(
      response.status,
      getErrorMessage(data) ?? `Request failed with HTTP ${response.status}.`,
    )
  }

  if (data === null) {
    throw new Error('The server returned invalid JSON.')
  }

  return data as T
}

function basePath(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/test-cases`
}

function testCasePath(projectId: string, testCaseId: string): string {
  return `${basePath(projectId)}/${encodeURIComponent(testCaseId)}`
}

export async function getTestCases(projectId: string, signal?: AbortSignal): Promise<TestCase[]> {
  const response = await fetch(basePath(projectId), {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  const data = await parseResponse<{
    testCases: TestCase[]
  }>(response)

  return data.testCases
}

export async function getTestCase(projectId: string, testCaseId: string): Promise<TestCase> {
  const response = await fetch(testCasePath(projectId, testCaseId), {
    credentials: 'same-origin',
    cache: 'no-store',
  })

  const data = await parseResponse<{
    testCase: TestCase
  }>(response)

  return data.testCase
}

export async function createTestCase(
  projectId: string,
  input: CreateTestCaseInput,
): Promise<TestCase> {
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
    testCase: TestCase
  }>(response)

  return data.testCase
}

export async function updateTestCase(
  projectId: string,
  testCaseId: string,
  input: UpdateTestCaseInput,
): Promise<TestCase> {
  const response = await fetch(testCasePath(projectId, testCaseId), {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(input),
  })

  const data = await parseResponse<{
    testCase: TestCase
  }>(response)

  return data.testCase
}

export async function deleteTestCase(projectId: string, testCaseId: string): Promise<void> {
  const response = await fetch(testCasePath(projectId, testCaseId), {
    method: 'DELETE',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    await parseResponse<unknown>(response)
  }

  // HTTP 204 has no response body.
}
