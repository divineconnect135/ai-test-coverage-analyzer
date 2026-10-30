import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock database operations.
const db = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    project: db,
  },
}))

import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../src/controllers/projects.controller.js'

import { errorHandler } from '../src/middleware/errorHandler.js'
import { validateBody } from '../src/middleware/validateBody.js'

import { createProjectSchema, updateProjectSchema } from '../src/schemas/project.schema.js'

// Isolated Express app with a simulated verified user.
const app = express()
app.use(express.json())

app.use((_req, res, next) => {
  res.locals.authUser = {
    id: 'owner-123',
  }
  next()
})

app.get('/projects', listProjects)

app.post('/projects', validateBody(createProjectSchema), createProject)

app.get('/projects/:projectId', getProject)

app.patch('/projects/:projectId', validateBody(updateProjectSchema), updateProject)

app.delete('/projects/:projectId', deleteProject)
app.use(errorHandler)

const exampleProject = {
  id: 'project-123',
  name: 'Example Project',
  description: 'Testing application features',
  createdAt: new Date('2026-10-29T12:00:00Z'),
  updatedAt: new Date('2026-10-29T12:00:00Z'),
  _count: {
    requirements: 2,
    testCases: 3,
    analyses: 1,
  },
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Project CRUD ownership', () => {
  it('lists only the signed-in user’s projects', async () => {
    db.findMany.mockResolvedValue([exampleProject])

    const response = await request(app).get('/projects')

    expect(response.status).toBe(200)
    expect(response.body.projects).toHaveLength(1)
    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'owner-123',
        },
      }),
    )
  })

  it('creates a project with the authenticated owner', async () => {
    db.create.mockResolvedValue(exampleProject)

    const response = await request(app).post('/projects').send({
      name: 'Example Project',
      description: 'Testing application features',
    })

    expect(response.status).toBe(201)

    expect(db.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'owner-123',
          name: 'Example Project',
          description: 'Testing application features',
        },
      }),
    )
  })

  it('reads only projects owned by the user', async () => {
    db.findFirst.mockResolvedValue(exampleProject)

    const response = await request(app).get('/projects/project-123')

    expect(response.status).toBe(200)
    expect(response.body.project.requirementCount).toBe(2)

    expect(db.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'project-123',
          userId: 'owner-123',
        },
      }),
    )
  })

  it('returns 404 for an unavailable project', async () => {
    db.findFirst.mockResolvedValue(null)

    const response = await request(app).get('/projects/another-project')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND')
  })

  it('updates only a project owned by the user', async () => {
    db.updateMany.mockResolvedValue({ count: 1 })

    db.findFirst.mockResolvedValue({
      ...exampleProject,
      name: 'Updated Project',
    })

    const response = await request(app).patch('/projects/project-123').send({
      name: 'Updated Project',
    })

    expect(response.status).toBe(200)

    expect(db.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        userId: 'owner-123',
      },
      data: {
        name: 'Updated Project',
      },
    })
  })

  it('cannot update another user’s project', async () => {
    db.updateMany.mockResolvedValue({ count: 0 })

    const response = await request(app).patch('/projects/another-project').send({
      name: 'Unauthorized Change',
    })

    expect(response.status).toBe(404)
    expect(db.findFirst).not.toHaveBeenCalled()
  })

  it('rejects an empty update', async () => {
    const response = await request(app).patch('/projects/project-123').send({})

    expect(response.status).toBe(400)
    expect(db.updateMany).not.toHaveBeenCalled()
  })

  it('rejects attempts to change project ownership', async () => {
    const response = await request(app).patch('/projects/project-123').send({
      userId: 'another-user',
    })

    expect(response.status).toBe(400)
    expect(db.updateMany).not.toHaveBeenCalled()
  })

  it('deletes only an owned project', async () => {
    db.deleteMany.mockResolvedValue({ count: 1 })

    const response = await request(app).delete('/projects/project-123')

    expect(response.status).toBe(204)

    expect(db.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        userId: 'owner-123',
      },
    })
  })

  it('cannot delete another user’s project', async () => {
    db.deleteMany.mockResolvedValue({ count: 0 })

    const response = await request(app).delete('/projects/another-project')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND')
  })
})
