import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { app } from '../app.js'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'

function expectStatus(step: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`${step}: expected HTTP ${expected}, received HTTP ${actual}`)
  }
}

async function smokeAuth() {
  // This test must never be run against production.
  if (env.NODE_ENV === 'production' || process.env.ALLOW_AUTH_SMOKE !== '1') {
    throw new Error('Auth smoke test is disabled. Enable it explicitly in development.')
  }

  const email = `auth-smoke-${randomBytes(8).toString('hex')}@example.com`
  const password = randomBytes(24).toString('base64url')

  // Supertest agent preserves cookies between requests.
  const agent = request.agent(app)

  try {
    // 1. Register.
    const signup = await agent.post('/api/auth/sign-up/email').set('Origin', env.WEB_ORIGIN).send({
      name: 'Temporary Auth Test',
      email,
      password,
    })

    expectStatus('Registration', signup.status, 200)
    console.log('PASS: Registration')

    // 2. Verify the authenticated session.
    const session = await agent.get('/api/me')

    expectStatus('Session lookup', session.status, 200)

    if (session.body.user?.email !== email) {
      throw new Error('Authenticated user does not match test account.')
    }

    console.log('PASS: Session cookie')

    // 501 is expected until project CRUD is implemented.

    // Create a real project as the authenticated user.
    const projectResponse = await agent.post('/api/projects').send({
      name: 'Smoke Test Project',
      description: 'Created during authentication testing',
    })

    expectStatus('Project creation', projectResponse.status, 201)

    const projectId = projectResponse.body.project?.id

    if (typeof projectId !== 'string') {
      throw new Error('Project creation returned no project ID.')
    }

    console.log('PASS: Authenticated project creation')

    // Retrieve the authenticated user's projects.
    const projectsResponse = await agent.get('/api/projects')

    expectStatus('Project listing', projectsResponse.status, 200)

    const projects = projectsResponse.body.projects as Array<{
      id: string
    }>

    if (!projects.some((project) => project.id === projectId)) {
      throw new Error('Newly created project was not found.')
    }

    console.log('PASS: Authenticated project listing')

    // 4. Log out.
    const signout = await agent.post('/api/auth/sign-out').set('Origin', env.WEB_ORIGIN).send({})

    expectStatus('Logout', signout.status, 200)
    console.log('PASS: Logout')

    // 5. Session must no longer authorize requests.
    const afterLogout = await agent.get('/api/me')

    expectStatus('Session revocation', afterLogout.status, 401)
    console.log('PASS: Session revoked')

    // 6. Log back in.
    const signin = await agent.post('/api/auth/sign-in/email').set('Origin', env.WEB_ORIGIN).send({
      email,
      password,
    })

    expectStatus('Login', signin.status, 200)
    console.log('PASS: Login')

    // 7. Confirm access is restored.
    const restored = await agent.get('/api/me')

    expectStatus('Restored session', restored.status, 200)
    console.log('PASS: Authenticated access restored')

    console.log('Authentication smoke test passed.')
  } finally {
    // Remove the temporary user and related auth records.
    try {
      await prisma.user.deleteMany({
        where: { email },
      })
      console.log('Temporary test account cleaned up.')
    } catch (error) {
      process.exitCode = 1
      console.error('Cleanup failed for:', email, error)
    } finally {
      await prisma.$disconnect()
    }
  }
}

void smokeAuth().catch((error: unknown) => {
  console.error(
    'Authentication smoke test failed:',
    error instanceof Error ? error.message : String(error),
  )
  process.exitCode = 1
})
