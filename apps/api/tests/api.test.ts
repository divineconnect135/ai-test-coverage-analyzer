import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../src/app.js'

describe('GET /api/health', () => {
  it('returns a successful health response', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      status: 'ok',
      message: 'AI Test Coverage Analyzer API is running',
    })
  })

  it('includes security headers', async () => {
    const response = await request(app).get('/api/health')

    expect(response.headers['x-content-type-options']).toBe('nosniff')

    expect(response.headers['x-powered-by']).toBeUndefined()
  })
})

describe('API error handling', () => {
  it('returns JSON for unknown API routes', async () => {
    const response = await request(app).get('/api/unknown')

    expect(response.status).toBe(404)

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'API endpoint not found.',
      },
    })
  })

  it('rejects malformed JSON', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Content-Type', 'application/json')
      .send('{"name":')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_JSON')
  })

  it('rejects oversized JSON bodies', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({
        name: 'Example Project',
        description: 'x'.repeat(110_000),
      })

    expect(response.status).toBe(413)
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })
})

describe('POST /api/projects', () => {
  it('rejects invalid project names', async () => {
    const response = await request(app).post('/api/projects').send({
      name: 'A',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')

    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
        }),
      ]),
    )
  })

  it('rejects unexpected ownership fields', async () => {
    const response = await request(app).post('/api/projects').send({
      name: 'Authentication System',
      userId: 'another-user',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 501 for valid data until CRUD is implemented', async () => {
    const response = await request(app).post('/api/projects').send({
      name: 'Authentication System',
      description: 'Test authentication features',
    })

    expect(response.status).toBe(501)

    expect(response.body.error.code).toBe('NOT_IMPLEMENTED')
  })
})
