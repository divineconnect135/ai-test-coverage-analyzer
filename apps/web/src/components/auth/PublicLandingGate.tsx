import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

import { authClient } from '../../lib/auth-client'

type PublicLandingGateProps = {
  children: ReactNode
}

function hasAuthenticatedUser(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || !('user' in value)) {
    return false
  }

  const user = value.user

  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    typeof user.id === 'string' &&
    user.id.length > 0
  )
}

export function PublicLandingGate({ children }: PublicLandingGateProps) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <main
        role="status"
        className="flex min-h-screen items-center justify-center bg-[#020617] text-white"
      >
        <div className="flex items-center gap-3">
          <Sparkles size={23} className="text-blue-400" />

          <p className="text-sm text-slate-300">Checking your session...</p>
        </div>
      </main>
    )
  }

  if (hasAuthenticatedUser(session)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
