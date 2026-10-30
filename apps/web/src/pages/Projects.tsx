import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, FolderKanban, Plus, RefreshCw, Search } from 'lucide-react'

import { getProjects, type Project } from '../lib/projects-api'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
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
        if (!controller.signal.aborted) {
          setProjects(result)
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unable to load projects.')
        }
      })

    return () => controller.abort()
  }, [reloadKey])

  function refresh() {
    setError('')
    setProjects(null)
    setReloadKey((value) => value + 1)
  }

  const query = search.trim().toLowerCase()

  const filteredProjects = (projects ?? []).filter(
    (project) =>
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query),
  )

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="mt-2 text-sm text-slate-500">Manage your test coverage projects.</p>
        </div>

        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={17} />
          New Project
        </Link>
      </header>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-slate-300 px-4 py-2.5 hover:bg-slate-50"
          aria-label="Refresh projects"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {!projects && !error && (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          Loading projects...
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 text-sm font-medium text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {projects && !error && projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <FolderKanban size={34} className="mx-auto text-blue-600" />

          <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>

          <p className="mt-2 text-sm text-slate-500">Create your first project to get started.</p>

          <Link
            to="/projects/new"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm text-white"
          >
            Create Project
          </Link>
        </div>
      )}

      {projects && !error && projects.length > 0 && filteredProjects.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-500">No projects match your search.</p>
      )}

      {projects && !error && filteredProjects.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <FolderKanban size={24} className="text-blue-600" />
                <ArrowUpRight size={18} className="text-slate-400" />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">{project.name}</h2>

              <p className="mt-2 min-h-10 text-sm text-slate-500">
                {project.description || 'No description provided.'}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center">
                <div>
                  <p className="text-xl font-semibold">{project.requirementCount}</p>
                  <p className="text-xs text-slate-500">Requirements</p>
                </div>

                <div>
                  <p className="text-xl font-semibold">{project.testCaseCount}</p>
                  <p className="text-xs text-slate-500">Test Cases</p>
                </div>

                <div>
                  <p className="text-xl font-semibold">{project.analysisCount}</p>
                  <p className="text-xs text-slate-500">Analyses</p>
                </div>
              </div>

              <p className="mt-5 text-xs text-slate-400">Updated {formatDate(project.updatedAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Projects
