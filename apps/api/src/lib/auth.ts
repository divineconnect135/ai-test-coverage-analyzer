import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'

import { prisma } from './prisma.js'
import { env } from '../config/env.js'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,

  secret: env.BETTER_AUTH_SECRET,

  trustedOrigins: [env.WEB_ORIGIN],

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
  },
})
