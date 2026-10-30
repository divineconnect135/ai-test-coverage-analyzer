import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import {
  createRequirement,
  deleteRequirement,
  getRequirements,
  updateRequirement,
  type Requirement,
} from '../../lib/requirements-api'

type RequirementsSectionProps = {
  projectId: string
  onCountChange: (difference: number) => void
}

type FormMode = 'create' | 'edit' | null

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-700 ' +
  'bg-slate-950 px-4 py-3 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 outline-none transition ' +
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const labelClass = 'block text-sm font-semibold text-slate-200'

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl ' +
  'border border-slate-700 bg-slate-800 px-4 py-2.5 ' +
  'text-sm font-medium text-slate-200 transition ' +
  'hover:border-slate-500 hover:bg-slate-700 ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-blue-400 disabled:opacity-50'

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl ' +
  'bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white ' +
  'shadow-sm shadow-blue-950/40 transition hover:bg-blue-500 ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-blue-400 disabled:cursor-not-allowed ' +
  'disabled:opacity-50'

export function RequirementsSection({ projectId, onCountChange }: RequirementsSectionProps) {
  const [requirements, setRequirements] = useState<Requirement[] | null>(null)

  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')

  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [notice, setNotice] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Requirement | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    void getRequirements(projectId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setRequirements(data)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        setLoadError(error instanceof Error ? error.message : 'Unable to load requirements.')
      })

    return () => controller.abort()
  }, [projectId, reloadKey])

  const isBusy = isSubmitting || isDeleting

  function refresh() {
    setRequirements(null)
    setLoadError('')
    setNotice('')
    setReloadKey((current) => current + 1)
  }

  function resetForm() {
    setFormMode(null)
    setEditingId(null)
    setCode('')
    setTitle('')
    setDescription('')
    setFormError('')
  }

  function startCreate() {
    if (isBusy) return

    resetForm()
    setDeleteTarget(null)
    setDeleteError('')
    setNotice('')
    setFormMode('create')
  }

  function startEdit(requirement: Requirement) {
    if (isBusy) return

    resetForm()
    setDeleteTarget(null)
    setDeleteError('')
    setNotice('')

    setEditingId(requirement.id)
    setCode(requirement.code)
    setTitle(requirement.title)
    setDescription(requirement.description)
    setFormMode('edit')
  }

  function confirmDelete(requirement: Requirement) {
    if (isBusy) return

    resetForm()
    setNotice('')
    setDeleteError('')
    setDeleteTarget(requirement)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isBusy || !formMode) return

    const input = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
    }

    if (
      input.code.length < 2 ||
      input.code.length > 40 ||
      !/^[A-Z][A-Z0-9]*(?:[-_][A-Z0-9]+)*$/.test(input.code)
    ) {
      setFormError('Enter a valid code such as AUTH-001 (2–40 characters).')
      return
    }

    if (input.title.length < 2 || input.title.length > 160) {
      setFormError('Title must contain between 2 and 160 characters.')
      return
    }

    if (input.description.length < 1 || input.description.length > 5000) {
      setFormError('Description must contain between 1 and 5000 characters.')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    setNotice('')

    try {
      if (formMode === 'create') {
        const created = await createRequirement(projectId, input)

        setRequirements((current) => (current ? [...current, created] : [created]))

        onCountChange(1)
        resetForm()
        setNotice(`Requirement ${created.code} created successfully.`)
      } else if (editingId) {
        const updated = await updateRequirement(projectId, editingId, input)

        setRequirements(
          (current) =>
            current?.map((item) => (item.id === updated.id ? updated : item)) ?? [updated],
        )

        resetForm()
        setNotice(`Requirement ${updated.code} updated successfully.`)
      }
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Unable to save requirement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || isBusy) return

    const target = deleteTarget

    setIsDeleting(true)
    setDeleteError('')
    setNotice('')

    try {
      await deleteRequirement(projectId, target.id)

      setRequirements((current) => current?.filter((item) => item.id !== target.id) ?? [])

      onCountChange(-1)
      setDeleteTarget(null)

      setNotice(`Requirement ${target.code} deleted successfully.`)
    } catch (error: unknown) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete requirement.')
    } finally {
      setIsDeleting(false)
    }
  }

  const query = search.trim().toLowerCase()

  const filteredRequirements = (requirements ?? [])
    .filter(
      (item) =>
        item.code.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    )
    .sort((a, b) => a.code.localeCompare(b.code))

  return (
    <section
      aria-labelledby="requirements-heading"
      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-xl shadow-black/10"
    >
      {/* Section header */}
      <div className="border-b border-slate-800 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
              <FileText size={23} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                Project Workspace
              </p>

              <h2
                id="requirements-heading"
                className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl"
              >
                Requirements
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Define what your application must do. Organize features, behaviors, and acceptance
                expectations before testing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startCreate}
            disabled={isBusy}
            className={primaryButtonClass}
          >
            <Plus size={18} />
            Add Requirement
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        {/* Count and search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2">
            <span className="text-sm font-semibold text-white">{requirements?.length ?? '—'}</span>

            <span className="ml-2 text-xs text-slate-400">Total Requirements</span>
          </div>

          <span className="text-xs text-slate-500">Stored in your project</span>
        </div>

        <div className="flex gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              aria-label="Search requirements"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by code, title, or description"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={isBusy}
            aria-label="Refresh requirements"
            title="Refresh requirements"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Success feedback */}
        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-400" />

            <p className="text-sm leading-6 text-emerald-200">{notice}</p>
          </div>
        )}

        {/* Create / Edit form */}
        {formMode && (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="overflow-hidden rounded-2xl border border-blue-500/30 bg-slate-950/70"
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-blue-500/5 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  {formMode === 'create' ? 'Create New' : 'Update Existing'}
                </p>

                <h3 className="mt-1 text-lg font-semibold text-white">
                  {formMode === 'create' ? 'New Requirement' : 'Edit Requirement'}
                </h3>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                aria-label="Close requirement form"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="requirement-code" className={labelClass}>
                    Requirement Code
                    <span className="ml-1 text-blue-400">*</span>
                  </label>

                  <input
                    id="requirement-code"
                    type="text"
                    required
                    minLength={2}
                    maxLength={40}
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder="AUTH-001"
                    disabled={isSubmitting}
                    className={inputClass}
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Unique within this project.
                  </p>
                </div>

                <div>
                  <label htmlFor="requirement-title" className={labelClass}>
                    Requirement Title
                    <span className="ml-1 text-blue-400">*</span>
                  </label>

                  <input
                    id="requirement-title"
                    type="text"
                    required
                    minLength={2}
                    maxLength={160}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="User Login"
                    disabled={isSubmitting}
                    className={inputClass}
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    A short, descriptive title.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="requirement-description" className={labelClass}>
                  Description
                  <span className="ml-1 text-blue-400">*</span>
                </label>

                <textarea
                  id="requirement-description"
                  required
                  rows={5}
                  maxLength={5000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Example: Users must be able to sign in using a valid email address and password."
                  disabled={isSubmitting}
                  className={`${inputClass} resize-y leading-6`}
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    Describe the expected application behavior.
                  </p>

                  <span className="shrink-0 font-mono text-xs text-slate-400">
                    {description.length}/5000
                  </span>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />

                  <p className="text-sm leading-6 text-red-200">{formError}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
                <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                  {isSubmitting ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}

                  {isSubmitting
                    ? 'Saving...'
                    : formMode === 'create'
                      ? 'Create Requirement'
                      : 'Save Changes'}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Deletion confirmation */}
        {deleteTarget && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-400" />

              <div>
                <h3 className="font-semibold text-red-100">Delete {deleteTarget.code}?</h3>

                <p className="mt-2 text-sm leading-6 text-red-200/80">
                  This permanently deletes the requirement and removes its links to existing test
                  cases. The test cases themselves remain.
                </p>
              </div>
            </div>

            {deleteError && (
              <p role="alert" className="mt-4 rounded-lg bg-red-900/40 p-3 text-sm text-red-200">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteError('')
                }}
                className={secondaryButtonClass}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                <Trash2 size={17} />

                {isDeleting ? 'Deleting...' : 'Delete Requirement'}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {requirements === null && !loadError && (
          <div
            role="status"
            className="rounded-xl border border-slate-800 bg-slate-950/50 p-10 text-center"
          >
            <RefreshCw size={24} className="mx-auto animate-spin text-blue-400" />

            <p className="mt-4 text-sm text-slate-400">Loading requirements...</p>
          </div>
        )}

        {/* Loading error */}
        {loadError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="font-medium text-red-200">Unable to load requirements</p>

            <p className="mt-2 text-sm text-red-300">{loadError}</p>

            <button
              type="button"
              onClick={refresh}
              className="mt-4 text-sm font-semibold text-red-200 underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {requirements && !loadError && requirements.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <FileText size={26} />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">No requirements yet</h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Add your first requirement to define the functionality your project needs to support.
            </p>

            <button type="button" onClick={startCreate} className={`${primaryButtonClass} mt-6`}>
              <Plus size={17} />
              Create First Requirement
            </button>
          </div>
        )}

        {/* Search empty state */}
        {requirements &&
          !loadError &&
          requirements.length > 0 &&
          filteredRequirements.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-10 text-center">
              <Search size={25} className="mx-auto text-slate-500" />

              <p className="mt-4 font-medium text-white">No matching requirements</p>

              <p className="mt-2 text-sm text-slate-400">Try another search term.</p>
            </div>
          )}

        {/* Requirement cards */}
        {requirements && !loadError && filteredRequirements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-200">Saved Requirements</h3>

              <span className="text-xs text-slate-400">
                Showing {filteredRequirements.length} of {requirements.length}
              </span>
            </div>

            {filteredRequirements.map((item) => (
              <article
                key={item.id}
                className="group rounded-xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-slate-600 hover:bg-slate-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-blue-300">
                      {item.code}
                    </span>

                    <h4 className="mt-3 break-words text-base font-semibold text-white">
                      {item.title}
                    </h4>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      disabled={isBusy}
                      aria-label={`Edit ${item.code}`}
                      title={`Edit ${item.code}`}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-slate-300 transition hover:border-blue-500/50 hover:text-blue-300 disabled:opacity-50"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => confirmDelete(item)}
                      disabled={isBusy}
                      aria-label={`Delete ${item.code}`}
                      title={`Delete ${item.code}`}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-red-400 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap break-words border-t border-slate-800 pt-4 text-sm leading-7 text-slate-300">
                  {item.description}
                </p>

                <p className="mt-4 text-xs text-slate-500">
                  Updated{' '}
                  {new Date(item.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
