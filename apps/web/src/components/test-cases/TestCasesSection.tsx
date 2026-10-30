import { useEffect, useState, type FormEvent } from 'react'
import { FlaskConical, Plus, Pencil, Trash2, Search, RefreshCw, X, Save } from 'lucide-react'

import {
  createTestCase,
  deleteTestCase,
  getTestCases,
  updateTestCase,
  TEST_CASE_STATUSES,
  TEST_CASE_TYPES,
  type TestCase,
  type TestCaseStatus,
  type TestCaseType,
} from '../../lib/test-cases-api'

import { getRequirements, type Requirement } from '../../lib/requirements-api'

type Props = {
  projectId: string
  onCountChange: (difference: number) => void
}

type FormMode = 'create' | 'edit' | null

function readable(value: string): string {
  return value.replaceAll('_', ' ')
}

export function TestCasesSection({ projectId, onCountChange }: Props) {
  const [testCases, setTestCases] = useState<TestCase[] | null>(null)

  const [requirements, setRequirements] = useState<Requirement[]>([])

  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')

  const [typeFilter, setTypeFilter] = useState<'ALL' | TestCaseType>('ALL')

  const [statusFilter, setStatusFilter] = useState<'ALL' | TestCaseStatus>('ALL')

  const [formMode, setFormMode] = useState<FormMode>(null)

  const [editingId, setEditingId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TestCaseType>('OTHER')

  const [status, setStatus] = useState<TestCaseStatus>('DRAFT')

  const [stepsText, setStepsText] = useState('')
  const [expectedResult, setExpectedResult] = useState('')

  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([])

  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<TestCase | null>(null)

  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    void Promise.all([
      getTestCases(projectId, controller.signal),
      getRequirements(projectId, controller.signal),
    ])
      .then(([cases, linkedRequirements]) => {
        if (controller.signal.aborted) return

        setTestCases(cases)
        setRequirements(linkedRequirements)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        setLoadError(error instanceof Error ? error.message : 'Unable to load test cases.')
      })

    return () => controller.abort()
  }, [projectId, reloadKey])

  function refresh() {
    setTestCases(null)
    setLoadError('')
    setNotice('')
    setReloadKey((current) => current + 1)
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
    resetForm()
    setDeleteTarget(null)
    setNotice('')
    setFormMode('create')
  }

  function startEdit(testCase: TestCase) {
    resetForm()
    setDeleteTarget(null)
    setNotice('')

    setEditingId(testCase.id)
    setTitle(testCase.title)
    setDescription(testCase.description)
    setType(testCase.type)
    setStatus(testCase.status)
    setStepsText(testCase.steps.join('\n'))
    setExpectedResult(testCase.expectedResult)
    setSelectedRequirementIds(testCase.requirementIds)
    setFormMode('edit')
  }

  function toggleRequirement(requirementId: string, checked: boolean) {
    setSelectedRequirementIds((current) =>
      checked ? [...current, requirementId] : current.filter((id) => id !== requirementId),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSaving || !formMode) return

    const steps = stepsText
      .split('\n')
      .map((step) => step.trim())
      .filter(Boolean)

    const input = {
      title: title.trim(),
      description: description.trim(),
      type,
      status,
      steps,
      expectedResult: expectedResult.trim(),
      requirementIds: selectedRequirementIds,
    }

    if (input.title.length < 2 || input.title.length > 160) {
      setFormError('Title must contain 2–160 characters.')
      return
    }

    if (input.description.length > 2000) {
      setFormError('Description cannot exceed 2000 characters.')
      return
    }

    if (input.steps.length > 30 || input.steps.some((step) => step.length > 500)) {
      setFormError('Use at most 30 steps, each with 500 characters or fewer.')
      return
    }

    if (input.expectedResult.length > 2000) {
      setFormError('Expected result cannot exceed 2000 characters.')
      return
    }

    if (input.requirementIds.length > 50) {
      setFormError('A test case can link to at most 50 requirements.')
      return
    }

    setIsSaving(true)
    setFormError('')
    setNotice('')

    try {
      if (formMode === 'create') {
        const created = await createTestCase(projectId, input)

        setTestCases((current) => (current ? [created, ...current] : [created]))

        onCountChange(1)
        resetForm()
        setNotice('Test case created successfully.')
      } else if (editingId) {
        const updated = await updateTestCase(projectId, editingId, input)

        setTestCases(
          (current) =>
            current?.map((testCase) => (testCase.id === updated.id ? updated : testCase)) ?? [
              updated,
            ],
        )

        resetForm()
        setNotice('Test case updated successfully.')
      }
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Unable to save test case.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || isDeleting) return

    const targetId = deleteTarget.id

    setIsDeleting(true)
    setFormError('')
    setNotice('')

    try {
      await deleteTestCase(projectId, targetId)

      setTestCases((current) => current?.filter((testCase) => testCase.id !== targetId) ?? [])

      if (editingId === targetId) {
        resetForm()
      }

      setDeleteTarget(null)
      onCountChange(-1)
      setNotice('Test case deleted successfully.')
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete test case.')
    } finally {
      setIsDeleting(false)
    }
  }

  const requirementLookup = new Map(
    requirements.map((requirement) => [requirement.id, requirement.code]),
  )

  const query = search.trim().toLowerCase()

  const filteredTestCases = (testCases ?? []).filter((testCase) => {
    const matchesSearch =
      testCase.title.toLowerCase().includes(query) ||
      testCase.description.toLowerCase().includes(query)

    const matchesType = typeFilter === 'ALL' || testCase.type === typeFilter

    const matchesStatus = statusFilter === 'ALL' || testCase.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical size={21} className="text-blue-600" />

            <h2 className="text-xl font-semibold">Test Cases</h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Define test scenarios and link them to project requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          disabled={isSaving || isDeleting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus size={17} />
          Add Test Case
        </button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-40 flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            aria-label="Search test cases"
            placeholder="Search test cases..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm"
          />
        </div>

        <select
          aria-label="Filter test type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as 'ALL' | TestCaseType)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ALL">All Types</option>
          {TEST_CASE_TYPES.map((value) => (
            <option key={value} value={value}>
              {readable(value)}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter test status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TestCaseStatus)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ALL">All Statuses</option>
          {TEST_CASE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {readable(value)}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-label="Refresh test cases"
          onClick={refresh}
          className="rounded-lg border border-slate-300 p-2.5"
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
              {formMode === 'create' ? 'New Test Case' : 'Edit Test Case'}
            </h3>

            <button
              type="button"
              aria-label="Close test case form"
              disabled={isSaving}
              onClick={resetForm}
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <label htmlFor="test-case-title" className="block text-sm font-medium">
              Title
            </label>

            <input
              id="test-case-title"
              required
              autoFocus
              minLength={2}
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              placeholder="Login with valid credentials"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="test-case-description" className="block text-sm font-medium">
              Description
            </label>

            <textarea
              id="test-case-description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="test-case-type" className="block text-sm font-medium">
                Test Type
              </label>

              <select
                id="test-case-type"
                value={type}
                onChange={(event) => setType(event.target.value as TestCaseType)}
                disabled={isSaving}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                {TEST_CASE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {readable(value)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="test-case-status" className="block text-sm font-medium">
                Status
              </label>

              <select
                id="test-case-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as TestCaseStatus)}
                disabled={isSaving}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                {TEST_CASE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {readable(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="test-case-steps" className="block text-sm font-medium">
              Execution Steps
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Enter one step per line. Maximum 30 steps.
            </p>

            <textarea
              id="test-case-steps"
              rows={5}
              value={stepsText}
              onChange={(event) => setStepsText(event.target.value)}
              disabled={isSaving}
              placeholder={'Open the login page\nEnter valid credentials\nClick Sign In'}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="test-case-expected" className="block text-sm font-medium">
              Expected Result
            </label>

            <textarea
              id="test-case-expected"
              rows={3}
              maxLength={2000}
              value={expectedResult}
              onChange={(event) => setExpectedResult(event.target.value)}
              disabled={isSaving}
              placeholder="The user is redirected to the dashboard."
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-2 text-sm font-medium">Linked Requirements</legend>

            <p className="mb-3 text-xs text-slate-500">
              Choose the requirements this test case covers.
            </p>

            {requirements.length === 0 ? (
              <p className="text-sm text-slate-500">
                No requirements available. You can still save an unlinked test case.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {requirements.map((requirement) => (
                  <label
                    key={requirement.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRequirementIds.includes(requirement.id)}
                      onChange={(event) => toggleRequirement(requirement.id, event.target.checked)}
                      disabled={isSaving}
                      className="mt-1"
                    />

                    <span className="text-sm">
                      <strong className="font-mono text-blue-700">{requirement.code}</strong>
                      {' — '}
                      {requirement.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

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
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : formMode === 'create' ? 'Create Test Case' : 'Save Changes'}
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={resetForm}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {deleteTarget && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h3 className="font-semibold text-red-800">Delete "{deleteTarget.title}"?</h3>

          <p className="mt-2 text-sm text-red-700">
            This deletes the test case and its requirement links. The requirements themselves will
            remain.
          </p>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border bg-white px-4 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Test Case'}
            </button>
          </div>
        </div>
      )}

      {testCases === null && !loadError && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Loading test cases...
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

      {testCases && !loadError && testCases.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <FlaskConical size={32} className="mx-auto text-blue-600" />

          <h3 className="mt-4 font-semibold">No test cases yet</h3>

          <p className="mt-2 text-sm text-slate-500">
            Create a test case and link it to your requirements.
          </p>
        </div>
      )}

      {testCases && !loadError && testCases.length > 0 && filteredTestCases.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">No test cases match your filters.</p>
      )}

      {testCases && !loadError && filteredTestCases.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Showing {filteredTestCases.length} of {testCases.length} test cases
          </p>

          {filteredTestCases.map((testCase) => (
            <article key={testCase.id} className="rounded-xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{testCase.title}</h3>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {readable(testCase.type)}
                    </span>

                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {readable(testCase.status)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Edit ${testCase.title}`}
                    onClick={() => startEdit(testCase)}
                    disabled={isSaving || isDeleting}
                    className="rounded-lg border p-2 disabled:opacity-50"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete ${testCase.title}`}
                    onClick={() => {
                      setDeleteTarget(testCase)
                      setFormError('')
                      setNotice('')
                    }}
                    disabled={isSaving || isDeleting}
                    className="rounded-lg border border-red-200 p-2 text-red-700 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {testCase.description && (
                <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">
                  {testCase.description}
                </p>
              )}

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-700">Linked Requirements</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {testCase.requirementIds.length === 0 ? (
                    <span className="text-xs text-slate-500">No requirements linked</span>
                  ) : (
                    testCase.requirementIds.map((id) => (
                      <span
                        key={id}
                        className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs"
                      >
                        {requirementLookup.get(id) ?? 'Removed requirement'}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {testCase.steps.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">Execution Steps</p>

                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                    {testCase.steps.map((step, index) => (
                      <li key={`${testCase.id}-${index}`}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {testCase.expectedResult && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">Expected Result</p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                    {testCase.expectedResult}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
