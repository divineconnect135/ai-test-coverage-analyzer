import { Link, NavLink, Outlet } from 'react-router'
import { LayoutDashboard, FolderKanban, House } from 'lucide-react'
import { LogoutButton } from '../auth/LogoutButton'

const navigation = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    end: false,
  },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Application Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <Link to="/" className="text-lg font-semibold text-white">
          AI Test Coverage Analyzer
        </Link>
      </header>

      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 border-b border-slate-800 p-4 md:w-56 md:border-r md:border-b-0">
          <nav aria-label="Application navigation" className="flex flex-wrap gap-2 md:flex-col">
            {navigation.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </NavLink>
              )
            })}
            <LogoutButton />

            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <House size={18} aria-hidden="true" />
              Home
            </Link>
          </nav>
        </aside>

        {/* Page Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
