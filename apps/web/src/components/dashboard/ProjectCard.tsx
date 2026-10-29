import type { ProjectPreview } from '../../data/mockProjects'

type ProjectCardProps = {
  project: ProjectPreview
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="text-lg font-semibold text-white">{project.name}</h3>

      <p className="mt-2 text-sm text-slate-400">{project.description}</p>

      <dl className="mt-5 flex flex-wrap gap-5 border-t border-slate-800 pt-4">
        <div>
          <dt className="text-xs text-slate-500">Requirements</dt>
          <dd className="mt-1 font-semibold text-slate-200">{project.requirementCount}</dd>
        </div>

        <div>
          <dt className="text-xs text-slate-500">Test Cases</dt>
          <dd className="mt-1 font-semibold text-slate-200">{project.testCaseCount}</dd>
        </div>
      </dl>
    </article>
  )
}
