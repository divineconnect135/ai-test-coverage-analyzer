import type { RequestHandler, Response } from 'express'

import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js'

const projectSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      requirements: true,
      testCases: true,
      analyses: true,
    },
  },
} as const

type ProjectWithCounts = {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  _count: {
    requirements: number
    testCases: number
    analyses: number
  }
}

function formatProject(project: ProjectWithCounts) {
  const { _count, ...fields } = project

  return {
    ...fields,
    requirementCount: _count.requirements,
    testCaseCount: _count.testCases,
    analysisCount: _count.analyses,
  }
}

function getUserId(res: Response): string {
  const user = res.locals.authUser as { id?: unknown } | undefined

  if (!user || typeof user.id !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'You must be signed in.')
  }

  return user.id
}

function getProjectId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
  }

  return value
}

function projectNotFound(): AppError {
  return new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
}

// GET /api/projects
export const listProjects: RequestHandler = async (_req, res) => {
  const userId = getUserId(res)

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: projectSelect,
  })

  res.status(200).json({
    projects: projects.map(formatProject),
  })
}

// POST /api/projects
export const createProject: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const input = req.body as CreateProjectInput

  const project = await prisma.project.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
    },
    select: projectSelect,
  })

  res.status(201).json({
    project: formatProject(project),
  })
}

// GET /api/projects/:projectId
export const getProject: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getProjectId(req.params.projectId)

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: projectSelect,
  })

  if (!project) {
    throw projectNotFound()
  }

  res.status(200).json({
    project: formatProject(project),
  })
}

// PATCH /api/projects/:projectId
export const updateProject: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getProjectId(req.params.projectId)
  const input = req.body as UpdateProjectInput

  // Ownership is included in the database UPDATE filter.
  const result = await prisma.project.updateMany({
    where: {
      id: projectId,
      userId,
    },
    data: input,
  })

  if (result.count === 0) {
    throw projectNotFound()
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: projectSelect,
  })

  if (!project) {
    throw projectNotFound()
  }

  res.status(200).json({
    project: formatProject(project),
  })
}

// DELETE /api/projects/:projectId
export const deleteProject: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getProjectId(req.params.projectId)

  // Ownership is included in the database DELETE filter.
  const result = await prisma.project.deleteMany({
    where: {
      id: projectId,
      userId,
    },
  })

  if (result.count === 0) {
    throw projectNotFound()
  }

  res.status(204).send()
}
