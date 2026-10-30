import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  ArrowRight,
  FileText,
  FlaskConical,
  FolderKanban,
  Plus,
  RefreshCw,
  Search,
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

export function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null)

  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    void getProjects(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return

        setProjects(result)
        setError('')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return

        setError(reason instanceof Error ? reason.message : 'Unable to load projects.')
      })

    return () => controller.abort()
  }, [reloadKey])

  function refresh() {
    setProjects(null)
    setError('')
    setReloadKey((value) => value + 1)
  }

  const query = search.trim().toLowerCase()

  const filteredProjects = (projects ?? [])
    .filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query),
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const isLoading = projects === null && !error

  return (
    <div className="min-h-full w-full bg-[#020617] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Workspace</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Projects
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Manage project requirements, test cases, and AI coverage assessments.
            </p>
          </div>

          <Link
            to="/projects/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            <Plus size={18} />
            New Project
          </Link>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search
              size={19}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search projects"
              placeholder="Search project names and descriptions..."
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh projects"
            title="Refresh projects"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:border-blue-500/60 hover:bg-slate-700"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {isLoading && (
          <div
            role="status"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center"
          >
            <RefreshCw size={26} className="mx-auto animate-spin text-blue-400" />

            <p className="mt-4 text-sm text-slate-300">Loading projects...</p>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6">
            <p className="font-semibold text-red-200">Unable to load projects</p>

            <p className="mt-2 text-sm text-red-300">{error}</p>

            <button
              type="button"
              onClick={refresh}
              className="mt-4 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        )}

        {projects && !error && projects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center sm:p-14">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <FolderKanban size={30} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-white">No projects yet</h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-300">
              Create your first project to organize requirements and test cases.
            </p>

            <Link
              to="/projects/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus size={17} />
              Create Project
            </Link>
          </div>
        )}

        {projects && !error && projects.length > 0 && filteredProjects.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <Search size={29} className="mx-auto text-slate-400" />

            <h2 className="mt-4 font-semibold text-white">No matching projects</h2>

            <p className="mt-2 text-sm text-slate-300">Try a different search term.</p>

            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-4 text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              Clear Search
            </button>
          </div>
        )}

        {projects && !error && filteredProjects.length > 0 && (
          <section aria-label="Saved projects">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Your Projects</h2>

              <p className="text-sm text-slate-400">
                {filteredProjects.length} of {projects.length} shown
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="group flex min-w-0 flex-col rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-blue-500/60 hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                      <FolderKanban size={22} />
                    </div>

                    <ArrowRight
                      size={19}
                      className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-400"
                    />
                  </div>

                  <h3 className="mt-6 break-words text-xl font-bold text-white group-hover:text-blue-300">
                    {project.name}
                  </h3>

                  <p className="mt-3 min-h-14 break-words text-sm leading-7 text-slate-300">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-700 pt-5">
                    {[
                      {
                        label: 'Requirements',
                        value: project.requirementCount,
                        icon: FileText,
                      },
                      {
                        label: 'Test Cases',
                        value: project.testCaseCount,
                        icon: FlaskConical,
                      },
                      {
                        label: 'Analyses',
                        value: project.analysisCount,
                        icon: Sparkles,
                      },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="min-w-0 text-center">
                        <Icon size={17} className="mx-auto text-blue-400" aria-hidden="true" />

                        <p className="mt-2 text-2xl font-bold text-white">{value}</p>

                        <p className="mt-1 break-words text-[11px] text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                    <span className="text-xs text-slate-400">
                      Updated {formatDate(project.updatedAt)}
                    </span>

                    <span className="text-sm font-semibold text-blue-400">Open Project</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default Projects
