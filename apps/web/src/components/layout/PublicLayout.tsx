import { Link, Outlet } from 'react-router'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="text-lg font-semibold text-white">
            AI Test Coverage Analyzer
          </Link>

          <nav aria-label="Public navigation" className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-slate-300 hover:text-white">
              Sign In
            </Link>

            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
