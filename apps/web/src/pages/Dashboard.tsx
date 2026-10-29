import { ClipboardList, FolderKanban, History, ListChecks } from 'lucide-react'

import StatCard from '../components/dashboard/StatCard'
import ProjectCard from '../components/dashboard/ProjectCard'
import EmptyState from '../components/ui/EmptyState'
import { mockProjects } from '../data/mockProjects'

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Page heading */}
      <header>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>

        <p className="mt-2 text-slate-400">Overview of your software testing workspace.</p>

        <p className="mt-3 text-xs text-blue-400">
          UI preview — real account data is not connected yet.
        </p>
      </header>

      {/* Statistics */}
      <section aria-label="Project statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Projects"
          value="—"
          icon={FolderKanban}
          description="Available after database integration"
        />

        <StatCard
          title="Requirements"
          value="—"
          icon={ClipboardList}
          description="Available after database integration"
        />

        <StatCard
          title="Test Cases"
          value="—"
          icon={ListChecks}
          description="Available after database integration"
        />
      </section>

      {/* Sample projects */}
      <section aria-labelledby="projects-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="projects-heading" className="text-xl font-semibold text-white">
            Example Projects
          </h2>

          <span className="text-xs text-slate-500">Fictional preview data</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {mockProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      {/* Analysis history */}
      <section aria-labelledby="analysis-heading">
        <h2 id="analysis-heading" className="mb-5 text-xl font-semibold text-white">
          Recent Analyses
        </h2>

        <EmptyState
          icon={History}
          title="No analyses yet"
          description="Your saved AI analyses will appear here after the analysis feature is implemented."
        />
      </section>
    </div>
  )
}
