import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  FileText,
  FlaskConical,
  FolderKanban,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { getProjects, type Project } from '../lib/projects-api'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    void getProjects(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setProjects(result)
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.')
        }
      })

    return () => controller.abort()
  }, [reloadKey])

  function refreshDashboard() {
    setProjects(null)
    setError('')
    setReloadKey((value) => value + 1)
  }

  const totals = (projects ?? []).reduce(
    (summary, project) => {
      summary.requirements += project.requirementCount
      summary.testCases += project.testCaseCount
      summary.analyses += project.analysisCount
      return summary
    },
    {
      requirements: 0,
      testCases: 0,
      analyses: 0,
    },
  )

  const stats = [
    {
      label: 'Total Projects',
      value: projects?.length ?? 0,
      icon: FolderKanban,
    },
    {
      label: 'Requirements',
      value: totals.requirements,
      icon: FileText,
    },
    {
      label: 'Test Cases',
      value: totals.testCases,
      icon: FlaskConical,
    },
    {
      label: 'AI Analyses',
      value: totals.analyses,
      icon: Sparkles,
    },
  ]

  const recentProjects = [...(projects ?? [])]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

          <p className="mt-2 text-sm text-slate-500">Your project and testing activity overview.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshDashboard}
            aria-label="Refresh dashboard"
            className="rounded-lg border border-slate-300 p-2.5 hover:bg-slate-50"
          >
            <RefreshCw size={17} />
          </button>

          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            New Project
          </Link>
        </div>
      </header>

      {!projects && !error && (
        <div role="status" className="py-12 text-center text-sm text-slate-500">
          Loading dashboard...
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={refreshDashboard}
            className="mt-3 text-sm font-medium text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {projects && !error && (
        <>
          <section aria-label="Project statistics">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{label}</p>

                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <Icon size={20} />
                    </div>
                  </div>

                  <p className="mt-5 text-3xl font-bold text-slate-900">{value}</p>

                  <p className="mt-2 text-xs text-slate-400">Across your projects</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">Recent Projects</h2>
                <p className="mt-1 text-sm text-slate-500">Your most recently updated projects.</p>
              </div>

              <Link
                to="/projects"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
              >
                View All
                <ArrowRight size={16} />
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FolderKanban size={32} className="mx-auto text-blue-600" />

                <h3 className="mt-4 font-semibold">No projects yet</h3>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first project to start tracking requirements and test cases.
                </p>

                <Link
                  to="/projects/new"
                  className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
                >
                  Create Project
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                        <FolderKanban size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{project.name}</p>

                        <p className="mt-1 text-xs text-slate-500">
                          {project.requirementCount} requirements
                          {' · '}
                          {project.testCaseCount} test cases
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {formatDate(project.updatedAt)}
                      </span>

                      <ArrowRight size={17} className="text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="font-semibold text-slate-900">Test coverage analysis</h2>

            <p className="mt-2 text-sm text-slate-600">
              Project and record counts now use real database data. Coverage percentages and AI
              recommendations will be available after we implement requirements, test cases, and
              analysis workflows.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
