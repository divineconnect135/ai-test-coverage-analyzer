import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  CORS_ORIGIN: z
    .url()
    .refine(
      (value) =>
        ['http:', 'https:'].includes(new URL(value).protocol) && new URL(value).origin === value,
      'CORS_ORIGIN must be an HTTP(S) origin without a path.',
    )
    .optional(),

  DATABASE_URL: z
    .url()
    .refine(
      (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
      'DATABASE_URL must be a PostgreSQL connection URL.',
    ),

  DIRECT_URL: z
    .url()
    .refine(
      (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
      'DIRECT_URL must be a PostgreSQL connection URL.',
    ),

  BETTER_AUTH_URL: z.url(),

  WEB_ORIGIN: z.url(),

  BETTER_AUTH_SECRET: z.string().min(32, 'Authentication secret must be at least 32 characters.'),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  const invalidFields = result.error.issues.map((issue) => issue.path.join('.')).join(', ')

  throw new Error(`Invalid environment configuration: ${invalidFields}`)
}

export const env = result.data
