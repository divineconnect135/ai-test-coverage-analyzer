import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  FolderKanban,
  Pencil,
  Trash2,
  Save,
  X,
  FileText,
  FlaskConical,
  Sparkles,
} from 'lucide-react'

import { deleteProject, getProject, updateProject, type Project } from '../lib/projects-api'

import { RequirementsSection } from '../components/requirements/RequirementsSection'
import { TestCasesSection } from '../components/test-cases/TestCasesSection'

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
      navigate('/projects', { replace: true })
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

    // Refresh test cases when a requirement is
    // created or deleted so their links stay current.
    setRequirementsVersion((current) => current + 1)
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
  }

  if (isLoading) {
    return (
      <div role="status" className="p-8 text-sm text-slate-500">
        Loading project details...
      </div>
    )
  }

  if (loadError || !project) {
    return (
      <div className="space-y-5 p-6 lg:p-8">
        <Link to="/projects" className="text-sm font-medium text-blue-600">
          Back to Projects
        </Link>

        <div role="alert" className="rounded-xl border border-slate-200 p-8">
          <h1 className="text-xl font-semibold">Project unavailable</h1>

          <p className="mt-2 text-sm text-slate-500">{loadError || 'Project not found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-7 p-6 lg:p-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft size={17} />
        Back to Projects
      </Link>

      {/* Project header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600">
              <FolderKanban size={26} />
            </div>

            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold">{project.name}</h1>

              <p className="mt-1 text-sm text-slate-500">Updated {formatDate(project.updatedAt)}</p>
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
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
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
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Delete Project
            </button>
          </div>
        </div>

        {!isEditing && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold">Description</h2>

            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
              {project.description || 'No description provided.'}
            </p>
          </div>
        )}

        {isEditing && (
          <form
            onSubmit={(event) => void handleSave(event)}
            className="mt-6 space-y-5 border-t pt-5"
          >
            <div>
              <label htmlFor="edit-project-name" className="block text-sm font-medium">
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
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="edit-project-description" className="block text-sm font-medium">
                Description
              </label>

              <textarea
                id="edit-project-description"
                rows={5}
                maxLength={1000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSaving}
                className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </form>
        )}

        {confirmDelete && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
            <h2 className="font-semibold text-red-800">Delete this project permanently?</h2>

            <p className="mt-2 text-sm text-red-700">
              Deleting "{project.name}" will also remove its requirements, test cases, and analysis
              history. This action cannot be undone.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border bg-white px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Project'}
              </button>
            </div>
          </div>
        )}

        {actionError && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {actionError}
          </p>
        )}
      </section>

      {/* Project statistics */}
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
          <div key={label} className="rounded-xl border bg-white p-6">
            <Icon size={20} className="text-blue-600" />

            <p className="mt-3 text-3xl font-bold">{value}</p>

            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      {/* Phase 7: Requirements */}
      <RequirementsSection projectId={projectId} onCountChange={handleRequirementCountChange} />

      {/* Phase 8: Test Cases */}
      <TestCasesSection
        key={`${projectId}-${requirementsVersion}`}
        projectId={projectId}
        onCountChange={handleTestCaseCountChange}
      />

      {/* Future analysis */}
      <section className="rounded-xl border border-dashed border-slate-300 p-8">
        <h2 className="text-lg font-semibold">AI Test Coverage Analysis</h2>

        <p className="mt-2 text-sm text-slate-500">
          Your requirements and test cases are now stored in Neon PostgreSQL. The upcoming analysis
          phases will compare them, identify gaps, and recommend missing tests.
        </p>
      </section>
    </div>
  )
}

// Changing projectId creates a fresh component state.
// This avoids synchronous state resets inside useEffect.
export function ProjectDetails() {
  const { projectId } = useParams<{
    projectId: string
  }>()

  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Project unavailable</h1>

        <Link to="/projects" className="mt-4 inline-block text-sm text-blue-600">
          Back to Projects
        </Link>
      </div>
    )
  }

  return <ProjectDetailsContent key={projectId} projectId={projectId} />
}

export default ProjectDetails
