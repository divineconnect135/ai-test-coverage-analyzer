import { z } from 'zod'

const aiConfigSchema = z.object({
  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),

  AI_MAX_REQUESTS_PER_USER_PER_DAY: z.coerce.number().int().min(1).max(1000).default(5),

  AI_GLOBAL_REQUESTS_PER_HOUR: z.coerce.number().int().min(1).max(10000).default(40),

  AI_MAX_REQUIREMENTS: z.coerce.number().int().min(1).max(100).default(30),

  AI_MAX_TEST_CASES: z.coerce.number().int().min(1).max(500).default(80),

  AI_MAX_INPUT_CHARS: z.coerce.number().int().min(1000).max(200000).default(30000),

  AI_MAX_SUGGESTIONS: z.coerce.number().int().min(1).max(30).default(8),

  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(500).max(16000).default(4500),

  AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(45000),
})

export type AiConfig = z.infer<typeof aiConfigSchema>

export function getAiConfig(): AiConfig {
  const result = aiConfigSchema.safeParse(process.env)

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ')

    throw new Error(`Invalid AI environment configuration: ${fields}`)
  }

  return result.data
}
