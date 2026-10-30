import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  FlaskConical,
  FolderKanban,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { getProjects, type Project } from '../lib/projects-api'

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return date.toLocaleDateString('en-US', {
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
        if (controller.signal.aborted) return

        if (!Array.isArray(result)) {
          throw new Error('The server returned an invalid projects list.')
        }

        setProjects(result)
        setError('')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return

        setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.')
      })

    return () => controller.abort()
  }, [reloadKey])

  function refresh() {
    setProjects(null)
    setError('')
    setReloadKey((current) => current + 1)
  }

  const projectList = projects ?? []

  const totals = projectList.reduce(
    (result, project) => {
      result.requirements += project.requirementCount || 0
      result.testCases += project.testCaseCount || 0
      result.analyses += project.analysisCount || 0
      return result
    },
    {
      requirements: 0,
      testCases: 0,
      analyses: 0,
    },
  )

  const stats = [
    {
      title: 'Total Projects',
      value: projectList.length,
      icon: FolderKanban,
      color: 'text-blue-400',
      background: 'bg-blue-500/10',
    },
    {
      title: 'Requirements',
      value: totals.requirements,
      icon: FileText,
      color: 'text-violet-400',
      background: 'bg-violet-500/10',
    },
    {
      title: 'Test Cases',
      value: totals.testCases,
      icon: FlaskConical,
      color: 'text-cyan-400',
      background: 'bg-cyan-500/10',
    },
    {
      title: 'AI Analyses',
      value: totals.analyses,
      icon: BrainCircuit,
      color: 'text-emerald-400',
      background: 'bg-emerald-500/10',
    },
  ]

  const recentProjects = [...projectList]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const nextProject = recentProjects[0]

  return (
    <main className="min-h-full w-full bg-[#020617] px-5 py-8 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Dashboard header */}
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
              Workspace Overview
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Monitor your projects, testing progress, and AI analysis activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refresh}
              aria-label="Refresh dashboard"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-blue-500 hover:bg-slate-800"
            >
              <RefreshCw size={18} />
            </button>

            <Link
              to="/projects/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500"
            >
              <Plus size={18} />
              New Project
            </Link>
          </div>
        </header>

        {/* Loading */}
        {projects === null && !error && (
          <div
            role="status"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center"
          >
            <RefreshCw size={26} className="mx-auto animate-spin text-blue-400" />

            <p className="mt-4 text-sm text-slate-300">Loading dashboard...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6">
            <h2 className="font-semibold text-red-200">Unable to load dashboard</h2>

            <p className="mt-2 text-sm text-red-300">{error}</p>

            <button
              type="button"
              onClick={refresh}
              className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {projects !== null && !error && (
          <>
            {/* Real statistics */}
            <section
              aria-label="Workspace statistics"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {stats.map(({ title, value, icon: Icon, color, background }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-lg shadow-black/20 transition hover:border-blue-500/50 hover:bg-slate-800/80"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-300">{title}</p>

                    <div className={`rounded-xl p-3 ${background} ${color}`}>
                      <Icon size={22} />
                    </div>
                  </div>

                  <p className="mt-5 text-4xl font-bold tracking-tight text-white">{value}</p>

                  <p className="mt-2 text-xs text-slate-400">Across your workspace</p>
                </div>
              ))}
            </section>

            {/* Recent Projects */}
            <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/70 bg-slate-800/50 px-6 py-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">
                    Project Activity
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-white">Recent Projects</h2>

                  <p className="mt-2 text-sm text-slate-300">
                    Your five most recently updated projects.
                  </p>
                </div>

                <Link
                  to="/projects"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
                >
                  View All
                  <ArrowRight size={17} />
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FolderKanban size={35} className="mx-auto text-blue-400" />

                  <h3 className="mt-4 text-lg font-semibold text-white">No projects yet</h3>

                  <p className="mt-2 text-sm text-slate-300">Create a project to get started.</p>

                  <Link
                    to="/projects/new"
                    className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Create Project
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 p-5 sm:p-6">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="group flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-950/70 p-5 transition hover:border-blue-500/60 hover:bg-slate-800"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="rounded-xl bg-blue-500/15 p-3 text-blue-400">
                          <FolderKanban size={21} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-base font-semibold text-white group-hover:text-blue-300">
                            {project.name}
                          </h3>

                          <p className="mt-1 text-sm text-slate-300">
                            {project.description || 'No description provided.'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200">
                              {project.requirementCount} Requirements
                            </span>

                            <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200">
                              {project.testCaseCount} Test Cases
                            </span>

                            <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200">
                              {project.analysisCount} Analyses
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 text-sm text-slate-300">
                        {formatDate(project.updatedAt)}
                        <ArrowRight size={18} className="text-blue-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Next action */}
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/15 p-3 text-blue-400">
                    <Sparkles size={22} />
                  </div>

                  <h2 className="text-lg font-bold text-white">AI Test Coverage Analysis</h2>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-300">
                  Review requirements and existing tests to identify possible coverage gaps and
                  generate additional test-case suggestions.
                </p>

                <Link
                  to={nextProject ? `/projects/${nextProject.id}#ai-analysis` : '/projects/new'}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Open AI Workspace
                  <ArrowRight size={17} />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-700/80 bg-slate-900 p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-500/15 p-3 text-violet-400">
                    <FileText size={22} />
                  </div>

                  <h2 className="text-lg font-bold text-white">Testing Workspace</h2>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-300">
                  Keep requirements organized, document test scenarios, and connect tests to the
                  functionality they validate.
                </p>

                <Link
                  to="/projects"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Manage Projects
                  <ArrowRight size={17} />
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default Dashboard
