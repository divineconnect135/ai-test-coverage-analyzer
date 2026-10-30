import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

import { authClient } from '../../lib/auth-client'

export function LogoutButton() {
  const navigate = useNavigate()

  type SidebarSession = {
    user: {
      name: string
      email: string
    }
  }

  const { data } = authClient.useSession()
  const session: SidebarSession | null = data

  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    if (isSigningOut) return

    setIsSigningOut(true)
    setError('')

    try {
      const result = await authClient.signOut()

      if (result.error) {
        setError(result.error.message ?? 'Unable to sign out.')
        return
      }

      navigate('/login', { replace: true })
    } catch {
      setError('Unable to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="space-y-2">
      {session?.user && (
        <div className="px-3">
          <p className="truncate text-sm font-medium">{session.user.name}</p>
          <p className="truncate text-xs text-slate-500">{session.user.email}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isSigningOut}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
      >
        <LogOut size={16} />
        {isSigningOut ? 'Signing out...' : 'Sign out'}
      </button>

      {error && (
        <p role="alert" className="px-3 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
