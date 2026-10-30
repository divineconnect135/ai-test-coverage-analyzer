import { z } from 'zod'

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, 'Requirement code must contain at least 2 characters.')
  .max(40, 'Requirement code cannot exceed 40 characters.')
  .regex(
    /^[A-Z][A-Z0-9]*(?:[-_][A-Z0-9]+)*$/,
    'Use letters, numbers, hyphens, or underscores. Start with a letter.',
  )

const titleSchema = z
  .string()
  .trim()
  .min(2, 'Title must contain at least 2 characters.')
  .max(160, 'Title cannot exceed 160 characters.')

const descriptionSchema = z
  .string()
  .trim()
  .min(1, 'Description is required.')
  .max(5000, 'Description cannot exceed 5000 characters.')

export const createRequirementSchema = z.strictObject({
  code: codeSchema,
  title: titleSchema,
  description: descriptionSchema,
})

export const updateRequirementSchema = z
  .strictObject({
    code: codeSchema.optional(),
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  })

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>

export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>
