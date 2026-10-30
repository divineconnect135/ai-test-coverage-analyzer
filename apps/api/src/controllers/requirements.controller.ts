import type { Request, RequestHandler, Response } from 'express'

import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

import type {
  CreateRequirementInput,
  UpdateRequirementInput,
} from '../schemas/requirement.schema.js'

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

function requirementNotFound(): AppError {
  return new AppError(404, 'REQUIREMENT_NOT_FOUND', 'Requirement not found.')
}

function codeConflict(): AppError {
  return new AppError(
    409,
    'REQUIREMENT_CODE_CONFLICT',
    'A requirement with this code already exists in this project.',
  )
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

// GET /api/projects/:projectId/requirements
export const listRequirements: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')

  await assertProjectOwner(projectId, userId)

  const requirements = await prisma.requirement.findMany({
    where: {
      projectId,
    },
    orderBy: [{ code: 'asc' }, { createdAt: 'asc' }],
  })

  res.status(200).json({ requirements })
}

// POST /api/projects/:projectId/requirements
export const createRequirement: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const input = req.body as CreateRequirementInput

  await assertProjectOwner(projectId, userId)

  try {
    const requirement = await prisma.requirement.create({
      data: {
        projectId,
        code: input.code,
        title: input.title,
        description: input.description,
      },
    })

    res.status(201).json({ requirement })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw codeConflict()
    }

    throw error
  }
}

// GET /api/projects/:projectId/requirements/:requirementId
export const getRequirement: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const requirementId = getParam(req, 'requirementId')

  await assertProjectOwner(projectId, userId)

  const requirement = await prisma.requirement.findFirst({
    where: {
      id: requirementId,
      projectId,
    },
  })

  if (!requirement) {
    throw requirementNotFound()
  }

  res.status(200).json({ requirement })
}

// PATCH /api/projects/:projectId/requirements/:requirementId
export const updateRequirement: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const requirementId = getParam(req, 'requirementId')
  const input = req.body as UpdateRequirementInput

  await assertProjectOwner(projectId, userId)

  try {
    const result = await prisma.requirement.updateMany({
      where: {
        id: requirementId,
        projectId,
      },
      data: input,
    })

    if (result.count === 0) {
      throw requirementNotFound()
    }

    const requirement = await prisma.requirement.findFirst({
      where: {
        id: requirementId,
        projectId,
      },
    })

    if (!requirement) {
      throw requirementNotFound()
    }

    res.status(200).json({ requirement })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw codeConflict()
    }

    throw error
  }
}

// DELETE /api/projects/:projectId/requirements/:requirementId
export const deleteRequirement: RequestHandler = async (req, res) => {
  const userId = getUserId(res)
  const projectId = getParam(req, 'projectId')
  const requirementId = getParam(req, 'requirementId')

  await assertProjectOwner(projectId, userId)

  const result = await prisma.requirement.deleteMany({
    where: {
      id: requirementId,
      projectId,
    },
  })

  if (result.count === 0) {
    throw requirementNotFound()
  }

  res.status(204).send()
}
