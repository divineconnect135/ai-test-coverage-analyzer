import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'

import { AppError } from '../errors/AppError.js'
import type { AiConfig } from '../config/ai.js'

import {
  aiAnalysisOutputSchema,
  type AiAnalysisOutput,
  type AnalysisInput,
} from './analysis.schema.js'

import { ANALYSIS_INSTRUCTIONS, buildAnalysisPrompt } from './prompts.js'

export type AiProviderResult = {
  model: string
  output: unknown
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface AiProvider {
  analyze(input: AnalysisInput, config: AiConfig): Promise<AiProviderResult>
}

// Deterministic provider for development and tests.
// It uses existing explicit requirement links only.
export class MockAiProvider implements AiProvider {
  async analyze(input: AnalysisInput, config: AiConfig): Promise<AiProviderResult> {
    const assessments: AiAnalysisOutput['requirementAssessments'] = []

    const suggestions: AiAnalysisOutput['suggestions'] = []

    for (const requirement of input.requirements) {
      const linkedTests = input.testCases.filter((testCase) =>
        testCase.requirementIds.includes(requirement.id),
      )

      const hasLinkedTests = linkedTests.length > 0

      assessments.push({
        requirementId: requirement.id,
        assessment: hasLinkedTests ? 'POTENTIALLY_COVERED' : 'POTENTIAL_GAP',
        relatedExistingTestIds: linkedTests.map((testCase) => testCase.id),
        explanation: hasLinkedTests
          ? 'One or more test cases are explicitly linked. Their actual adequacy has not been verified.'
          : 'No existing test case is linked to this requirement.',
      })

      if (!hasLinkedTests && suggestions.length < config.AI_MAX_SUGGESTIONS) {
        suggestions.push({
          title: `Test: ${requirement.title}`.slice(0, 160),

          description: `Create a test covering requirement ${requirement.code}.`,

          type: 'OTHER',
          priority: 'MEDIUM',

          relatedRequirementIds: [requirement.id],

          reason: 'No existing test case is linked to this requirement.',

          steps: [
            `Prepare a test setup for ${requirement.code}.`,
            'Perform the behavior described by the requirement.',
            'Observe the actual application response.',
          ],

          expectedResult: `The observed behavior satisfies requirement ${requirement.code}.`,
        })
      }
    }

    return {
      model: 'mock-coverage-v1',

      output: {
        summary:
          `Reviewed ${input.requirements.length} requirements ` +
          `and ${input.testCases.length} existing test cases. ` +
          'This mock analysis uses explicit links, not AI reasoning.',

        requirementAssessments: assessments,
        suggestions,

        limitations: [
          {
            description:
              'Mock mode identifies unlinked requirements only. It does not assess semantic coverage or test execution.',
          },
        ],
      } satisfies AiAnalysisOutput,
    }
  }
}

export class OpenAiProvider implements AiProvider {
  async analyze(input: AnalysisInput, config: AiConfig): Promise<AiProviderResult> {
    if (!config.OPENAI_API_KEY) {
      throw new AppError(503, 'AI_API_KEY_MISSING', 'OpenAI is not configured on the server.')
    }

    if (!config.OPENAI_MODEL) {
      throw new AppError(503, 'AI_MODEL_MISSING', 'An OpenAI model has not been configured.')
    }

    const client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      timeout: config.AI_TIMEOUT_MS,
      maxRetries: 0,
    })

    try {
      const response = await client.responses.parse({
        model: config.OPENAI_MODEL,

        instructions: ANALYSIS_INSTRUCTIONS,

        input: buildAnalysisPrompt(input, config.AI_MAX_SUGGESTIONS),

        text: {
          format: zodTextFormat(aiAnalysisOutputSchema, 'test_coverage_analysis'),
        },

        max_output_tokens: config.AI_MAX_OUTPUT_TOKENS,

        // Do not retain this response for API-side retrieval.
        store: false,
      })

      if (response.status !== 'completed') {
        throw new AppError(
          502,
          'AI_INCOMPLETE',
          'The AI analysis did not complete. Please try again.',
        )
      }

      const refused = response.output.some(
        (item) =>
          item.type === 'message' && item.content.some((content) => content.type === 'refusal'),
      )

      if (refused) {
        throw new AppError(422, 'AI_REFUSED', 'The AI could not analyze the supplied content.')
      }

      if (!response.output_parsed) {
        throw new AppError(
          502,
          'AI_INVALID_RESPONSE',
          'The AI did not return valid structured results.',
        )
      }

      return {
        model: response.model,
        output: response.output_parsed,

        usage: response.usage
          ? {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
            }
          : undefined,
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error
      }

      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new AppError(504, 'AI_TIMEOUT', 'The AI request timed out. Try again later.')
      }

      if (error instanceof OpenAI.RateLimitError) {
        throw new AppError(
          429,
          'AI_PROVIDER_RATE_LIMIT',
          'The AI provider is temporarily rate-limited.',
        )
      }

      if (
        error instanceof OpenAI.AuthenticationError ||
        error instanceof OpenAI.PermissionDeniedError
      ) {
        throw new AppError(
          503,
          'AI_AUTH_ERROR',
          'The AI provider credentials or permissions are invalid.',
        )
      }

      if (error instanceof OpenAI.BadRequestError || error instanceof OpenAI.NotFoundError) {
        throw new AppError(
          503,
          'AI_MODEL_ERROR',
          'The configured AI model or request format is unavailable.',
        )
      }

      if (error instanceof OpenAI.APIConnectionError) {
        throw new AppError(503, 'AI_CONNECTION_ERROR', 'Unable to reach the AI provider.')
      }

      if (error instanceof OpenAI.APIError) {
        throw new AppError(
          503,
          'AI_PROVIDER_ERROR',
          'The AI provider could not complete the request.',
        )
      }

      throw new AppError(502, 'AI_INVALID_RESPONSE', 'The AI returned an unexpected response.')
    }
  }
}

export function createAiProvider(config: AiConfig): AiProvider {
  return config.AI_PROVIDER === 'openai' ? new OpenAiProvider() : new MockAiProvider()
}
