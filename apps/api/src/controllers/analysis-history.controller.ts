import type { Request, RequestHandler, Response } from 'express'

import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

const PAGE_SIZE = 10

function getUserId(res: Response): string {
  const user = res.locals.authUser as { id?: unknown } | undefined

  if (typeof user?.id !== 'string' || !user.id) {
    throw new AppError(401, 'UNAUTHORIZED', 'You must be signed in.')
  }

  return user.id
}

function getParam(req: Request, name: string): string {
  const value = req.params[name]

  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found.')
  }

  return value
}

function readPage(value: unknown): number {
  if (value === undefined) return 1

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new AppError(400, 'INVALID_PAGE', 'Page must be a positive integer.')
  }

  const page = Number(value)

  if (!Number.isSafeInteger(page) || page > 10000) {
    throw new AppError(400, 'INVALID_PAGE', 'Page is outside the supported range.')
  }

  return page
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

// GET /api/projects/:projectId/analyses?page=1
export const listAnalysisHistory: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const page = readPage(req.query.page)

  await assertProjectOwner(projectId, userId)

  const where = {
    projectId,
    project: {
      userId,
    },
  }

  const [runs, totalItems] = await Promise.all([
    prisma.analysisRun.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        projectId: true,
        status: true,
        model: true,
        resultSummary: true,
        errorCode: true,
        createdAt: true,
        completedAt: true,
        _count: {
          select: {
            suggestions: true,
          },
        },
      },
    }),

    prisma.analysisRun.count({
      where,
    }),
  ])

  res.status(200).json({
    analyses: runs.map(({ _count, ...run }) => ({
      ...run,
      suggestionCount: _count.suggestions,
    })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages: Math.ceil(totalItems / PAGE_SIZE),
    },
  })
}

// GET /api/projects/:projectId/analyses/:analysisId
export const getSavedAnalysis: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const analysisId = getParam(req, 'analysisId')

  await assertProjectOwner(projectId, userId)

  const analysis = await prisma.analysisRun.findFirst({
    where: {
      id: analysisId,
      projectId,
      project: {
        userId,
      },
    },
    include: {
      suggestions: {
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          savedTestCase: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  })

  if (!analysis) {
    throw new AppError(404, 'ANALYSIS_NOT_FOUND', 'Analysis not found.')
  }

  res.status(200).json({
    analysis,
  })
}
