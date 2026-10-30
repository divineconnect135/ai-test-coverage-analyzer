import { z } from 'zod'

const projectNameSchema = z
  .string()
  .trim()
  .min(2, 'Project name must contain at least 2 characters.')
  .max(100, 'Project name cannot exceed 100 characters.')

const projectDescriptionSchema = z
  .string()
  .trim()
  .max(1000, 'Description cannot exceed 1000 characters.')

export const createProjectSchema = z.strictObject({
  name: projectNameSchema,
  description: projectDescriptionSchema.default(''),
})

export const updateProjectSchema = z
  .strictObject({
    name: projectNameSchema.optional(),
    description: projectDescriptionSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: 'Provide at least one field to update.',
  })

export type CreateProjectInput = z.infer<typeof createProjectSchema>

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
