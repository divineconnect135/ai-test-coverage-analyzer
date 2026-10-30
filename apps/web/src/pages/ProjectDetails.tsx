import { useEffect, useState, type FormEvent } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  ArrowLeft,
  BrainCircuit,
  FileText,
  FlaskConical,
  FolderKanban,
  History,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import { deleteProject, getProject, updateProject, type Project } from '../lib/projects-api'

import { RequirementsSection } from '../components/requirements/RequirementsSection'

import { TestCasesSection } from '../components/test-cases/TestCasesSection'

import { AnalysisSection } from '../components/analysis/AnalysisSection'

import { AnalysisHistorySection } from '../components/analysis/AnalysisHistorySection'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function ProjectDetailsContent({ projectId }: { projectId: string }) {
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState('')

  const [requirementsVersion, setRequirementsVersion] = useState(0)

  const [savedTestsVersion, setSavedTestsVersion] = useState(0)

  const [analysisInputsVersion, setAnalysisInputsVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    void getProject(projectId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return

        setProject(result)
        setName(result.name)
        setDescription(result.description)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        setLoadError(error instanceof Error ? error.message : 'Unable to load project.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [projectId])

  function cancelEdit() {
    if (!project) return

    setName(project.name)
    setDescription(project.description)
    setActionError('')
    setIsEditing(false)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project || isSaving || isDeleting) return

    const cleanedName = name.trim()
    const cleanedDescription = description.trim()

    if (cleanedName.length < 2 || cleanedName.length > 100) {
      setActionError('Project name must contain 2–100 characters.')
      return
    }

    if (cleanedDescription.length > 1000) {
      setActionError('Description cannot exceed 1000 characters.')
      return
    }

    setIsSaving(true)
    setActionError('')

    try {
      const updated = await updateProject(projectId, {
        name: cleanedName,
        description: cleanedDescription,
      })

      setProject(updated)
      setName(updated.name)
      setDescription(updated.description)
      setIsEditing(false)

      setAnalysisInputsVersion((current) => current + 1)
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'Unable to update project.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!project || isDeleting || isSaving) return

    setIsDeleting(true)
    setActionError('')

    try {
      await deleteProject(projectId)

      navigate('/projects', {
        replace: true,
      })
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete project.')

      setIsDeleting(false)
    }
  }

  function handleRequirementCountChange(difference: number) {
    setProject((current) =>
      current
        ? {
            ...current,
            requirementCount: Math.max(0, current.requirementCount + difference),
          }
        : current,
    )

    setRequirementsVersion((current) => current + 1)

    setAnalysisInputsVersion((current) => current + 1)
  }

  function handleTestCaseCountChange(difference: number) {
    setProject((current) =>
      current
        ? {
            ...current,
            testCaseCount: Math.max(0, current.testCaseCount + difference),
          }
        : current,
    )

    setAnalysisInputsVersion((current) => current + 1)
  }

  function handleSuggestionSaved() {
    handleTestCaseCountChange(1)

    setSavedTestsVersion((current) => current + 1)
  }

  if (isLoading) {
    return (
      <div role="status" className="p-8 text-sm text-slate-300">
        Loading project details...
      </div>
    )
  }

  if (loadError || !project) {
    return (
      <div className="space-y-5 p-6 lg:p-8">
        <Link to="/projects" className="text-sm font-medium text-blue-400">
          Back to Projects
        </Link>

        <div role="alert" className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-xl font-semibold text-white">Project unavailable</h1>

          <p className="mt-2 text-sm text-slate-300">{loadError || 'Project not found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-7 p-6 text-slate-100 lg:p-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400"
      >
        <ArrowLeft size={17} />
        Back to Projects
      </Link>

      {/* Project details */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
        <div className="border-b border-slate-800 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="shrink-0 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                <FolderKanban size={26} />
              </div>

              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-white lg:text-3xl">
                  {project.name}
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Updated {formatDate(project.updatedAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isEditing || isSaving || isDeleting}
                onClick={() => {
                  setActionError('')
                  setConfirmDelete(false)
                  setIsEditing(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-50"
              >
                <Pencil size={16} />
                Edit Project
              </button>

              <button
                type="button"
                disabled={isSaving || isDeleting}
                onClick={() => {
                  cancelEdit()
                  setActionError('')
                  setConfirmDelete(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Delete Project
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!isEditing && (
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Description</h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {project.description || 'No description provided.'}
              </p>
            </div>
          )}

          {isEditing && (
            <form onSubmit={(event) => void handleSave(event)} className="space-y-5">
              <div>
                <label
                  htmlFor="edit-project-name"
                  className="block text-sm font-semibold text-slate-200"
                >
                  Project Name
                </label>

                <input
                  id="edit-project-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSaving}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-project-description"
                  className="block text-sm font-semibold text-slate-200"
                >
                  Description
                </label>

                <textarea
                  id="edit-project-description"
                  rows={5}
                  maxLength={1000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isSaving}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </form>
          )}

          {confirmDelete && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-950/30 p-5">
              <h2 className="font-semibold text-red-100">Delete this project permanently?</h2>

              <p className="mt-2 text-sm leading-6 text-red-200">
                Deleting "{project.name}" also deletes its requirements, test cases, and analysis
                history. This action cannot be undone.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleDelete()}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Project'}
                </button>
              </div>
            </div>
          )}

          {actionError && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
            >
              {actionError}
            </p>
          )}
        </div>
      </section>

      {/* Live project statistics */}
      <section className="grid gap-4 sm:grid-cols-3">
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
            label: 'AI Analyses',
            value: project.analysisCount,
            icon: Sparkles,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/10"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-300">{label}</p>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
                <Icon size={20} />
              </div>
            </div>

            <p className="mt-5 text-4xl font-bold text-white">{value}</p>

            <p className="mt-2 text-xs text-slate-400">Current project total</p>
          </div>
        ))}
      </section>

      {/* Quick navigation */}
      <div className="flex flex-wrap gap-5">
        <a
          href="#ai-analysis"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          <BrainCircuit size={17} />
          Go to AI Analysis
        </a>

        <a
          href="#analysis-history"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          <History size={17} />
          Go to Analysis History
        </a>
      </div>

      {/* Phase 7 */}
      <RequirementsSection projectId={projectId} onCountChange={handleRequirementCountChange} />

      {/* Phase 8 */}
      <TestCasesSection
        key={`${projectId}-${requirementsVersion}-${savedTestsVersion}`}
        projectId={projectId}
        onCountChange={handleTestCaseCountChange}
      />

      {/* Phases 9–10 */}
      <AnalysisSection
        projectId={projectId}
        refreshToken={analysisInputsVersion}
        onTestCaseSaved={handleSuggestionSaved}
      />

      {/* Phase 11 */}
      <AnalysisHistorySection projectId={projectId} />
    </div>
  )
}

// A new project ID creates a fresh page state.
export function ProjectDetails() {
  const { projectId } = useParams<{
    projectId: string
  }>()

  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-white">Project unavailable</h1>

        <Link to="/projects" className="mt-4 inline-block text-sm text-blue-400">
          Back to Projects
        </Link>
      </div>
    )
  }

  return <ProjectDetailsContent key={projectId} projectId={projectId} />
}

export default ProjectDetails
