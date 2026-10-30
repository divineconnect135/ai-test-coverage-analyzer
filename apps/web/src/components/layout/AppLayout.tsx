import { useEffect, useId, useRef, useState } from 'react'

import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import {
  ArrowRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'

import { authClient } from '../../../lib/auth-client'
import { RenderErrorBoundary } from '../ui/RenderErrorBoundary'

const navigation = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/projects',
    label: 'Projects',
    icon: FolderKanban,
  },
] as const

function WorkspaceLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Workspace navigation" className="space-y-2">
      {navigation.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex min-h-12 items-center gap-3 rounded-xl',
                'border px-4 py-3 text-sm font-semibold',
                'transition focus-visible:outline-offset-2',
                isActive
                  ? 'border-blue-500/40 bg-blue-600/20 text-white'
                  : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white',
              ].join(' ')
            }
          >
            <Icon size={19} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function SignOutButton({ onSuccess }: { onSuccess?: () => void }) {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState('')

  async function handleSignOut() {
    if (isSigningOut) return

    setIsSigningOut(true)
    setError('')

    try {
      const result = await authClient.signOut()

      if (result.error) {
        throw new Error(result.error.message ?? 'Unable to sign out.')
      }

      onSuccess?.()
      navigate('/login', { replace: true })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign out.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isSigningOut}
        onClick={() => void handleSignOut()}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50"
      >
        <LogOut size={19} aria-hidden="true" />
        {isSigningOut ? 'Signing out...' : 'Sign Out'}
      </button>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"
        >
          {error}
        </p>
      )}
    </div>
  )
}

function WorkspaceBrand() {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-3 rounded-xl px-2 py-2"
      aria-label="AI Test Coverage Analyzer dashboard"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/15 text-blue-400">
        <Sparkles size={23} aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold leading-5 text-white">AI Test Coverage</p>
        <p className="text-xs font-medium text-slate-400">Analyzer</p>
      </div>
    </Link>
  )
}

function DesktopSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-[#0b1426] lg:flex">
      <div className="border-b border-slate-800 px-5 py-5">
        <WorkspaceBrand />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6">
        <p className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Workspace
        </p>

        <WorkspaceLinks />

        <Link
          to="/projects/new"
          className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
        >
          <Plus size={18} />
          New Project
        </Link>

        <div className="mt-auto pt-8">
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldCheck size={18} className="text-blue-400" />
              <span className="text-sm font-semibold">Your Workspace</span>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Manage requirements, tests, and AI analysis within your account.
            </p>
          </div>

          <SignOutButton />
        </div>
      </div>
    </aside>
  )
}

function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)

  const drawerId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const trigger = triggerRef.current
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    drawerRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      )

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [isOpen])

  const close = () => setIsOpen(false)

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-800 bg-[#0b1426]/95 px-4 backdrop-blur-lg lg:hidden">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-blue-500/15 p-2 text-blue-400">
            <Sparkles size={21} aria-hidden="true" />
          </div>

          <span className="truncate text-sm font-bold text-white">AI Test Coverage</span>
        </Link>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls={drawerId}
          aria-label="Open navigation menu"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-white"
        >
          <Menu size={22} />
        </button>
      </header>

      {isOpen && (
        <>
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
          />

          <aside
            id={drawerId}
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile workspace navigation"
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col overflow-y-auto border-r border-slate-700 bg-[#0b1426] p-5 shadow-2xl outline-none lg:hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-5">
              <WorkspaceBrand />

              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-7 space-y-6">
              <WorkspaceLinks onNavigate={close} />

              <Link
                to="/projects/new"
                onClick={close}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
              >
                <Plus size={18} />
                New Project
              </Link>
            </div>

            <div className="mt-auto border-t border-slate-800 pt-6">
              <SignOutButton onSuccess={close} />
            </div>
          </aside>
        </>
      )}
    </>
  )
}

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/projects') return 'Projects'
  if (pathname === '/projects/new') return 'Create Project'

  if (pathname.startsWith('/projects/')) {
    return 'Project Workspace'
  }

  return 'Workspace'
}

export function AppLayout() {
  const location = useLocation()

  useEffect(() => {
    document.title = `${getPageTitle(location.pathname)} | AI Test Coverage Analyzer`
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:not-sr-only focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-3 focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <DesktopSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNavigation key={location.pathname} />

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          <RenderErrorBoundary key={location.pathname}>
            <Outlet />
          </RenderErrorBoundary>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#071022] px-6 py-4 text-xs text-slate-400">
          <span>AI Test Coverage Analyzer</span>

          <span className="inline-flex items-center gap-1">
            Assess potential gaps
            <ArrowRight size={13} />
            Review suggested tests
          </span>
        </footer>
      </div>
    </div>
  )
}

export default AppLayout
