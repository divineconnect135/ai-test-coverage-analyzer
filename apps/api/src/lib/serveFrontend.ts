import { existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

import express, { type Express } from 'express'

function findFrontendDist(): string {
  const candidates = [
    process.env.WEB_DIST_DIR,
    resolve(process.cwd(), 'apps/web/dist'),
    resolve(process.cwd(), '../web/dist'),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  for (const candidate of candidates) {
    const directory = resolve(candidate)

    if (existsSync(join(directory, 'index.html'))) {
      return directory
    }
  }

  throw new Error(
    [
      'Production frontend build not found.',
      'Build apps/web before starting the API.',
      'Expected apps/web/dist/index.html.',
    ].join(' '),
  )
}

export function serveProductionFrontend(app: Express): void {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  const distDirectory = findFrontendDist()

  // Serve compiled JavaScript, CSS, images, etc.
  app.use(
    express.static(distDirectory, {
      index: false,
      maxAge: '1h',

      setHeaders(res, filePath) {
        if (/[/\\]assets[/\\]/.test(filePath)) {
          // Vite assets have content hashes.
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )

  // Express 5 supports /{*splat}.
  // It matches / and nested React routes.
  app.get('/{*splat}', (req, res, next) => {
    // Never return React HTML for API paths.
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      next()
      return
    }

    // Missing CSS, JS, and image files must
    // remain 404s instead of returning HTML.
    if (extname(req.path)) {
      next()
      return
    }

    // Only navigation requests get the SPA shell.
    if (!req.accepts('html')) {
      next()
      return
    }

    res.setHeader('Cache-Control', 'no-cache')

    res.sendFile(join(distDirectory, 'index.html'), (error) => {
      if (error) {
        next(error)
      }
    })
  })
}
