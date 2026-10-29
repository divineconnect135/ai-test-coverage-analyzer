import { Link, useParams } from 'react-router'
import { ArrowLeft, ClipboardList, History, ListChecks, Sparkles } from 'lucide-react'

import StatCard from '../components/dashboard/StatCard'
import EmptyState from '../components/ui/EmptyState'
import { mockProjects } from '../data/mockProjects'
import { mockProjectDetails, type MockTestCase } from '../data/mockProjectDetails'

const statusStyles: Record<MockTestCase['status'], string> = {
  DRAFT: 'bg-slate-700 text-slate-200',
  READY: 'bg-blue-500/10 text-blue-400',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400',
}

export default function ProjectDetails() {
  const { projectId } = useParams<'projectId'>()

  const project = mockProjects.find((item) => item.id === projectId)
  const details = projectId ? mockProjectDetails[projectId] : undefined

  if (!project || !details) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Project not found</h1>

        <p className="text-slate-400">No example project exists with this identifier.</p>

        <Link to="/projects" className="inline-block text-blue-400 hover:underline">
          Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Project heading */}
      <header>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Projects
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-white">{project.name}</h1>

        <p className="mt-2 text-slate-400">{project.description}</p>

        <p className="mt-3 text-xs text-blue-400">Preview mode — fictional project data</p>
      </header>

      {/* Summary */}
      <section aria-label="Project summary" className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Requirements" value={details.requirements.length} icon={ClipboardList} />

        <StatCard title="Test Cases" value={details.testCases.length} icon={ListChecks} />

        <StatCard title="Saved Analyses" value={0} icon={History} description="No mock analyses" />
      </section>

      {/* Section navigation */}
      <nav
        aria-label="Project sections"
        className="flex flex-wrap gap-4 border-b border-slate-800 pb-4 text-sm"
      >
        <a href="#requirements" className="text-blue-400 hover:underline">
          Requirements
        </a>

        <a href="#test-cases" className="text-blue-400 hover:underline">
          Test Cases
        </a>

        <a href="#analysis" className="text-blue-400 hover:underline">
          AI Analysis
        </a>
      </nav>

      {/* Requirements */}
      <section id="requirements" className="scroll-mt-6">
        <h2 className="mb-5 text-xl font-semibold text-white">Requirements</h2>

        <div className="space-y-3">
          {details.requirements.map((requirement) => (
            <article
              key={requirement.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-xs font-medium text-blue-400">{requirement.id}</p>

              <h3 className="mt-2 font-semibold text-white">{requirement.title}</h3>

              <p className="mt-2 text-sm text-slate-400">{requirement.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Test Cases */}
      <section id="test-cases" className="scroll-mt-6">
        <h2 className="mb-5 text-xl font-semibold text-white">Existing Test Cases</h2>

        <div className="space-y-3">
          {details.testCases.map((testCase) => (
            <article
              key={testCase.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">{testCase.id}</p>

                  <h3 className="mt-2 font-semibold text-white">{testCase.title}</h3>
                </div>

                <span
                  className={`rounded-md px-3 py-1 text-xs font-medium ${statusStyles[testCase.status]}`}
                >
                  {testCase.status}
                </span>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Related requirements: {testCase.requirementIds.join(', ')}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Completed status does not indicate a passing test result.
        </p>
      </section>

      {/* AI Analysis */}
      <section id="analysis" className="scroll-mt-6">
        <h2 className="mb-5 text-xl font-semibold text-white">AI Test Analysis</h2>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
          <Sparkles size={32} aria-hidden="true" className="mx-auto text-blue-400" />

          <h3 className="mt-4 text-lg font-semibold text-white">
            Discover potential coverage gaps
          </h3>

          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
            AI analysis will compare your requirements with existing test cases and suggest
            potentially missing scenarios.
          </p>

          <button
            type="button"
            disabled
            className="mt-6 cursor-not-allowed rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-400"
          >
            Analyze with AI
          </button>

          <p className="mt-3 text-xs text-slate-500">Available after OpenAI backend integration.</p>
        </div>
      </section>

      {/* History */}
      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-5 text-xl font-semibold text-white">
          Recent Analyses
        </h2>

        <EmptyState
          icon={History}
          title="No analyses yet"
          description="Saved analysis results will appear here after the AI analysis feature is implemented."
        />
      </section>
    </div>
  )
}
