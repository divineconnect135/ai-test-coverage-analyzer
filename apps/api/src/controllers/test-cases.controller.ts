import type { Request, RequestHandler, Response } from 'express'

import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

import type { CreateTestCaseInput, UpdateTestCaseInput } from '../schemas/test-case.schema.js'

const testCaseInclude = {
  requirements: {
    select: {
      requirementId: true,
    },
  },
} as const

type TestCaseRecord = {
  id: string
  projectId: string
  title: string
  description: string
  type: string
  status: string
  steps: string[]
  expectedResult: string
  sourceSuggestionId: string | null
  createdAt: Date
  updatedAt: Date
  requirements: Array<{
    requirementId: string
  }>
}

function formatTestCase(record: TestCaseRecord) {
  const { requirements, ...testCase } = record

  return {
    ...testCase,
    requirementIds: requirements.map((link) => link.requirementId),
  }
}

function getUserId(res: Response): string {
  const user = res.locals.authUser as { id?: unknown } | undefined

  if (typeof user?.id !== 'string' || !user.id) {
    throw new AppError(401, 'UNAUTHORIZED', 'You must be signed in.')
  }

  return user.id
}

function getParam(req: Request, key: string): string {
  const value = req.params[key]

  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found.')
  }

  return value
}

function testCaseNotFound(): AppError {
  return new AppError(404, 'TEST_CASE_NOT_FOUND', 'Test case not found.')
}

function invalidRequirementLinks(): AppError {
  return new AppError(
    400,
    'INVALID_REQUIREMENT_LINKS',
    'All linked requirements must belong to this project.',
  )
}

async function assertProjectOwner(projectId: string, userId: string): Promise<void> {
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
}

// GET /api/projects/:projectId/test-cases
export const listTestCases: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')

  await assertProjectOwner(projectId, userId)

  const testCases = await prisma.testCase.findMany({
    where: { projectId },
    include: testCaseInclude,
    orderBy: {
      updatedAt: 'desc',
    },
  })

  res.status(200).json({
    testCases: testCases.map(formatTestCase),
  })
}

// POST /api/projects/:projectId/test-cases
export const createTestCase: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const input = req.body as CreateTestCaseInput

  await assertProjectOwner(projectId, userId)

  const { requirementIds, ...fields } = input

  const testCase = await prisma.$transaction(async (tx) => {
    if (requirementIds.length > 0) {
      const matches = await tx.requirement.findMany({
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

      if (matches.length !== requirementIds.length) {
        throw invalidRequirementLinks()
      }
    }

    return tx.testCase.create({
      data: {
        projectId,
        ...fields,
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
  })

  res.status(201).json({
    testCase: formatTestCase(testCase),
  })
}

// GET /api/projects/:projectId/test-cases/:testCaseId
export const getTestCase: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const testCaseId = getParam(req, 'testCaseId')

  await assertProjectOwner(projectId, userId)

  const testCase = await prisma.testCase.findFirst({
    where: {
      id: testCaseId,
      projectId,
    },
    include: testCaseInclude,
  })

  if (!testCase) {
    throw testCaseNotFound()
  }

  res.status(200).json({
    testCase: formatTestCase(testCase),
  })
}

// PATCH /api/projects/:projectId/test-cases/:testCaseId
export const updateTestCase: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const testCaseId = getParam(req, 'testCaseId')
  const input = req.body as UpdateTestCaseInput

  await assertProjectOwner(projectId, userId)

  const { requirementIds, ...fields } = input

  const testCase = await prisma.$transaction(async (tx) => {
    const existing = await tx.testCase.findFirst({
      where: {
        id: testCaseId,
        projectId,
      },
      select: {
        id: true,
      },
    })

    if (!existing) {
      throw testCaseNotFound()
    }

    if (requirementIds !== undefined) {
      if (requirementIds.length > 0) {
        const matches = await tx.requirement.findMany({
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

        if (matches.length !== requirementIds.length) {
          throw invalidRequirementLinks()
        }
      }
    }

    const result = await tx.testCase.updateMany({
      where: {
        id: testCaseId,
        projectId,
      },
      data: fields,
    })

    if (result.count === 0) {
      throw testCaseNotFound()
    }

    // Replacing links is optional. If requirementIds is omitted,
    // the existing links remain unchanged.
    if (requirementIds !== undefined) {
      await tx.testCaseRequirement.deleteMany({
        where: {
          testCaseId,
        },
      })

      if (requirementIds.length > 0) {
        await tx.testCaseRequirement.createMany({
          data: requirementIds.map((requirementId) => ({
            testCaseId,
            requirementId,
          })),
        })
      }
    }

    const updated = await tx.testCase.findFirst({
      where: {
        id: testCaseId,
        projectId,
      },
      include: testCaseInclude,
    })

    if (!updated) {
      throw testCaseNotFound()
    }

    return updated
  })

  res.status(200).json({
    testCase: formatTestCase(testCase),
  })
}

// DELETE /api/projects/:projectId/test-cases/:testCaseId
export const deleteTestCase: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const testCaseId = getParam(req, 'testCaseId')

  await assertProjectOwner(projectId, userId)

  const result = await prisma.testCase.deleteMany({
    where: {
      id: testCaseId,
      projectId,
    },
  })

  if (result.count === 0) {
    throw testCaseNotFound()
  }

  res.status(204).send()
}
