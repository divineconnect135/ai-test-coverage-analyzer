import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
  },
  analysisSuggestion: {
    findFirst: vi.fn(),
  },
  requirement: {
    findMany: vi.fn(),
  },
  testCase: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    ...db,
    $transaction: async <T>(callback: (tx: typeof db) => Promise<T>): Promise<T> => callback(db),
  },
}))

import { saveAnalysisSuggestion } from '../src/services/save-suggestion.service.js'

const requestInput = {
  projectId: 'project-1',
  analysisId: 'analysis-1',
  suggestionId: 'suggestion-1',
  userId: 'user-1',
}

const suggestion = {
  id: 'suggestion-1',
  title: 'Login with incorrect password',
  description: 'Verify invalid credentials are rejected.',
  type: 'NEGATIVE',
  steps: ['Open the login page.', 'Enter an incorrect password.', 'Submit the login form.'],
  expectedResult: 'Authentication is rejected.',
  relatedRequirementIds: ['requirement-1'],
  savedTestCase: null,
}

const savedTestCase = {
  id: 'test-case-1',
  projectId: 'project-1',
  title: suggestion.title,
  description: suggestion.description,
  type: 'NEGATIVE',
  status: 'DRAFT',
  steps: suggestion.steps,
  expectedResult: suggestion.expectedResult,
  sourceSuggestionId: suggestion.id,
  createdAt: new Date('2026-10-30T12:00:00Z'),
  updatedAt: new Date('2026-10-30T12:00:00Z'),
  requirements: [
    {
      requirementId: 'requirement-1',
    },
  ],
}

beforeEach(() => {
  vi.resetAllMocks()

  db.project.findFirst.mockResolvedValue({
    id: 'project-1',
  })

  db.analysisSuggestion.findFirst.mockResolvedValue(suggestion)

  db.requirement.findMany.mockResolvedValue([
    {
      id: 'requirement-1',
    },
  ])

  db.testCase.create.mockResolvedValue(savedTestCase)
})

describe('Save AI suggestion as test case', () => {
  it('verifies project ownership', async () => {
    await saveAnalysisSuggestion(requestInput)

    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-1',
        userId: 'user-1',
      },
      select: {
        id: true,
      },
    })
  })

  it('does not save to another user’s project', async () => {
    db.project.findFirst.mockResolvedValue(null)

    await expect(
      saveAnalysisSuggestion({
        ...requestInput,
        userId: 'unauthorized-user',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PROJECT_NOT_FOUND',
    })

    expect(db.testCase.create).not.toHaveBeenCalled()
  })

  it('scopes the suggestion to the analysis and owner', async () => {
    await saveAnalysisSuggestion(requestInput)

    expect(db.analysisSuggestion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'suggestion-1',
          analysisRunId: 'analysis-1',
          analysisRun: {
            projectId: 'project-1',
            project: {
              userId: 'user-1',
            },
          },
        },
      }),
    )
  })

  it('creates a DRAFT test case with requirement links', async () => {
    const result = await saveAnalysisSuggestion(requestInput)

    expect(result.alreadySaved).toBe(false)
    expect(result.testCase.requirementIds).toEqual(['requirement-1'])

    expect(db.testCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'project-1',
          title: suggestion.title,
          status: 'DRAFT',
          sourceSuggestionId: 'suggestion-1',
          requirements: {
            create: [
              {
                requirement: {
                  connect: {
                    id: 'requirement-1',
                  },
                },
              },
            ],
          },
        }),
      }),
    )
  })

  it('returns an existing saved test case', async () => {
    db.analysisSuggestion.findFirst.mockResolvedValue({
      ...suggestion,
      savedTestCase: {
        id: 'test-case-1',
      },
    })

    db.testCase.findFirst.mockResolvedValue(savedTestCase)

    const result = await saveAnalysisSuggestion(requestInput)

    expect(result.alreadySaved).toBe(true)
    expect(result.testCase.id).toBe('test-case-1')
    expect(db.testCase.create).not.toHaveBeenCalled()
  })

  it('rejects a suggestion belonging to another analysis', async () => {
    db.analysisSuggestion.findFirst.mockResolvedValue(null)

    await expect(saveAnalysisSuggestion(requestInput)).rejects.toMatchObject({
      statusCode: 404,
      code: 'SUGGESTION_NOT_FOUND',
    })

    expect(db.testCase.create).not.toHaveBeenCalled()
  })

  it('rejects removed requirement references', async () => {
    db.requirement.findMany.mockResolvedValue([])

    await expect(saveAnalysisSuggestion(requestInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'SUGGESTION_REQUIREMENTS_CHANGED',
    })

    expect(db.testCase.create).not.toHaveBeenCalled()
  })

  it('handles a concurrent duplicate-save attempt', async () => {
    db.testCase.create.mockRejectedValue({
      code: 'P2002',
    })

    db.testCase.findFirst.mockResolvedValue(savedTestCase)

    const result = await saveAnalysisSuggestion(requestInput)

    expect(result.alreadySaved).toBe(true)
    expect(result.testCase.id).toBe('test-case-1')
  })
})
