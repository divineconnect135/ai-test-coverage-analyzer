import type { Express, RequestHandler } from 'express'

import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

const WINDOW_MS = 15 * 60 * 1000

export type HttpSecurityOptions = {
  allowedOrigins?: readonly string[]
  apiLimit?: number
  authLimit?: number
  aiLimit?: number
  maxRequestBytes?: number
}

function normalizeOrigin(value: string): string {
  const trimmed = value.trim()

  let url: URL

  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(`Invalid allowed origin: ${trimmed}`)
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    trimmed.replace(/\/$/, '') !== url.origin
  ) {
    throw new Error(`Allowed origins must be HTTP(S) origins without paths: ${trimmed}`)
  }

  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('Production allowed origins must use HTTPS.')
  }

  return url.origin
}

function resolveAllowedOrigins(options: HttpSecurityOptions): Set<string> {
  const configured =
    process.env.WEB_ORIGIN ?? process.env.FRONTEND_ORIGIN ?? process.env.CORS_ORIGIN

  const defaults =
    process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000']

  const values = options.allowedOrigins ?? (configured ? configured.split(',') : defaults)

  const origins = new Set(
    values
      .map((value) => value.trim())
      .filter(Boolean)
      .map(normalizeOrigin),
  )

  if (origins.size === 0) {
    throw new Error('Configure WEB_ORIGIN before starting the production API.')
  }

  return origins
}

function deny(
  res: Parameters<RequestHandler>[1],
  code: string,
  message: string,
  status = 403,
): void {
  res.status(status).json({
    error: {
      code,
      message,
    },
  })
}

function createCorsMiddleware(allowedOrigins: ReadonlySet<string>): RequestHandler {
  return (req, res, next) => {
    const origin = req.get('origin')

    res.vary('Origin')

    if (!origin) {
      next()
      return
    }

    if (!allowedOrigins.has(origin)) {
      if (req.method === 'OPTIONS') {
        deny(res, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed.')
        return
      }

      next()
      return
    }

    res.setHeader('Access-Control-Allow-Origin', origin)

    res.setHeader('Access-Control-Allow-Credentials', 'true')

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')

    res.setHeader(
      'Access-Control-Allow-Headers',
      ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'].join(', '),
    )

    res.setHeader('Access-Control-Max-Age', '600')

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    next()
  }
}

function createOriginGuard(allowedOrigins: ReadonlySet<string>): RequestHandler {
  return (req, res, next) => {
    const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

    if (!mutatingMethods.has(req.method)) {
      next()
      return
    }

    const origin = req.get('origin')
    const referer = req.get('referer')
    const fetchSite = req.get('sec-fetch-site')

    // A present Origin must always be trusted.
    if (origin && !allowedOrigins.has(origin)) {
      deny(res, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed.')
      return
    }

    // Check Referer when Origin is absent.
    if (!origin && referer) {
      let refererOrigin: string | null = null

      try {
        refererOrigin = new URL(referer).origin
      } catch {
        // Invalid referer is rejected below.
      }

      if (!refererOrigin || !allowedOrigins.has(refererOrigin)) {
        deny(res, 'ORIGIN_NOT_ALLOWED', 'Request referer is not allowed.')
        return
      }
    }

    // Block browser cross-site writes unless their
    // actual Origin is explicitly trusted.
    if (fetchSite === 'cross-site' && (!origin || !allowedOrigins.has(origin))) {
      deny(res, 'CROSS_SITE_REQUEST_BLOCKED', 'Cross-site request blocked.')
      return
    }

    // Requests with no Origin, Referer, or Fetch
    // Metadata are allowed for authenticated
    // non-browser clients, including Playwright.
    // Existing authentication is still required.
    next()
  }
}

function createBodySizeGuard(maximumBytes: number): RequestHandler {
  return (req, res, next) => {
    const declaredLength = req.get('content-length')

    if (declaredLength !== undefined) {
      const size = Number(declaredLength)

      if (!Number.isSafeInteger(size) || size < 0) {
        deny(res, 'INVALID_CONTENT_LENGTH', 'Invalid Content-Length header.', 400)
        return
      }

      if (size > maximumBytes) {
        deny(res, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the allowed size.', 413)
        return
      }
    }

    next()
  }
}

function createLimiter(
  limit: number,
  message: string,
  skip: (path: string, method: string) => boolean,
): RequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,

    skip: (req) => req.method === 'OPTIONS' || skip(req.path, req.method),

    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message,
        },
      })
    },
  })
}

export function installHttpSecurity(app: Express, options: HttpSecurityOptions = {}): void {
  const allowedOrigins = resolveAllowedOrigins(options)

  const apiLimit = options.apiLimit ?? 240
  const authLimit = options.authLimit ?? 15
  const aiLimit = options.aiLimit ?? 5

  const maxRequestBytes = options.maxRequestBytes ?? 256 * 1024

  if (
    [apiLimit, authLimit, aiLimit, maxRequestBytes].some(
      (value) => !Number.isSafeInteger(value) || value <= 0,
    )
  ) {
    throw new Error('Security limits must be positive integers.')
  }

  app.disable('x-powered-by')

  // Standard security headers.
  // Avoid HTTPS upgrade and HSTS during local HTTP development.
  app.use(
    helmet({
      hsts: process.env.NODE_ENV === 'production',
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  )

  // The following protections run on /api routes.
  // Install before API and authentication route mounts.
  app.use('/api', createCorsMiddleware(allowedOrigins))

  app.use('/api', createOriginGuard(allowedOrigins))

  app.use('/api', createBodySizeGuard(maxRequestBytes))

  // General API limit:
  // 240 requests per 15 minutes per IP by default.
  app.use(
    '/api',
    createLimiter(apiLimit, 'Too many API requests. Try again later.', () => false),
  )

  // Tighter limits on email sign-in and sign-up.
  app.use(
    '/api',
    createLimiter(
      authLimit,
      'Too many authentication attempts. Try again later.',
      (path, method) => method !== 'POST' || !/^\/auth\/(sign-in|sign-up)\/email\/?$/.test(path),
    ),
  )

  // Limit only requests that execute new analyses.
  // History GET and suggestion-saving POST are excluded.
  app.use(
    '/api',
    createLimiter(
      aiLimit,
      'AI analysis limit reached. Try again later.',
      (path, method) => method !== 'POST' || !/^\/projects\/[^/]+\/analyses\/?$/.test(path),
    ),
  )
}
