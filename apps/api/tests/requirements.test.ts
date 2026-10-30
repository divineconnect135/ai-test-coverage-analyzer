import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  project: {
    findFirst: vi.fn(),
  },
  requirement: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: db,
}))

import {
  createRequirement,
  deleteRequirement,
  getRequirement,
  listRequirements,
  updateRequirement,
} from '../src/controllers/requirements.controller.js'

import { validateBody } from '../src/middleware/validateBody.js'
import { errorHandler } from '../src/middleware/errorHandler.js'

import {
  createRequirementSchema,
  updateRequirementSchema,
} from '../src/schemas/requirement.schema.js'

const app = express()
app.use(express.json())

// Simulate an identity already verified by Better Auth.
app.use((_req, res, next) => {
  res.locals.authUser = {
    id: 'owner-123',
  }
  next()
})

const base = '/projects/:projectId/requirements'

app.get(base, listRequirements)

app.post(base, validateBody(createRequirementSchema), createRequirement)

app.get(`${base}/:requirementId`, getRequirement)

app.patch(`${base}/:requirementId`, validateBody(updateRequirementSchema), updateRequirement)

app.delete(`${base}/:requirementId`, deleteRequirement)

app.use(errorHandler)

const exampleRequirement = {
  id: 'requirement-123',
  projectId: 'project-123',
  code: 'AUTH-001',
  title: 'User Login',
  description: 'Users can sign in with valid credentials.',
  createdAt: new Date('2026-10-29T12:00:00Z'),
  updatedAt: new Date('2026-10-29T12:00:00Z'),
}

beforeEach(() => {
  vi.resetAllMocks()

  db.project.findFirst.mockResolvedValue({
    id: 'project-123',
  })
})

describe('Requirements API', () => {
  it('lists requirements only after verifying project ownership', async () => {
    db.requirement.findMany.mockResolvedValue([exampleRequirement])

    const response = await request(app).get('/projects/project-123/requirements')

    expect(response.status).toBe(200)
    expect(response.body.requirements).toHaveLength(1)

    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        userId: 'owner-123',
      },
      select: {
        id: true,
      },
    })

    expect(db.requirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project-123',
        },
      }),
    )
  })

  it('rejects a project owned by another user', async () => {
    db.project.findFirst.mockResolvedValue(null)

    const response = await request(app).get('/projects/another-project/requirements')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND')

    expect(db.requirement.findMany).not.toHaveBeenCalled()
  })

  it('creates a requirement within an owned project', async () => {
    db.requirement.create.mockResolvedValue(exampleRequirement)

    const response = await request(app).post('/projects/project-123/requirements').send({
      code: 'auth-001',
      title: 'User Login',
      description: 'Users can sign in with valid credentials.',
    })

    expect(response.status).toBe(201)

    expect(db.requirement.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-123',
        code: 'AUTH-001',
        title: 'User Login',
        description: 'Users can sign in with valid credentials.',
      },
    })
  })

  it('rejects duplicate requirement codes', async () => {
    db.requirement.create.mockRejectedValue({
      code: 'P2002',
    })

    const response = await request(app).post('/projects/project-123/requirements').send({
      code: 'AUTH-001',
      title: 'Another Login Requirement',
      description: 'A duplicate requirement code.',
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('REQUIREMENT_CODE_CONFLICT')
  })

  it('rejects invalid requirement codes', async () => {
    const response = await request(app).post('/projects/project-123/requirements').send({
      code: 'INVALID CODE',
      title: 'User Login',
      description: 'Example description.',
    })

    expect(response.status).toBe(400)
    expect(db.requirement.create).not.toHaveBeenCalled()
  })

  it('rejects unexpected ownership fields', async () => {
    const response = await request(app).post('/projects/project-123/requirements').send({
      code: 'AUTH-001',
      title: 'User Login',
      description: 'Example description.',
      projectId: 'another-project',
    })

    expect(response.status).toBe(400)
    expect(db.requirement.create).not.toHaveBeenCalled()
  })

  it('reads only a requirement from the requested project', async () => {
    db.requirement.findFirst.mockResolvedValue(exampleRequirement)

    const response = await request(app).get('/projects/project-123/requirements/requirement-123')

    expect(response.status).toBe(200)

    expect(db.requirement.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'requirement-123',
        projectId: 'project-123',
      },
    })
  })

  it('returns 404 for a requirement outside the project', async () => {
    db.requirement.findFirst.mockResolvedValue(null)

    const response = await request(app).get(
      '/projects/project-123/requirements/foreign-requirement',
    )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('REQUIREMENT_NOT_FOUND')
  })

  it('updates only a requirement from the owned project', async () => {
    db.requirement.updateMany.mockResolvedValue({
      count: 1,
    })

    db.requirement.findFirst.mockResolvedValue({
      ...exampleRequirement,
      title: 'Updated Login',
    })

    const response = await request(app)
      .patch('/projects/project-123/requirements/requirement-123')
      .send({
        title: 'Updated Login',
      })

    expect(response.status).toBe(200)

    expect(db.requirement.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'requirement-123',
        projectId: 'project-123',
      },
      data: {
        title: 'Updated Login',
      },
    })
  })

  it('rejects empty updates', async () => {
    const response = await request(app)
      .patch('/projects/project-123/requirements/requirement-123')
      .send({})

    expect(response.status).toBe(400)
    expect(db.requirement.updateMany).not.toHaveBeenCalled()
  })

  it('does not update a missing requirement', async () => {
    db.requirement.updateMany.mockResolvedValue({
      count: 0,
    })

    const response = await request(app).patch('/projects/project-123/requirements/missing').send({
      title: 'Updated Login',
    })

    expect(response.status).toBe(404)
  })

  it('deletes a requirement scoped to the project', async () => {
    db.requirement.deleteMany.mockResolvedValue({
      count: 1,
    })

    const response = await request(app).delete('/projects/project-123/requirements/requirement-123')

    expect(response.status).toBe(204)

    expect(db.requirement.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'requirement-123',
        projectId: 'project-123',
      },
    })
  })

  it('does not delete a requirement in another project', async () => {
    db.requirement.deleteMany.mockResolvedValue({
      count: 0,
    })

    const response = await request(app).delete(
      '/projects/project-123/requirements/foreign-requirement',
    )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('REQUIREMENT_NOT_FOUND')
  })
})
