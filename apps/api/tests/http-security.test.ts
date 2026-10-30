import express from 'express'
import request from 'supertest'

import { describe, expect, it } from 'vitest'

import { installHttpSecurity } from '../src/security/httpSecurity.js'

const WEB_ORIGIN = 'http://localhost:5173'

function createTestApp() {
  const app = express()

  installHttpSecurity(app, {
    allowedOrigins: [WEB_ORIGIN],
    apiLimit: 100,
    authLimit: 2,
    aiLimit: 2,
    maxRequestBytes: 256 * 1024,
  })

  app.use(
    express.json({
      limit: '256kb',
    }),
  )

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
    })
  })

  app.post('/api/projects', (_req, res) => {
    res.status(201).json({
      project: {
        id: 'project-1',
      },
    })
  })

  app.post('/api/auth/sign-in/email', (_req, res) => {
    res.status(200).json({
      success: true,
    })
  })

  app.post('/api/projects/:projectId/analyses', (_req, res) => {
    res.status(201).json({
      analysis: {
        id: 'analysis-1',
      },
    })
  })

  app.get('/api/projects/:projectId/analyses', (_req, res) => {
    res.status(200).json({
      analyses: [],
    })
  })

  return app
}

describe('HTTP security headers', () => {
  it('removes the Express powered-by header', async () => {
    const response = await request(createTestApp()).get('/api/health')

    expect(response.status).toBe(200)

    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('sets security-related headers', async () => {
    const response = await request(createTestApp()).get('/api/health')

    expect(response.headers['x-content-type-options']).toBe('nosniff')

    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')

    expect(response.headers['content-security-policy']).toBeTruthy()
  })
})

describe('Allowed origins', () => {
  it('allows a trusted frontend origin', async () => {
    const response = await request(createTestApp())
      .post('/api/projects')
      .set('Origin', WEB_ORIGIN)
      .send({
        name: 'Test Project',
      })

    expect(response.status).toBe(201)

    expect(response.headers['access-control-allow-origin']).toBe(WEB_ORIGIN)

    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('blocks a mutation from an untrusted origin', async () => {
    const response = await request(createTestApp())
      .post('/api/projects')
      .set('Origin', 'https://attacker.example')
      .send({
        name: 'Malicious Project',
      })

    expect(response.status).toBe(403)

    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED')
  })

  it('rejects an untrusted Referer', async () => {
    const response = await request(createTestApp())
      .post('/api/projects')
      .set('Referer', 'https://attacker.example/create')
      .send({
        name: 'Test Project',
      })

    expect(response.status).toBe(403)
  })

  it('blocks cross-site writes without a trusted origin', async () => {
    const response = await request(createTestApp())
      .post('/api/projects')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({
        name: 'Test Project',
      })

    expect(response.status).toBe(403)

    expect(response.body.error.code).toBe('CROSS_SITE_REQUEST_BLOCKED')
  })

  it('permits non-browser API clients without Origin headers', async () => {
    const response = await request(createTestApp()).post('/api/projects').send({
      name: 'Playwright Test Project',
    })

    expect(response.status).toBe(201)
  })

  it('allows trusted CORS preflight requests', async () => {
    const response = await request(createTestApp())
      .options('/api/projects')
      .set('Origin', WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')

    expect(response.status).toBe(204)

    expect(response.headers['access-control-allow-origin']).toBe(WEB_ORIGIN)
  })

  it('rejects untrusted CORS preflight requests', async () => {
    const response = await request(createTestApp())
      .options('/api/projects')
      .set('Origin', 'https://attacker.example')
      .set('Access-Control-Request-Method', 'POST')

    expect(response.status).toBe(403)
  })
})

describe('Request-size limits', () => {
  it('rejects oversized declared bodies', async () => {
    const response = await request(createTestApp())
      .post('/api/projects')
      .set('Content-Type', 'text/plain')
      .send('x'.repeat(300_000))

    expect(response.status).toBe(413)

    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })
})

describe('Authentication rate limiting', () => {
  it('blocks the third sign-in request', async () => {
    const app = createTestApp()

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request(app)
        .post('/api/auth/sign-in/email')
        .set('Origin', WEB_ORIGIN)
        .send({
          email: 'test@example.com',
          password: 'example',
        })

      expect(response.status).toBe(200)
    }

    const blocked = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Origin', WEB_ORIGIN)
      .send({
        email: 'test@example.com',
        password: 'example',
      })

    expect(blocked.status).toBe(429)

    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })
})

describe('AI request limits', () => {
  it('blocks the third new analysis', async () => {
    const app = createTestApp()

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request(app)
        .post('/api/projects/project-1/analyses')
        .set('Origin', WEB_ORIGIN)
        .send({})

      expect(response.status).toBe(201)
    }

    const blocked = await request(app)
      .post('/api/projects/project-1/analyses')
      .set('Origin', WEB_ORIGIN)
      .send({})

    expect(blocked.status).toBe(429)

    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })

  it('does not count history GET requests as AI executions', async () => {
    const app = createTestApp()

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await request(app).get('/api/projects/project-1/analyses')

      expect(response.status).toBe(200)
    }

    const analysis = await request(app)
      .post('/api/projects/project-1/analyses')
      .set('Origin', WEB_ORIGIN)
      .send({})

    expect(analysis.status).toBe(201)
  })
})
