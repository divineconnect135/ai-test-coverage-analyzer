import { z } from 'zod'

import { AppError } from '../errors/AppError.js'

export type AnalysisInput = {
  project: {
    id: string
    name: string
    description: string
  }

  requirements: Array<{
    id: string
    code: string
    title: string
    description: string
  }>

  testCases: Array<{
    id: string
    title: string
    description: string
    type: string
    status: string
    steps: string[]
    expectedResult: string
    requirementIds: string[]
  }>
}

// Model-facing schema compatible with Structured Outputs.
export const aiAnalysisOutputSchema = z.strictObject({
  summary: z.string(),

  requirementAssessments: z.array(
    z.strictObject({
      requirementId: z.string(),

      assessment: z.enum(['POTENTIALLY_COVERED', 'POTENTIAL_GAP', 'UNCERTAIN']),

      relatedExistingTestIds: z.array(z.string()),
      explanation: z.string(),
    }),
  ),

  suggestions: z.array(
    z.strictObject({
      title: z.string(),
      description: z.string(),

      type: z.enum(['POSITIVE', 'NEGATIVE', 'EDGE_CASE', 'SECURITY', 'OTHER']),

      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),

      relatedRequirementIds: z.array(z.string()),
      reason: z.string(),
      steps: z.array(z.string()),
      expectedResult: z.string(),
    }),
  ),

  limitations: z.array(
    z.strictObject({
      description: z.string(),
    }),
  ),
})

export type AiAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>

function invalidOutput(): AppError {
  return new AppError(
    502,
    'AI_INVALID_RESPONSE',
    'The AI returned an invalid analysis. Please try again.',
  )
}

function validText(value: string, max: number): boolean {
  return value.trim().length > 0 && value.length <= max
}

// Validate untrusted AI output again on the backend.
export function validateAiAnalysis(
  value: unknown,
  input: AnalysisInput,
  maxSuggestions: number,
): AiAnalysisOutput {
  const result = aiAnalysisOutputSchema.safeParse(value)

  if (!result.success) {
    throw invalidOutput()
  }

  const data = result.data

  if (!validText(data.summary, 3000)) {
    throw invalidOutput()
  }

  if (data.suggestions.length > maxSuggestions || data.limitations.length > 20) {
    throw invalidOutput()
  }

  const validRequirementIds = new Set(input.requirements.map((item) => item.id))

  const validTestIds = new Set(input.testCases.map((item) => item.id))

  const seenAssessments = new Set<string>()

  for (const assessment of data.requirementAssessments) {
    if (
      !validRequirementIds.has(assessment.requirementId) ||
      seenAssessments.has(assessment.requirementId) ||
      !validText(assessment.explanation, 2000)
    ) {
      throw invalidOutput()
    }

    seenAssessments.add(assessment.requirementId)

    const referencedTests = new Set(assessment.relatedExistingTestIds)

    if (referencedTests.size !== assessment.relatedExistingTestIds.length) {
      throw invalidOutput()
    }

    for (const testId of referencedTests) {
      if (!validTestIds.has(testId)) {
        throw invalidOutput()
      }
    }
  }

  // Require one assessment for every supplied requirement.
  if (seenAssessments.size !== validRequirementIds.size) {
    throw invalidOutput()
  }

  for (const suggestion of data.suggestions) {
    if (
      !validText(suggestion.title, 160) ||
      !validText(suggestion.description, 2000) ||
      !validText(suggestion.reason, 2000) ||
      !validText(suggestion.expectedResult, 2000) ||
      suggestion.steps.length < 1 ||
      suggestion.steps.length > 30 ||
      suggestion.steps.some((step) => !validText(step, 500))
    ) {
      throw invalidOutput()
    }

    const referencedRequirements = new Set(suggestion.relatedRequirementIds)

    if (
      referencedRequirements.size === 0 ||
      referencedRequirements.size > 50 ||
      referencedRequirements.size !== suggestion.relatedRequirementIds.length
    ) {
      throw invalidOutput()
    }

    for (const requirementId of referencedRequirements) {
      if (!validRequirementIds.has(requirementId)) {
        throw invalidOutput()
      }
    }
  }

  for (const limitation of data.limitations) {
    if (!validText(limitation.description, 2000)) {
      throw invalidOutput()
    }
  }

  return data
}
