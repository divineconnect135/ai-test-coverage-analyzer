import type { RequestHandler } from 'express'
import { fromNodeHeaders } from 'better-auth/node'

import { auth } from '../lib/auth.js'
import { AppError } from '../errors/AppError.js'

export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })

  if (!session) {
    next(new AppError(401, 'UNAUTHORIZED', 'You must be signed in to access this resource.'))
    return
  }

  res.locals.authUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  }

  next()
}
