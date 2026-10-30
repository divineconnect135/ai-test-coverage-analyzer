import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import {
  createTestCase,
  deleteTestCase,
  getTestCases,
  updateTestCase,
  type TestCase,
} from '../../lib/test-cases-api'

import { getRequirements, type Requirement } from '../../lib/requirements-api'

type Props = {
  projectId: string
  onCountChange: (difference: number) => void
}

type FormMode = 'create' | 'edit' | null

type TestCaseType = 'POSITIVE' | 'NEGATIVE' | 'EDGE_CASE' | 'SECURITY' | 'OTHER'

type TestCaseStatus = 'DRAFT' | 'READY' | 'COMPLETED'

const testCaseTypes: TestCaseType[] = ['POSITIVE', 'NEGATIVE', 'EDGE_CASE', 'SECURITY', 'OTHER']

const testCaseStatuses: TestCaseStatus[] = ['DRAFT', 'READY', 'COMPLETED']

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 ' +
  'px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 ' +
  'outline-none transition focus:border-blue-500 focus:ring-2 ' +
  'focus:ring-blue-500/20 disabled:opacity-50'

const labelClass = 'block text-sm font-semibold text-slate-200'

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl ' +
  'bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white ' +
  'transition hover:bg-blue-500 disabled:opacity-50'

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl ' +
  'border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm ' +
  'font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50'

function humanize(value: string) {
  return value.replaceAll('_', ' ')
}

export function TestCasesSection({ projectId, onCountChange }: Props) {
  const [testCases, setTestCases] = useState<TestCase[] | null>(null)

  const [requirements, setRequirements] = useState<Requirement[] | null>(null)

  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TestCase | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TestCaseType>('OTHER')
  const [status, setStatus] = useState<TestCaseStatus>('DRAFT')
  const [stepsText, setStepsText] = useState('')
  const [expectedResult, setExpectedResult] = useState('')
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([])

  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    void Promise.all([
      getTestCases(projectId, controller.signal),
      getRequirements(projectId, controller.signal),
    ])
      .then(([loadedTestCases, loadedRequirements]) => {
        if (controller.signal.aborted) return
        setTestCases(loadedTestCases)
        setRequirements(loadedRequirements)
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setLoadError(error instanceof Error ? error.message : 'Unable to load test cases.')
      })

    return () => controller.abort()
  }, [projectId, reloadKey])

  const isBusy = isSubmitting || isDeleting

  function refresh() {
    setTestCases(null)
    setRequirements(null)
    setLoadError('')
    setNotice('')
    setReloadKey((value) => value + 1)
  }

  function resetForm() {
    setFormMode(null)
    setEditingId(null)
    setTitle('')
    setDescription('')
    setType('OTHER')
    setStatus('DRAFT')
    setStepsText('')
    setExpectedResult('')
    setSelectedRequirementIds([])
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

  function startEdit(testCase: TestCase) {
    if (isBusy) return

    resetForm()
    setDeleteTarget(null)
    setDeleteError('')
    setNotice('')

    setFormMode('edit')
    setEditingId(testCase.id)
    setTitle(testCase.title)
    setDescription(testCase.description)
    setType(testCase.type as TestCaseType)
    setStatus(testCase.status as TestCaseStatus)
    setStepsText(testCase.steps.join('\n'))
    setExpectedResult(testCase.expectedResult)
    setSelectedRequirementIds(testCase.requirementIds)
  }

  function confirmDelete(testCase: TestCase) {
    if (isBusy) return
    resetForm()
    setDeleteError('')
    setNotice('')
    setDeleteTarget(testCase)
  }

  function toggleRequirement(id: string) {
    setSelectedRequirementIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formMode || isBusy) return

    const payload = {
      title: title.trim(),
      description: description.trim(),
      type,
      status,
      steps: stepsText
        .split('\n')
        .map((step) => step.trim())
        .filter(Boolean),
      expectedResult: expectedResult.trim(),
      requirementIds: selectedRequirementIds,
    }

    if (payload.title.length < 2 || payload.title.length > 160) {
      setFormError('Title must contain between 2 and 160 characters.')
      return
    }

    if (payload.description.length > 2000) {
      setFormError('Description cannot exceed 2000 characters.')
      return
    }

    if (payload.steps.length === 0) {
      setFormError('Add at least one step. Use one step per line.')
      return
    }

    if (payload.expectedResult.length < 1 || payload.expectedResult.length > 2000) {
      setFormError('Expected result must contain between 1 and 2000 characters.')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    setNotice('')

    try {
      if (formMode === 'create') {
        const created = await createTestCase(projectId, payload)

        setTestCases((current) => (current ? [...current, created] : [created]))

        onCountChange(1)
        resetForm()
        setNotice('Test case created successfully.')
      } else if (editingId) {
        const updated = await updateTestCase(projectId, editingId, payload)

        setTestCases(
          (current) =>
            current?.map((item) => (item.id === updated.id ? updated : item)) ?? [updated],
        )

        resetForm()
        setNotice('Test case updated successfully.')
      }
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Unable to save test case.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || isBusy) return

    setIsDeleting(true)
    setDeleteError('')
    setNotice('')

    try {
      await deleteTestCase(projectId, deleteTarget.id)

      setTestCases((current) => current?.filter((item) => item.id !== deleteTarget.id) ?? [])

      onCountChange(-1)
      setDeleteTarget(null)
      setNotice('Test case deleted successfully.')
    } catch (error: unknown) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete test case.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredTestCases = useMemo(() => {
    const query = search.trim().toLowerCase()

    return (testCases ?? [])
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.expectedResult.toLowerCase().includes(query)

        const matchesType = !typeFilter || item.type === typeFilter

        const matchesStatus = !statusFilter || item.status === statusFilter

        return matchesSearch && matchesType && matchesStatus
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [search, statusFilter, testCases, typeFilter])

  const requirementMap = new Map(
    (requirements ?? []).map((item) => [item.id, `${item.code} — ${item.title}`]),
  )

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-xl shadow-black/10">
      <div className="border-b border-slate-800 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
              <ClipboardList size={23} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                Project Workspace
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Test Cases
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Create test scenarios, define execution steps, and link each test to related
                requirements.
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
            Add Test Case
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2">
            <span className="text-sm font-semibold text-white">{testCases?.length ?? '—'}</span>

            <span className="ml-2 text-xs text-slate-400">Total Test Cases</span>
          </div>

          <span className="text-xs text-slate-500">Linked to your project requirements</span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_52px]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              aria-label="Search test cases"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search test cases..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            {testCaseTypes.map((item) => (
              <option key={item} value={item}>
                {humanize(item)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {testCaseStatuses.map((item) => (
              <option key={item} value={item}>
                {humanize(item)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={refresh}
            title="Refresh test cases"
            aria-label="Refresh test cases"
            className="flex h-[50px] w-[50px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-400" />
            <p className="text-sm text-emerald-200">{notice}</p>
          </div>
        )}

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
                  {formMode === 'create' ? 'New Test Case' : 'Edit Test Case'}
                </h3>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="test-title" className={labelClass}>
                    Title
                  </label>
                  <input
                    id="test-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={160}
                    required
                    className={inputClass}
                    placeholder="User can log in with valid credentials"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="test-type" className={labelClass}>
                      Type
                    </label>
                    <select
                      id="test-type"
                      value={type}
                      onChange={(event) => setType(event.target.value as TestCaseType)}
                      className={inputClass}
                    >
                      {testCaseTypes.map((item) => (
                        <option key={item} value={item}>
                          {humanize(item)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="test-status" className={labelClass}>
                      Status
                    </label>
                    <select
                      id="test-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as TestCaseStatus)}
                      className={inputClass}
                    >
                      {testCaseStatuses.map((item) => (
                        <option key={item} value={item}>
                          {humanize(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="test-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="test-description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  className={`${inputClass} resize-y`}
                  placeholder="Explain the scenario and test purpose."
                />
              </div>

              <div>
                <label htmlFor="test-steps" className={labelClass}>
                  Steps
                </label>
                <textarea
                  id="test-steps"
                  rows={6}
                  value={stepsText}
                  onChange={(event) => setStepsText(event.target.value)}
                  className={`${inputClass} resize-y`}
                  placeholder={`Open the login page\nEnter valid credentials\nClick Sign In`}
                />
                <p className="mt-2 text-xs text-slate-400">Use one step per line.</p>
              </div>

              <div>
                <label htmlFor="test-expected-result" className={labelClass}>
                  Expected Result
                </label>
                <textarea
                  id="test-expected-result"
                  rows={3}
                  value={expectedResult}
                  onChange={(event) => setExpectedResult(event.target.value)}
                  maxLength={2000}
                  className={`${inputClass} resize-y`}
                  placeholder="User is redirected to the dashboard."
                />
              </div>

              <div>
                <p className={labelClass}>Linked Requirements</p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(requirements ?? []).map((requirement) => {
                    const checked = selectedRequirementIds.includes(requirement.id)

                    return (
                      <label
                        key={requirement.id}
                        className={`cursor-pointer rounded-xl border p-4 transition ${
                          checked
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRequirement(requirement.id)}
                            className="mt-1"
                          />

                          <div>
                            <p className="font-mono text-xs font-semibold text-blue-300">
                              {requirement.code}
                            </p>
                            <p className="mt-1 text-sm font-medium text-white">
                              {requirement.title}
                            </p>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {requirements?.length === 0 && (
                  <p className="mt-3 text-sm text-slate-400">
                    Create requirements first to link them here.
                  </p>
                )}
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-sm text-red-200">{formError}</p>
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
                      ? 'Create Test Case'
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

        {deleteTarget && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <h3 className="font-semibold text-red-100">Delete test case?</h3>
                <p className="mt-2 text-sm leading-6 text-red-200/80">
                  "{deleteTarget.title}" will be removed from this project.
                </p>
              </div>
            </div>

            {deleteError && (
              <p className="mt-4 rounded-lg bg-red-900/40 p-3 text-sm text-red-200">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
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
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                <Trash2 size={17} />
                {isDeleting ? 'Deleting...' : 'Delete Test Case'}
              </button>
            </div>
          </div>
        )}

        {testCases === null && !loadError && (
          <div
            role="status"
            className="rounded-xl border border-slate-800 bg-slate-950/50 p-10 text-center"
          >
            <RefreshCw size={24} className="mx-auto animate-spin text-blue-400" />
            <p className="mt-4 text-sm text-slate-400">Loading test cases...</p>
          </div>
        )}

        {loadError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="font-medium text-red-200">Unable to load test cases</p>
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

        {testCases && !loadError && testCases.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <ClipboardList size={26} />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">No test cases yet</h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Add your first test case and connect it to the relevant requirements.
            </p>

            <button type="button" onClick={startCreate} className={`${primaryButtonClass} mt-6`}>
              <Plus size={17} />
              Create First Test Case
            </button>
          </div>
        )}

        {testCases && !loadError && testCases.length > 0 && filteredTestCases.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-10 text-center">
            <Search size={25} className="mx-auto text-slate-500" />
            <p className="mt-4 font-medium text-white">No matching test cases</p>
            <p className="mt-2 text-sm text-slate-400">Adjust your filters or search term.</p>
          </div>
        )}

        {filteredTestCases.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-200">Saved Test Cases</h3>

              <span className="text-xs text-slate-400">
                Showing {filteredTestCases.length} of {testCases?.length ?? 0}
              </span>
            </div>

            {filteredTestCases.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-slate-600"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold text-white">{item.title}</h4>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                        {humanize(item.type)}
                      </span>

                      <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                        {humanize(item.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      disabled={isBusy}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-slate-300 transition hover:border-blue-500/50 hover:text-blue-300 disabled:opacity-50"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => confirmDelete(item)}
                      disabled={isBusy}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-red-400 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                {item.description && (
                  <p className="mt-4 text-sm leading-7 text-slate-300">{item.description}</p>
                )}

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Steps
                    </p>

                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
                      {item.steps.map((step, index) => (
                        <li key={`${item.id}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Expected Result
                    </p>

                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.expectedResult}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Linked Requirements
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.requirementIds.length > 0 ? (
                      item.requirementIds.map((requirementId) => (
                        <span
                          key={requirementId}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
                        >
                          {requirementMap.get(requirementId) ?? 'Requirement unavailable'}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No linked requirements</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
