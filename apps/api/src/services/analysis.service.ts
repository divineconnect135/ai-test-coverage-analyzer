import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

import { getAiConfig, type AiConfig } from '../config/ai.js'

import { validateAiAnalysis, type AnalysisInput } from '../ai/analysis.schema.js'

import { createAiProvider, type AiProvider } from '../ai/providers.js'

type RunOptions = {
  provider?: AiProvider
  config?: AiConfig
}

// Prevent duplicate concurrent runs within this API process.
const activeProjects = new Set<string>()

function failureCode(error: unknown): string {
  return error instanceof AppError ? error.code : 'AI_ANALYSIS_FAILED'
}

function safeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  return new AppError(502, 'AI_ANALYSIS_FAILED', 'The analysis could not be completed.')
}

export async function runProjectAnalysis(
  projectId: string,
  userId: string,
  options: RunOptions = {},
) {
  const config = options.config ?? getAiConfig()
  const activeKey = `${userId}:${projectId}`

  if (activeProjects.has(activeKey)) {
    throw new AppError(
      409,
      'ANALYSIS_ALREADY_RUNNING',
      'An analysis is already running for this project.',
    )
  }

  activeProjects.add(activeKey)

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    })

    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
    }

    const now = new Date()

    const startOfDay = new Date(now)
    startOfDay.setUTCHours(0, 0, 0, 0)

    const startOfHour = new Date(now.getTime() - 60 * 60 * 1000)

    // Recover pending records left behind by an interrupted
    // server process, after a conservative timeout.
    const staleBefore = new Date(now.getTime() - Math.max(config.AI_TIMEOUT_MS * 2, 120000))

    await prisma.analysisRun.updateMany({
      where: {
        projectId,
        status: 'PENDING',
        createdAt: {
          lt: staleBefore,
        },
      },
      data: {
        status: 'FAILED',
        errorCode: 'AI_STALE_RUN',
        completedAt: now,
      },
    })

    const pendingRun = await prisma.analysisRun.findFirst({
      where: {
        projectId,
        status: 'PENDING',
      },
      select: {
        id: true,
      },
    })

    if (pendingRun) {
      throw new AppError(
        409,
        'ANALYSIS_ALREADY_RUNNING',
        'An analysis is already running for this project.',
      )
    }

    // Database-backed request counts include failed runs.
    // This prevents unlimited retries from bypassing limits.
    const [userRequests, globalRequests] = await Promise.all([
      prisma.analysisRun.count({
        where: {
          project: {
            userId,
          },
          createdAt: {
            gte: startOfDay,
          },
        },
      }),

      prisma.analysisRun.count({
        where: {
          createdAt: {
            gte: startOfHour,
          },
        },
      }),
    ])

    if (userRequests >= config.AI_MAX_REQUESTS_PER_USER_PER_DAY) {
      throw new AppError(429, 'AI_USER_LIMIT', 'You have reached your daily AI analysis limit.')
    }

    if (globalRequests >= config.AI_GLOBAL_REQUESTS_PER_HOUR) {
      throw new AppError(
        429,
        'AI_GLOBAL_LIMIT',
        'AI analysis is temporarily unavailable due to usage limits.',
      )
    }

    const [requirements, testCases] = await Promise.all([
      prisma.requirement.findMany({
        where: { projectId },
        orderBy: { code: 'asc' },
        take: config.AI_MAX_REQUIREMENTS + 1,
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
        },
      }),

      prisma.testCase.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        take: config.AI_MAX_TEST_CASES + 1,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          steps: true,
          expectedResult: true,
          requirements: {
            select: {
              requirementId: true,
            },
          },
        },
      }),
    ])

    if (requirements.length === 0) {
      throw new AppError(
        400,
        'NO_REQUIREMENTS',
        'Add at least one requirement before running an analysis.',
      )
    }

    if (
      requirements.length > config.AI_MAX_REQUIREMENTS ||
      testCases.length > config.AI_MAX_TEST_CASES
    ) {
      throw new AppError(
        413,
        'AI_INPUT_LIMIT',
        'This project exceeds the configured analysis record limits.',
      )
    }

    const input: AnalysisInput = {
      project,

      requirements,

      testCases: testCases.map(({ requirements: links, ...testCase }) => ({
        ...testCase,
        requirementIds: links.map((link) => link.requirementId),
      })),
    }

    const snapshotSize = JSON.stringify(input).length

    if (snapshotSize > config.AI_MAX_INPUT_CHARS) {
      throw new AppError(
        413,
        'AI_INPUT_TOO_LARGE',
        'The project content exceeds the AI input size limit.',
      )
    }

    // Persist a snapshot BEFORE making the provider request.
    const run = await prisma.analysisRun.create({
      data: {
        projectId,
        status: 'PENDING',
        inputSnapshot: input,
      },
    })

    try {
      const provider = options.provider ?? createAiProvider(config)

      const providerResult = await provider.analyze(input, config)

      const result = validateAiAnalysis(providerResult.output, input, config.AI_MAX_SUGGESTIONS)

      // Both the completed run and its suggestions are
      // written atomically.
      const completedRun = await prisma.$transaction(async (tx) => {
        await tx.analysisRun.update({
          where: {
            id: run.id,
          },
          data: {
            status: 'COMPLETED',
            model: providerResult.model,
            resultSummary: result.summary,

            requirementAssessments: result.requirementAssessments,

            limitations: result.limitations,

            inputTokens: providerResult.usage?.inputTokens ?? null,

            outputTokens: providerResult.usage?.outputTokens ?? null,

            completedAt: new Date(),
            errorCode: null,
          },
        })

        if (result.suggestions.length > 0) {
          await tx.analysisSuggestion.createMany({
            data: result.suggestions.map((suggestion) => ({
              analysisRunId: run.id,
              title: suggestion.title,
              description: suggestion.description,
              type: suggestion.type,
              priority: suggestion.priority,
              reason: suggestion.reason,
              steps: suggestion.steps,
              expectedResult: suggestion.expectedResult,

              relatedRequirementIds: suggestion.relatedRequirementIds,
            })),
          })
        }

        return tx.analysisRun.findUniqueOrThrow({
          where: {
            id: run.id,
          },
          include: {
            suggestions: true,
          },
        })
      })

      return completedRun
    } catch (error: unknown) {
      // A failed provider call or invalid response must never
      // leave the run marked COMPLETED.
      try {
        await prisma.analysisRun.update({
          where: {
            id: run.id,
          },
          data: {
            status: 'FAILED',
            errorCode: failureCode(error),
            completedAt: new Date(),
          },
        })
      } catch {
        // Preserve the original failure. Operational logging
        // can investigate a database failure separately.
      }

      throw safeError(error)
    }
  } finally {
    activeProjects.delete(activeKey)
  }
}
