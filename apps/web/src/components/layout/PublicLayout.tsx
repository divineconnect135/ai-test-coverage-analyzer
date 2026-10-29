import { Link, Outlet } from 'react-router'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold text-white">
            AI Test Coverage Analyzer
          </Link>

          <nav aria-label="Public navigation">
            <Link to="/dashboard" className="text-sm text-slate-300 transition hover:text-white">
              Dashboard Preview
            </Link>
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
