import express from 'express'
import request from 'supertest'
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
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  testCaseRequirement: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    ...db,
    $transaction: <T>(callback: (tx: typeof db) => Promise<T>): Promise<T> => callback(db),
  },
}))

import {
  createTestCase,
  deleteTestCase,
  getTestCase,
  listTestCases,
  updateTestCase,
} from '../src/controllers/test-cases.controller.js'

import { validateBody } from '../src/middleware/validateBody.js'
import { errorHandler } from '../src/middleware/errorHandler.js'

import { createTestCaseSchema, updateTestCaseSchema } from '../src/schemas/test-case.schema.js'

const app = express()
app.use(express.json())

// Simulated identity, already verified by Better Auth.
app.use((_req, res, next) => {
  res.locals.authUser = {
    id: 'owner-123',
  }
  next()
})

const base = '/projects/:projectId/test-cases'

app.get(base, listTestCases)

app.post(base, validateBody(createTestCaseSchema), createTestCase)

app.get(`${base}/:testCaseId`, getTestCase)

app.patch(`${base}/:testCaseId`, validateBody(updateTestCaseSchema), updateTestCase)

app.delete(`${base}/:testCaseId`, deleteTestCase)

app.use(errorHandler)

const exampleTestCase = {
  id: 'test-123',
  projectId: 'project-123',
  title: 'Successful Login',
  description: 'Verify login with valid credentials.',
  type: 'POSITIVE',
  status: 'READY',
  steps: ['Open login page', 'Enter credentials', 'Submit'],
  expectedResult: 'The dashboard is displayed.',
  sourceSuggestionId: null,
  createdAt: new Date('2026-10-30T10:00:00Z'),
  updatedAt: new Date('2026-10-30T10:00:00Z'),
  requirements: [
    {
      requirementId: 'requirement-123',
    },
  ],
}

const newTestCase = {
  title: 'Successful Login',
  description: 'Verify valid credentials.',
  type: 'POSITIVE',
  status: 'READY',
  steps: ['Enter credentials', 'Submit'],
  expectedResult: 'Dashboard opens.',
  requirementIds: ['requirement-123'],
}

beforeEach(() => {
  vi.resetAllMocks()

  db.project.findFirst.mockResolvedValue({
    id: 'project-123',
  })

  db.requirement.findMany.mockResolvedValue([{ id: 'requirement-123' }])
})

describe('Test Case CRUD', () => {
  it('lists only test cases in an owned project', async () => {
    db.testCase.findMany.mockResolvedValue([exampleTestCase])

    const response = await request(app).get('/projects/project-123/test-cases')

    expect(response.status).toBe(200)
    expect(response.body.testCases).toHaveLength(1)

    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        userId: 'owner-123',
      },
      select: {
        id: true,
      },
    })

    expect(db.testCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'project-123' },
      }),
    )
  })

  it('rejects an unowned project', async () => {
    db.project.findFirst.mockResolvedValue(null)

    const response = await request(app).get('/projects/foreign-project/test-cases')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND')
    expect(db.testCase.findMany).not.toHaveBeenCalled()
  })

  it('creates a test case with valid requirement links', async () => {
    db.testCase.create.mockResolvedValue(exampleTestCase)

    const response = await request(app).post('/projects/project-123/test-cases').send(newTestCase)

    expect(response.status).toBe(201)
    expect(response.body.testCase.requirementIds).toEqual(['requirement-123'])

    expect(db.testCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'project-123',
          title: 'Successful Login',
          requirements: {
            create: [
              {
                requirement: {
                  connect: {
                    id: 'requirement-123',
                  },
                },
              },
            ],
          },
        }),
      }),
    )
  })

  it('rejects links to requirements outside the project', async () => {
    db.requirement.findMany.mockResolvedValue([])

    const response = await request(app).post('/projects/project-123/test-cases').send(newTestCase)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_REQUIREMENT_LINKS')
    expect(db.testCase.create).not.toHaveBeenCalled()
  })

  it('rejects duplicate linked requirement IDs', async () => {
    const response = await request(app)
      .post('/projects/project-123/test-cases')
      .send({
        ...newTestCase,
        requirementIds: ['requirement-123', 'requirement-123'],
      })

    expect(response.status).toBe(400)
    expect(db.testCase.create).not.toHaveBeenCalled()
  })

  it('rejects project ownership fields in the body', async () => {
    const response = await request(app)
      .post('/projects/project-123/test-cases')
      .send({
        ...newTestCase,
        projectId: 'foreign-project',
      })

    expect(response.status).toBe(400)
    expect(db.testCase.create).not.toHaveBeenCalled()
  })

  it('reads a test case scoped to its project', async () => {
    db.testCase.findFirst.mockResolvedValue(exampleTestCase)

    const response = await request(app).get('/projects/project-123/test-cases/test-123')

    expect(response.status).toBe(200)

    expect(db.testCase.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'test-123',
          projectId: 'project-123',
        },
      }),
    )
  })

  it('returns 404 for an unavailable test case', async () => {
    db.testCase.findFirst.mockResolvedValue(null)

    const response = await request(app).get('/projects/project-123/test-cases/missing')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('TEST_CASE_NOT_FOUND')
  })

  it('updates a test case and replaces requirement links', async () => {
    db.testCase.findFirst.mockResolvedValue(exampleTestCase)
    db.testCase.updateMany.mockResolvedValue({
      count: 1,
    })
    db.testCaseRequirement.deleteMany.mockResolvedValue({
      count: 1,
    })
    db.testCaseRequirement.createMany.mockResolvedValue({
      count: 1,
    })

    const response = await request(app)
      .patch('/projects/project-123/test-cases/test-123')
      .send({
        title: 'Updated Login',
        requirementIds: ['requirement-123'],
      })

    expect(response.status).toBe(200)

    expect(db.testCase.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'test-123',
        projectId: 'project-123',
      },
      data: {
        title: 'Updated Login',
      },
    })

    expect(db.testCaseRequirement.deleteMany).toHaveBeenCalledWith({
      where: { testCaseId: 'test-123' },
    })

    expect(db.testCaseRequirement.createMany).toHaveBeenCalledWith({
      data: [
        {
          testCaseId: 'test-123',
          requirementId: 'requirement-123',
        },
      ],
    })
  })

  it('rejects invalid requirement links during an update', async () => {
    db.testCase.findFirst.mockResolvedValue(exampleTestCase)
    db.requirement.findMany.mockResolvedValue([])

    const response = await request(app)
      .patch('/projects/project-123/test-cases/test-123')
      .send({
        requirementIds: ['requirement-123'],
      })

    expect(response.status).toBe(400)
    expect(db.testCase.updateMany).not.toHaveBeenCalled()
  })

  it('rejects an empty update', async () => {
    const response = await request(app).patch('/projects/project-123/test-cases/test-123').send({})

    expect(response.status).toBe(400)
    expect(db.testCase.updateMany).not.toHaveBeenCalled()
  })

  it('deletes only a test case from the owned project', async () => {
    db.testCase.deleteMany.mockResolvedValue({
      count: 1,
    })

    const response = await request(app).delete('/projects/project-123/test-cases/test-123')

    expect(response.status).toBe(204)

    expect(db.testCase.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'test-123',
        projectId: 'project-123',
      },
    })
  })

  it('cannot delete a test case outside the project', async () => {
    db.testCase.deleteMany.mockResolvedValue({
      count: 0,
    })

    const response = await request(app).delete('/projects/project-123/test-cases/foreign-test')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('TEST_CASE_NOT_FOUND')
  })
})
