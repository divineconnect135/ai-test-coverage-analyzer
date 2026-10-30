import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
  },
  analysisRun: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: db,
}))

import {
  getSavedAnalysis,
  listAnalysisHistory,
} from '../src/controllers/analysis-history.controller.js'

import { errorHandler } from '../src/middleware/errorHandler.js'

const app = express()
app.use(express.json())

// Simulate an identity verified by Better Auth.
app.use((_req, res, next) => {
  res.locals.authUser = {
    id: 'owner-123',
  }

  next()
})

const base = '/projects/:projectId/analyses'

app.get(base, listAnalysisHistory)
app.get(`${base}/:analysisId`, getSavedAnalysis)

app.use(errorHandler)

const summary = {
  id: 'analysis-123',
  projectId: 'project-123',
  status: 'COMPLETED',
  model: 'mock-coverage-v1',
  resultSummary: 'One potential coverage gap.',
  errorCode: null,
  createdAt: new Date('2026-10-30T12:00:00Z'),
  completedAt: new Date('2026-10-30T12:01:00Z'),
  _count: {
    suggestions: 1,
  },
}

const detailedRun = {
  id: 'analysis-123',
  projectId: 'project-123',
  status: 'COMPLETED',
  model: 'mock-coverage-v1',
  resultSummary: 'One potential coverage gap.',
  errorCode: null,
  createdAt: new Date('2026-10-30T12:00:00Z'),
  completedAt: new Date('2026-10-30T12:01:00Z'),
  inputTokens: null,
  outputTokens: null,

  inputSnapshot: {
    project: {
      id: 'project-123',
      name: 'Example Project',
      description: '',
    },
    requirements: [
      {
        id: 'req-123',
        code: 'AUTH-001',
        title: 'User Login',
        description: 'Users can log in.',
      },
    ],
    testCases: [],
  },

  requirementAssessments: [
    {
      requirementId: 'req-123',
      assessment: 'POTENTIAL_GAP',
      relatedExistingTestIds: [],
      explanation: 'No linked test was found.',
    },
  ],

  limitations: [
    {
      description: 'Tests were not executed.',
    },
  ],

  suggestions: [
    {
      id: 'suggestion-123',
      analysisRunId: 'analysis-123',
      title: 'Test successful login',
      description: 'Verify valid credentials.',
      type: 'POSITIVE',
      priority: 'MEDIUM',
      reason: 'No existing linked test.',
      steps: ['Open login', 'Sign in'],
      expectedResult: 'User reaches dashboard.',
      relatedRequirementIds: ['req-123'],
      createdAt: new Date('2026-10-30T12:01:00Z'),
      savedTestCase: null,
    },
  ],
}

beforeEach(() => {
  vi.resetAllMocks()

  db.project.findFirst.mockResolvedValue({
    id: 'project-123',
  })

  db.analysisRun.findMany.mockResolvedValue([summary])
  db.analysisRun.count.mockResolvedValue(1)
  db.analysisRun.findFirst.mockResolvedValue(detailedRun)
})

describe('Analysis history API', () => {
  it('lists only analyses from an owned project', async () => {
    const response = await request(app).get('/projects/project-123/analyses')

    expect(response.status).toBe(200)
    expect(response.body.analyses).toHaveLength(1)
    expect(response.body.analyses[0].suggestionCount).toBe(1)

    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        userId: 'owner-123',
      },
      select: {
        id: true,
      },
    })

    expect(db.analysisRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project-123',
          project: {
            userId: 'owner-123',
          },
        },
        take: 10,
        skip: 0,
      }),
    )
  })

  it('paginates history using ten records per page', async () => {
    db.analysisRun.count.mockResolvedValue(24)

    const response = await request(app).get('/projects/project-123/analyses?page=2')

    expect(response.status).toBe(200)

    expect(response.body.pagination).toEqual({
      page: 2,
      pageSize: 10,
      totalItems: 24,
      totalPages: 3,
    })

    expect(db.analysisRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    )
  })

  it('rejects invalid page parameters', async () => {
    const response = await request(app).get('/projects/project-123/analyses?page=invalid')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_PAGE')
    expect(db.analysisRun.findMany).not.toHaveBeenCalled()
  })

  it('prevents access to other users projects', async () => {
    db.project.findFirst.mockResolvedValue(null)

    const response = await request(app).get('/projects/foreign-project/analyses')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND')

    expect(db.analysisRun.findMany).not.toHaveBeenCalled()
  })

  it('loads a saved analysis with its snapshot', async () => {
    const response = await request(app).get('/projects/project-123/analyses/analysis-123')

    expect(response.status).toBe(200)
    expect(response.body.analysis.id).toBe('analysis-123')

    expect(response.body.analysis.inputSnapshot.requirements).toHaveLength(1)

    expect(response.body.analysis.suggestions).toHaveLength(1)

    expect(db.analysisRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'analysis-123',
          projectId: 'project-123',
          project: {
            userId: 'owner-123',
          },
        },
      }),
    )
  })

  it('does not expose an analysis from another project', async () => {
    db.analysisRun.findFirst.mockResolvedValue(null)

    const response = await request(app).get('/projects/project-123/analyses/foreign-analysis')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ANALYSIS_NOT_FOUND')
  })

  it('supports an empty history', async () => {
    db.analysisRun.findMany.mockResolvedValue([])
    db.analysisRun.count.mockResolvedValue(0)

    const response = await request(app).get('/projects/project-123/analyses')

    expect(response.status).toBe(200)
    expect(response.body.analyses).toEqual([])
    expect(response.body.pagination.totalItems).toBe(0)
    expect(response.body.pagination.totalPages).toBe(0)
  })
})
