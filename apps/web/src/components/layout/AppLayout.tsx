import { Link, NavLink, Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link to="/" className="text-lg font-semibold">
          AI Test Coverage Analyzer
        </Link>
      </header>

      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-800 p-4 md:w-56 md:border-r md:border-b-0">
          <nav aria-label="Application navigation" className="flex gap-2 md:flex-col">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              Dashboard
            </NavLink>

            <Link
              to="/"
              className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Home
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
