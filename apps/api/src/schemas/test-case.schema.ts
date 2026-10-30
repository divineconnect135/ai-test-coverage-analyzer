import { z } from 'zod'

const titleSchema = z
  .string()
  .trim()
  .min(2, 'Title must contain at least 2 characters.')
  .max(160, 'Title cannot exceed 160 characters.')

const descriptionSchema = z.string().trim().max(2000, 'Description cannot exceed 2000 characters.')

const testTypeSchema = z.enum(['POSITIVE', 'NEGATIVE', 'EDGE_CASE', 'SECURITY', 'OTHER'])

const testStatusSchema = z.enum(['DRAFT', 'READY', 'COMPLETED'])

const stepsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'Test steps cannot be empty.')
      .max(500, 'Each step must be 500 characters or fewer.'),
  )
  .max(30, 'A test case can have at most 30 steps.')

const expectedResultSchema = z
  .string()
  .trim()
  .max(2000, 'Expected result cannot exceed 2000 characters.')

const requirementIdsSchema = z
  .array(z.string().trim().min(1).max(128))
  .max(50, 'A test case can link to at most 50 requirements.')
  .refine((ids) => new Set(ids).size === ids.length, 'Duplicate requirement IDs are not allowed.')

export const createTestCaseSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema.default(''),
  type: testTypeSchema.default('OTHER'),
  status: testStatusSchema.default('DRAFT'),
  steps: stepsSchema.default([]),
  expectedResult: expectedResultSchema.default(''),
  requirementIds: requirementIdsSchema.default([]),
})

export const updateTestCaseSchema = z
  .strictObject({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    type: testTypeSchema.optional(),
    status: testStatusSchema.optional(),
    steps: stepsSchema.optional(),
    expectedResult: expectedResultSchema.optional(),
    requirementIds: requirementIdsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update.')

export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>

export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>
