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
  it('returns JSON for an unknown API route', async () => {
    const response = await request(app).get('/api/unknown')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('rejects malformed JSON', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Content-Type', 'application/json')
      .send('{"name":')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_JSON')
  })

  it('rejects oversized request bodies', async () => {
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

describe('Project authentication', () => {
  it('rejects unauthenticated project listing', async () => {
    const response = await request(app).get('/api/projects')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects unauthenticated project details', async () => {
    const response = await request(app).get('/api/projects/example-id')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects unauthenticated creation', async () => {
    const response = await request(app).post('/api/projects').send({
      name: 'Example Project',
      description: 'Example description',
    })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects unauthenticated updates', async () => {
    const response = await request(app).patch('/api/projects/example-id').send({
      name: 'Updated Project',
    })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects unauthenticated deletion', async () => {
    const response = await request(app).delete('/api/projects/example-id')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })
})

describe('Project validation', () => {
  it('rejects invalid project names', async () => {
    const response = await request(app).post('/api/projects').send({
      name: 'A',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects ownership fields during creation', async () => {
    const response = await request(app).post('/api/projects').send({
      name: 'Authentication System',
      userId: 'another-user',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})
