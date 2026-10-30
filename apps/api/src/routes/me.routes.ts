import { Router } from 'express'

import { requireAuth } from '../middleware/requireAuth.js'

export const meRouter = Router()

meRouter.get('/', requireAuth, (_req, res) => {
  res.status(200).json({
    user: res.locals.authUser,
  })
})
