import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
  },

  requirement: {
    findMany: vi.fn(),
  },

  testCase: {
    findMany: vi.fn(),
  },

  analysisRun: {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },

  analysisSuggestion: {
    createMany: vi.fn(),
  },
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    ...db,

    $transaction: async <T>(callback: (tx: typeof db) => Promise<T>): Promise<T> => callback(db),
  },
}))

import { getAiConfig } from '../src/config/ai.js'
import { AppError } from '../src/errors/AppError.js'

import { MockAiProvider, type AiProvider } from '../src/ai/providers.js'

import { validateAiAnalysis, type AnalysisInput } from '../src/ai/analysis.schema.js'

import { runProjectAnalysis } from '../src/services/analysis.service.js'

const config = {
  ...getAiConfig(),
  AI_PROVIDER: 'mock' as const,
  AI_MAX_REQUESTS_PER_USER_PER_DAY: 5,
  AI_GLOBAL_REQUESTS_PER_HOUR: 40,
  AI_MAX_REQUIREMENTS: 30,
  AI_MAX_TEST_CASES: 80,
  AI_MAX_INPUT_CHARS: 30000,
  AI_MAX_SUGGESTIONS: 8,
}

const requirement = {
  id: 'req-1',
  code: 'AUTH-001',
  title: 'User Login',
  description: 'Users can sign in with valid credentials.',
}

const testCase = {
  id: 'test-1',
  title: 'Successful Login',
  description: 'Test valid credentials.',
  type: 'POSITIVE',
  status: 'READY',
  steps: ['Open login page', 'Sign in'],
  expectedResult: 'User reaches dashboard.',
  requirements: [
    {
      requirementId: 'req-1',
    },
  ],
}

const validOutput = {
  summary: 'Reviewed the login requirement.',

  requirementAssessments: [
    {
      requirementId: 'req-1',
      assessment: 'POTENTIALLY_COVERED' as const,
      relatedExistingTestIds: ['test-1'],
      explanation: 'A linked login test exists, but its adequacy is unverified.',
    },
  ],

  suggestions: [
    {
      title: 'Login with invalid password',
      description: 'Verify invalid credentials are rejected.',
      type: 'NEGATIVE' as const,
      priority: 'HIGH' as const,
      relatedRequirementIds: ['req-1'],
      reason: 'Negative login behavior has not been tested.',
      steps: ['Open login page.', 'Enter incorrect credentials.', 'Submit the form.'],
      expectedResult: 'Authentication is rejected.',
    },
  ],

  limitations: [
    {
      description: 'No real test execution was performed.',
    },
  ],
}

const mockProvider: AiProvider = {
  analyze: vi.fn().mockResolvedValue({
    model: 'mock-test-model',
    output: validOutput,
  }),
}

beforeEach(() => {
  vi.resetAllMocks()

  db.project.findFirst.mockResolvedValue({
    id: 'project-1',
    name: 'Authentication Project',
    description: 'Testing login features.',
  })

  db.requirement.findMany.mockResolvedValue([requirement])

  db.testCase.findMany.mockResolvedValue([testCase])

  db.analysisRun.updateMany.mockResolvedValue({
    count: 0,
  })

  db.analysisRun.findFirst.mockResolvedValue(null)

  db.analysisRun.count.mockResolvedValue(0)

  db.analysisRun.create.mockResolvedValue({
    id: 'run-1',
    projectId: 'project-1',
    status: 'PENDING',
  })

  db.analysisRun.update.mockResolvedValue({
    id: 'run-1',
    status: 'COMPLETED',
  })

  db.analysisSuggestion.createMany.mockResolvedValue({
    count: 1,
  })

  db.analysisRun.findUniqueOrThrow.mockResolvedValue({
    id: 'run-1',
    projectId: 'project-1',
    status: 'COMPLETED',
    resultSummary: validOutput.summary,
    suggestions: validOutput.suggestions,
  })

  vi.mocked(mockProvider.analyze).mockResolvedValue({
    model: 'mock-test-model',
    output: validOutput,
  })
})

describe('Phase 9 analysis service', () => {
  it('checks ownership before loading project data', async () => {
    await runProjectAnalysis('project-1', 'user-1', {
      provider: mockProvider,
      config,
    })

    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-1',
        userId: 'user-1',
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    })
  })

  it('rejects a project owned by another user', async () => {
    db.project.findFirst.mockResolvedValue(null)

    await expect(
      runProjectAnalysis('project-1', 'user-2', {
        provider: mockProvider,
        config,
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PROJECT_NOT_FOUND',
    })

    expect(db.analysisRun.create).not.toHaveBeenCalled()
  })

  it('requires at least one requirement', async () => {
    db.requirement.findMany.mockResolvedValue([])

    await expect(
      runProjectAnalysis('project-1', 'user-1', {
        provider: mockProvider,
        config,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'NO_REQUIREMENTS',
    })

    expect(mockProvider.analyze).not.toHaveBeenCalled()
  })

  it('enforces daily AI request limits', async () => {
    db.analysisRun.count.mockResolvedValue(5)

    await expect(
      runProjectAnalysis('project-1', 'user-1', {
        provider: mockProvider,
        config,
      }),
    ).rejects.toMatchObject({
      statusCode: 429,
      code: 'AI_USER_LIMIT',
    })
  })

  it('saves the input snapshot and completed analysis', async () => {
    const analysis = await runProjectAnalysis('project-1', 'user-1', {
      provider: mockProvider,
      config,
    })

    expect(analysis.status).toBe('COMPLETED')

    expect(db.analysisRun.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        status: 'PENDING',
        inputSnapshot: expect.objectContaining({
          requirements: [requirement],
          testCases: [
            expect.objectContaining({
              id: 'test-1',
              requirementIds: ['req-1'],
            }),
          ],
        }),
      },
    })

    expect(db.analysisSuggestion.createMany).toHaveBeenCalled()

    expect(db.analysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          model: 'mock-test-model',
        }),
      }),
    )
  })

  it('rejects nonexistent requirement references', () => {
    const input: AnalysisInput = {
      project: {
        id: 'project-1',
        name: 'Authentication',
        description: '',
      },

      requirements: [requirement],

      testCases: [
        {
          id: 'test-1',
          title: 'Login Test',
          description: '',
          type: 'POSITIVE',
          status: 'READY',
          steps: [],
          expectedResult: '',
          requirementIds: ['req-1'],
        },
      ],
    }

    expect(() =>
      validateAiAnalysis(
        {
          ...validOutput,
          suggestions: [
            {
              ...validOutput.suggestions[0],
              relatedRequirementIds: ['nonexistent-id'],
            },
          ],
        },
        input,
        8,
      ),
    ).toThrow(AppError)
  })

  it('marks invalid AI results as failed', async () => {
    vi.mocked(mockProvider.analyze).mockResolvedValue({
      model: 'mock-test-model',

      output: {
        ...validOutput,
        requirementAssessments: [],
      },
    })

    await expect(
      runProjectAnalysis('project-1', 'user-1', {
        provider: mockProvider,
        config,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: 'AI_INVALID_RESPONSE',
    })

    expect(db.analysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorCode: 'AI_INVALID_RESPONSE',
        }),
      }),
    )

    expect(db.analysisSuggestion.createMany).not.toHaveBeenCalled()
  })

  it('handles provider failures without a completed run', async () => {
    vi.mocked(mockProvider.analyze).mockRejectedValue(
      new AppError(503, 'AI_CONNECTION_ERROR', 'Unable to reach the AI provider.'),
    )

    await expect(
      runProjectAnalysis('project-1', 'user-1', {
        provider: mockProvider,
        config,
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'AI_CONNECTION_ERROR',
    })

    expect(db.analysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      }),
    )
  })

  it('runs the deterministic mock provider without OpenAI', async () => {
    const provider = new MockAiProvider()

    const result = await provider.analyze(
      {
        project: {
          id: 'project-1',
          name: 'Example',
          description: '',
        },

        requirements: [requirement],

        testCases: [],
      },
      config,
    )

    expect(result.model).toBe('mock-coverage-v1')

    const output = result.output as {
      suggestions: unknown[]
    }

    expect(output.suggestions).toHaveLength(1)
  })
})
