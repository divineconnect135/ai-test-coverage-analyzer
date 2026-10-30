import { describe, expect, it } from 'vitest'

import {
  createRequirementSchema,
  updateRequirementSchema,
} from '../src/schemas/requirement.schema.js'

import { createTestCaseSchema, updateTestCaseSchema } from '../src/schemas/test-case.schema.js'

import { validateAiAnalysis, type AnalysisInput } from '../src/ai/analysis.schema.js'

const validRequirement = {
  code: 'AUTH-001',
  title: 'User Login',
  description: 'Users can log in using valid credentials.',
}

const validTestCase = {
  title: 'Login with valid credentials',
  description: 'Test successful login.',
  type: 'POSITIVE',
  status: 'READY',
  steps: ['Open the login page.', 'Enter valid credentials.'],
  expectedResult: 'The dashboard is displayed.',
  requirementIds: ['requirement-1'],
}

const input: AnalysisInput = {
  project: {
    id: 'project-1',
    name: 'Authentication',
    description: '',
  },
  requirements: [
    {
      id: 'requirement-1',
      code: 'AUTH-001',
      title: 'User Login',
      description: 'Users can log in.',
    },
  ],
  testCases: [],
}

const validAnalysis = {
  summary: 'The login requirement has a possible gap.',
  requirementAssessments: [
    {
      requirementId: 'requirement-1',
      assessment: 'POTENTIAL_GAP',
      relatedExistingTestIds: [],
      explanation: 'No linked test case was found.',
    },
  ],
  suggestions: [
    {
      title: 'Test successful login',
      description: 'Check valid credentials.',
      type: 'POSITIVE',
      priority: 'MEDIUM',
      relatedRequirementIds: ['requirement-1'],
      reason: 'The requirement does not have a linked test.',
      steps: ['Open login.', 'Enter valid credentials.'],
      expectedResult: 'Login succeeds.',
    },
  ],
  limitations: [
    {
      description: 'No tests were executed.',
    },
  ],
}

describe('Requirement validation', () => {
  it('accepts a valid requirement', () => {
    expect(createRequirementSchema.safeParse(validRequirement).success).toBe(true)
  })

  it('rejects unauthorized project ownership fields', () => {
    expect(
      createRequirementSchema.safeParse({
        ...validRequirement,
        projectId: 'another-project',
      }).success,
    ).toBe(false)
  })

  it('rejects empty requirement updates', () => {
    expect(updateRequirementSchema.safeParse({}).success).toBe(false)
  })
})

describe('Test case validation', () => {
  it('accepts a valid test case', () => {
    expect(createTestCaseSchema.safeParse(validTestCase).success).toBe(true)
  })

  it('rejects unsupported test types', () => {
    expect(
      createTestCaseSchema.safeParse({
        ...validTestCase,
        type: 'UNKNOWN',
      }).success,
    ).toBe(false)
  })

  it('rejects duplicate requirement links', () => {
    expect(
      createTestCaseSchema.safeParse({
        ...validTestCase,
        requirementIds: ['requirement-1', 'requirement-1'],
      }).success,
    ).toBe(false)
  })

  it('rejects ownership fields in test cases', () => {
    expect(
      createTestCaseSchema.safeParse({
        ...validTestCase,
        userId: 'another-user',
      }).success,
    ).toBe(false)
  })

  it('rejects empty test-case updates', () => {
    expect(updateTestCaseSchema.safeParse({}).success).toBe(false)
  })
})

describe('AI result validation', () => {
  it('accepts a valid structured analysis', () => {
    const result = validateAiAnalysis(validAnalysis, input, 8)

    expect(result.suggestions).toHaveLength(1)
    expect(result.requirementAssessments).toHaveLength(1)
  })

  it('rejects invented requirement references', () => {
    const invalid = {
      ...validAnalysis,
      suggestions: [
        {
          ...validAnalysis.suggestions[0],
          relatedRequirementIds: ['invented-id'],
        },
      ],
    }

    expect(() => validateAiAnalysis(invalid, input, 8)).toThrow()
  })

  it('rejects missing requirement assessments', () => {
    expect(() =>
      validateAiAnalysis(
        {
          ...validAnalysis,
          requirementAssessments: [],
        },
        input,
        8,
      ),
    ).toThrow()
  })

  it('enforces the maximum suggestion count', () => {
    expect(() =>
      validateAiAnalysis(
        {
          ...validAnalysis,
          suggestions: [validAnalysis.suggestions[0], validAnalysis.suggestions[0]],
        },
        input,
        1,
      ),
    ).toThrow()
  })
})
