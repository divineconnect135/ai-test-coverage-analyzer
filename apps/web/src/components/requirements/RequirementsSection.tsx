import { useEffect, useState, type FormEvent } from 'react'
import { FileText, Plus, Pencil, Trash2, RefreshCw, Search, Save, X } from 'lucide-react'

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
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Requirement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    void getRequirements(projectId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRequirements(data)
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load requirements.')
        }
      })

    return () => controller.abort()
  }, [projectId, reloadKey])

  function refresh() {
    setLoadError('')
    setRequirements(null)
    setReloadKey((value) => value + 1)
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
    resetForm()
    setNotice('')
    setDeleteTarget(null)
    setFormMode('create')
  }

  function startEdit(requirement: Requirement) {
    resetForm()
    setNotice('')
    setDeleteTarget(null)

    setEditingId(requirement.id)
    setCode(requirement.code)
    setTitle(requirement.title)
    setDescription(requirement.description)
    setFormMode('edit')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting || !formMode) return

    const input = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
    }

    if (!/^[A-Z][A-Z0-9]*(?:[-_][A-Z0-9]+)*$/.test(input.code)) {
      setFormError('Use a code such as AUTH-001 or CART-002.')
      return
    }

    if (input.code.length < 2 || input.code.length > 40) {
      setFormError('Code must contain 2–40 characters.')
      return
    }

    if (input.title.length < 2 || input.title.length > 160) {
      setFormError('Title must contain 2–160 characters.')
      return
    }

    if (input.description.length < 1 || input.description.length > 5000) {
      setFormError('Description must contain 1–5000 characters.')
      return
    }

    setFormError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      if (formMode === 'create') {
        const created = await createRequirement(projectId, input)

        setRequirements((current) => (current ? [...current, created] : [created]))

        onCountChange(1)
        resetForm()
        setNotice('Requirement created successfully.')
      } else if (editingId) {
        const updated = await updateRequirement(projectId, editingId, input)

        setRequirements(
          (current) =>
            current?.map((item) => (item.id === updated.id ? updated : item)) ?? [updated],
        )

        resetForm()
        setNotice('Requirement updated successfully.')
      }
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Unable to save requirement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || isDeleting) return

    setIsDeleting(true)
    setFormError('')
    setNotice('')

    try {
      await deleteRequirement(projectId, deleteTarget.id)

      setRequirements((current) => current?.filter((item) => item.id !== deleteTarget.id) ?? [])

      if (editingId === deleteTarget.id) {
        resetForm()
      }

      onCountChange(-1)
      setDeleteTarget(null)
      setNotice('Requirement deleted successfully.')
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete requirement.')
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
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={21} className="text-blue-600" />
            <h2 className="text-xl font-semibold">Requirements</h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Define the features and behavior your application needs to support.
          </p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          disabled={isSubmitting || isDeleting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={17} />
          Add Requirement
        </button>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            aria-label="Search requirements"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code, title, or description..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh requirements"
          className="rounded-lg border border-slate-300 p-2.5 hover:bg-slate-50"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </p>
      )}

      {formError && !formMode && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {formError}
        </p>
      )}

      {formMode && (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-5 rounded-xl border border-blue-200 bg-blue-50/40 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {formMode === 'create' ? 'New Requirement' : 'Edit Requirement'}
            </h3>

            <button
              type="button"
              aria-label="Close requirement form"
              onClick={resetForm}
              disabled={isSubmitting}
              className="rounded-lg p-1 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <label htmlFor="requirement-code" className="block text-sm font-medium">
              Requirement Code
            </label>

            <input
              id="requirement-code"
              required
              autoFocus
              minLength={2}
              maxLength={40}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              disabled={isSubmitting}
              placeholder="AUTH-001"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />

            <p className="mt-1 text-xs text-slate-500">
              Unique within this project. Example: AUTH-001.
            </p>
          </div>

          <div>
            <label htmlFor="requirement-title" className="block text-sm font-medium">
              Title
            </label>

            <input
              id="requirement-title"
              required
              minLength={2}
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSubmitting}
              placeholder="User Login"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="requirement-description" className="block text-sm font-medium">
              Description
            </label>

            <textarea
              id="requirement-description"
              required
              rows={5}
              maxLength={5000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
              placeholder="Describe the required application behavior..."
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />

            <p className="mt-1 text-right text-xs text-slate-400">{description.length}/5000</p>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Save size={16} />
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
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {deleteTarget && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h3 className="font-semibold text-red-800">Delete {deleteTarget.code}?</h3>

          <p className="mt-2 text-sm text-red-700">
            This permanently deletes the requirement and removes its existing test-case links. The
            test cases themselves will not be deleted.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="rounded-lg border bg-white px-4 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Requirement'}
            </button>
          </div>
        </div>
      )}

      {!requirements && !loadError && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Loading requirements...
        </p>
      )}

      {loadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">{loadError}</p>

          <button
            type="button"
            onClick={refresh}
            className="mt-3 text-sm font-medium text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {requirements && !loadError && requirements.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <FileText size={32} className="mx-auto text-blue-600" />

          <h3 className="mt-4 font-semibold">No requirements yet</h3>

          <p className="mt-2 text-sm text-slate-500">
            Add your first requirement to define what this project needs to accomplish.
          </p>
        </div>
      )}

      {requirements &&
        !loadError &&
        requirements.length > 0 &&
        filteredRequirements.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No requirements match your search.
          </p>
        )}

      {requirements && !loadError && filteredRequirements.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Showing {filteredRequirements.length} of {requirements.length} requirements
          </p>

          {filteredRequirements.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-semibold text-blue-700">
                    {item.code}
                  </span>

                  <h3 className="mt-3 font-semibold text-slate-900">{item.title}</h3>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    disabled={isSubmitting || isDeleting}
                    aria-label={`Edit ${item.code}`}
                    className="rounded-lg border p-2 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(item)
                      setFormError('')
                      setNotice('')
                    }}
                    disabled={isSubmitting || isDeleting}
                    aria-label={`Delete ${item.code}`}
                    className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
