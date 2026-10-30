import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

type SaveSuggestionInput = {
  projectId: string
  analysisId: string
  suggestionId: string
  userId: string
}

function notFound(): AppError {
  return new AppError(404, 'SUGGESTION_NOT_FOUND', 'Analysis suggestion not found.')
}

function invalidLinks(): AppError {
  return new AppError(
    409,
    'SUGGESTION_REQUIREMENTS_CHANGED',
    'One or more linked requirements no longer exist. Run a new analysis.',
  )
}

function isUniqueError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

function formatTestCase<T extends { requirements: { requirementId: string }[] }>(record: T) {
  const { requirements, ...fields } = record

  return {
    ...fields,
    requirementIds: requirements.map((link) => link.requirementId),
  }
}

const testCaseInclude = {
  requirements: {
    select: {
      requirementId: true,
    },
  },
} as const

export async function saveAnalysisSuggestion({
  projectId,
  analysisId,
  suggestionId,
  userId,
}: SaveSuggestionInput) {
  // An explicit ownership check is required even for
  // requests attempting to reuse an existing suggestion.
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: {
      id: true,
    },
  })

  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const suggestion = await tx.analysisSuggestion.findFirst({
        where: {
          id: suggestionId,
          analysisRunId: analysisId,
          analysisRun: {
            projectId,
            project: {
              userId,
            },
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          steps: true,
          expectedResult: true,
          relatedRequirementIds: true,
          savedTestCase: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!suggestion) {
        throw notFound()
      }

      // Return the previously saved test case rather than
      // creating a duplicate.
      if (suggestion.savedTestCase) {
        const existing = await tx.testCase.findFirst({
          where: {
            id: suggestion.savedTestCase.id,
            projectId,
          },
          include: testCaseInclude,
        })

        if (existing) {
          return {
            testCase: formatTestCase(existing),
            alreadySaved: true,
          }
        }
      }

      const requirementIds = suggestion.relatedRequirementIds

      if (requirementIds.length === 0 || new Set(requirementIds).size !== requirementIds.length) {
        throw invalidLinks()
      }

      // Requirements may have been deleted since the
      // analysis was originally generated.
      const matchingRequirements = await tx.requirement.findMany({
        where: {
          projectId,
          id: {
            in: requirementIds,
          },
        },
        select: {
          id: true,
        },
      })

      if (matchingRequirements.length !== requirementIds.length) {
        throw invalidLinks()
      }

      const created = await tx.testCase.create({
        data: {
          projectId,
          title: suggestion.title,
          description: suggestion.description,
          type: suggestion.type,
          status: 'DRAFT',
          steps: suggestion.steps,
          expectedResult: suggestion.expectedResult,
          sourceSuggestionId: suggestion.id,
          requirements: {
            create: requirementIds.map((requirementId) => ({
              requirement: {
                connect: {
                  id: requirementId,
                },
              },
            })),
          },
        },
        include: testCaseInclude,
      })

      return {
        testCase: formatTestCase(created),
        alreadySaved: false,
      }
    })
  } catch (error: unknown) {
    // If two concurrent requests try to save the same
    // suggestion, the sourceSuggestionId unique constraint
    // allows only one creation.
    if (isUniqueError(error)) {
      const existing = await prisma.testCase.findFirst({
        where: {
          projectId,
          sourceSuggestionId: suggestionId,
        },
        include: testCaseInclude,
      })

      if (existing) {
        return {
          testCase: formatTestCase(existing),
          alreadySaved: true,
        }
      }
    }

    throw error
  }
}
