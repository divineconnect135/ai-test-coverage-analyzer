import { Navigate, Outlet } from 'react-router'
import { authClient } from '../../../lib/auth-client'

function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">Checking your session...</p>
    </div>
  )
}

export function RequireAuth() {
  const { data: session, isPending, error, refetch } = authClient.useSession()

  if (isPending) {
    return <SessionLoading />
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p role="alert" className="text-sm text-red-600">
          Unable to verify your session.
        </p>

        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function GuestOnly() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <SessionLoading />
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
