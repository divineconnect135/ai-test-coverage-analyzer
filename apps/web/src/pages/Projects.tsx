import { useState } from 'react'
import { Link } from 'react-router'
import { FolderOpen, Plus, Search } from 'lucide-react'

import ProjectCard from '../components/dashboard/ProjectCard'
import EmptyState from '../components/ui/EmptyState'
import { mockProjects } from '../data/mockProjects'

export default function Projects() {
  const [search, setSearch] = useState('')

  const filteredProjects = mockProjects.filter((project) => {
    const query = search.trim().toLowerCase()

    return (
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>

          <p className="mt-2 text-slate-400">Manage your software testing projects.</p>
        </div>

        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          <Plus size={18} aria-hidden="true" />
          New Project
        </Link>
      </header>

      <p className="text-sm text-blue-400">Preview mode — projects below are fictional examples.</p>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
        />

        <label htmlFor="project-search" className="sr-only">
          Search example projects
        </label>

        <input
          id="project-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      </div>

      {/* Project list */}
      <section aria-label="Example projects">
        {filteredProjects.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No matching projects"
            description="No example projects match your search. Try a different keyword."
          />
        )}
      </section>
    </div>
  )
}
