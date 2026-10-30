import { useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  FlaskConical,
  History,
  RefreshCw,
  X,
} from 'lucide-react'

import {
  getAnalysisHistory,
  getSavedAnalysis,
  type AnalysisHistoryResponse,
  type AnalysisHistoryItem,
  type SavedAnalysis,
} from '../../lib/analysis-history-api'

type Props = {
  projectId: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === 'string' ? value : ''
}

function readStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function snapshotItems(
  snapshot: unknown,
  key: 'requirements' | 'testCases',
): Record<string, unknown>[] {
  if (!isRecord(snapshot)) return []

  const value = snapshot[key]

  return Array.isArray(value) ? value.filter(isRecord) : []
}

function dateLabel(value: string | null): string {
  if (!value) return 'Not completed'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Unknown date'
    : date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

function statusClass(status: string): string {
  if (status === 'COMPLETED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  }

  if (status === 'FAILED') {
    return 'border-red-500/30 bg-red-500/10 text-red-300'
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
}

function assessmentClass(value: string): string {
  if (value === 'POTENTIALLY_COVERED') {
    return 'text-emerald-300'
  }

  if (value === 'POTENTIAL_GAP') {
    return 'text-amber-300'
  }

  return 'text-slate-300'
}

function readable(value: string): string {
  return value.replaceAll('_', ' ')
}

export function AnalysisHistorySection({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const [history, setHistory] = useState<AnalysisHistoryResponse | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [selected, setSelected] = useState<SavedAnalysis | null>(null)

  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const [detailError, setDetailError] = useState('')

  const historyRequestId = useRef(0)
  const detailRequestId = useRef(0)

  async function loadPage(page: number) {
    const requestId = ++historyRequestId.current
    ++detailRequestId.current

    setIsLoading(true)
    setError('')
    setSelectedId(null)
    setSelected(null)
    setDetailError('')
    setIsLoadingDetails(false)

    try {
      const result = await getAnalysisHistory(projectId, page)

      if (historyRequestId.current !== requestId) return

      setHistory(result)
    } catch (reason: unknown) {
      if (historyRequestId.current !== requestId) return

      setError(reason instanceof Error ? reason.message : 'Unable to load analysis history.')
    } finally {
      if (historyRequestId.current === requestId) {
        setIsLoading(false)
      }
    }
  }

  function toggleHistory() {
    if (isOpen) {
      ++historyRequestId.current
      ++detailRequestId.current
      setIsOpen(false)
      return
    }

    setIsOpen(true)
    void loadPage(1)
  }

  async function openAnalysis(run: AnalysisHistoryItem) {
    const requestId = ++detailRequestId.current

    setSelectedId(run.id)
    setSelected(null)
    setDetailError('')
    setIsLoadingDetails(true)

    try {
      const result = await getSavedAnalysis(projectId, run.id)

      if (detailRequestId.current !== requestId) return

      setSelected(result)
    } catch (reason: unknown) {
      if (detailRequestId.current !== requestId) return

      setDetailError(
        reason instanceof Error ? reason.message : 'Unable to load the saved analysis.',
      )
    } finally {
      if (detailRequestId.current === requestId) {
        setIsLoadingDetails(false)
      }
    }
  }

  function closeDetails() {
    ++detailRequestId.current
    setSelectedId(null)
    setSelected(null)
    setDetailError('')
    setIsLoadingDetails(false)
  }

  const snapshotRequirements = snapshotItems(selected?.inputSnapshot, 'requirements')

  const snapshotTestCases = snapshotItems(selected?.inputSnapshot, 'testCases')

  const snapshotProject =
    isRecord(selected?.inputSnapshot) && isRecord(selected.inputSnapshot.project)
      ? selected.inputSnapshot.project
      : null

  const requirementNames = new Map(
    snapshotRequirements.map((item) => [
      readText(item, 'id'),
      `${readText(item, 'code')} — ${readText(item, 'title')}`,
    ]),
  )

  const testNames = new Map(
    snapshotTestCases.map((item) => [readText(item, 'id'), readText(item, 'title')]),
  )

  return (
    <section
      id="analysis-history"
      aria-label="Analysis History"
      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-xl shadow-black/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-blue-950/50 to-slate-900 px-5 py-6 sm:px-7">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
            <History size={23} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Analysis Records
            </p>

            <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">Analysis History</h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Review previous AI analyses, original inputs, and saved test suggestions without
              running AI again.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleHistory}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {isOpen ? <X size={17} /> : <History size={17} />}
          {isOpen ? 'Close History' : 'View History'}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-300">
              {history
                ? `${history.pagination.totalItems} saved analysis runs`
                : 'Loading saved analyses'}
            </p>

            <button
              type="button"
              onClick={() => void loadPage(history?.pagination.page ?? 1)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh History
            </button>
          </div>

          {isLoading && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-300"
            >
              <RefreshCw size={18} className="animate-spin text-blue-400" />
              Loading analysis history...
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="text-sm text-red-200">{error}</p>

              <button
                type="button"
                onClick={() => void loadPage(1)}
                className="mt-3 text-sm font-semibold text-red-200 underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && history?.analyses.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-10 text-center">
              <Clock3 size={30} className="mx-auto text-blue-400" />

              <h3 className="mt-4 font-semibold text-white">No previous analyses</h3>

              <p className="mt-2 text-sm text-slate-400">
                Run an AI analysis above, then refresh this history to see its saved record.
              </p>
            </div>
          )}

          {!isLoading && !error && history && history.analyses.length > 0 && (
            <div className="space-y-3">
              {history.analyses.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => void openAnalysis(run)}
                  className={`w-full rounded-xl border p-5 text-left transition ${
                    selectedId === run.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-950/60 hover:border-blue-500/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{dateLabel(run.createdAt)}</p>

                      <p className="mt-2 text-xs text-slate-400">
                        {run.model ?? 'Model not recorded'}
                        {' · '}
                        {run.suggestionCount} suggestions
                      </p>
                    </div>

                    <span
                      className={`rounded-lg border px-3 py-1 text-xs font-semibold ${statusClass(run.status)}`}
                    >
                      {readable(run.status)}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
                    {run.resultSummary ??
                      (run.status === 'FAILED'
                        ? `Analysis failed: ${run.errorCode ?? 'Unknown error'}`
                        : 'No summary available.')}
                  </p>

                  <p className="mt-3 text-xs font-medium text-blue-400">View saved details</p>
                </button>
              ))}
            </div>
          )}

          {!isLoading && !error && history && history.pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
              <p className="text-sm text-slate-400">
                Page {history.pagination.page} of {history.pagination.totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={history.pagination.page <= 1}
                  onClick={() => void loadPage(history.pagination.page - 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={history.pagination.page >= history.pagination.totalPages}
                  onClick={() => void loadPage(history.pagination.page + 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {selectedId && (
            <div className="space-y-6 border-t border-slate-700 pt-6">
              <button
                type="button"
                onClick={closeDetails}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                <ArrowLeft size={16} />
                Close saved details
              </button>

              {isLoadingDetails && (
                <p role="status" className="text-sm text-slate-300">
                  Loading saved analysis...
                </p>
              )}

              {detailError && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
                >
                  {detailError}
                </p>
              )}

              {selected && (
                <>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-white">Saved Analysis</h3>

                      <span
                        className={`rounded-lg border px-3 py-1 text-xs font-semibold ${statusClass(selected.status)}`}
                      >
                        {readable(selected.status)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-200">
                      Created: {dateLabel(selected.createdAt)}
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      Completed: {dateLabel(selected.completedAt)}
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      Model: {selected.model ?? 'Not recorded'}
                    </p>

                    {selected.errorCode && (
                      <p className="mt-3 flex items-center gap-2 text-sm text-red-300">
                        <AlertCircle size={17} />
                        Failure code: {selected.errorCode}
                      </p>
                    )}

                    {selected.resultSummary && (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white">
                        {selected.resultSummary}
                      </p>
                    )}
                  </div>

                  <section className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">Original Input Snapshot</h4>

                    <p className="text-sm text-slate-400">
                      These are the inputs saved when the analysis was run, not the project's
                      current records.
                    </p>

                    {snapshotProject && (
                      <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-200">
                        Project: {readText(snapshotProject, 'name')}
                      </p>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-blue-400" />
                          <h5 className="font-semibold text-white">
                            Requirements ({snapshotRequirements.length})
                          </h5>
                        </div>

                        <div className="mt-4 space-y-3">
                          {snapshotRequirements.map((item, index) => (
                            <div
                              key={readText(item, 'id') || index}
                              className="rounded-lg border border-slate-800 bg-slate-900 p-3"
                            >
                              <p className="font-mono text-xs font-semibold text-blue-300">
                                {readText(item, 'code')}
                              </p>

                              <p className="mt-1 text-sm font-medium text-white">
                                {readText(item, 'title')}
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                                {readText(item, 'description')}
                              </p>
                            </div>
                          ))}

                          {snapshotRequirements.length === 0 && (
                            <p className="text-sm text-slate-400">
                              No requirement snapshot available.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                        <div className="flex items-center gap-2">
                          <FlaskConical size={18} className="text-blue-400" />
                          <h5 className="font-semibold text-white">
                            Existing Tests ({snapshotTestCases.length})
                          </h5>
                        </div>

                        <div className="mt-4 space-y-3">
                          {snapshotTestCases.map((item, index) => (
                            <div
                              key={readText(item, 'id') || index}
                              className="rounded-lg border border-slate-800 bg-slate-900 p-3"
                            >
                              <p className="text-sm font-semibold text-white">
                                {readText(item, 'title')}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {readable(readText(item, 'type'))}
                                {' · '}
                                {readable(readText(item, 'status'))}
                              </p>

                              <details className="mt-3 text-sm text-slate-300">
                                <summary className="cursor-pointer text-blue-400">
                                  View original test details
                                </summary>

                                <p className="mt-3 whitespace-pre-wrap">
                                  {readText(item, 'description')}
                                </p>

                                <ol className="mt-3 list-decimal space-y-1 pl-5">
                                  {readStrings(item.steps).map((step, stepIndex) => (
                                    <li key={stepIndex}>{step}</li>
                                  ))}
                                </ol>

                                <p className="mt-3">Expected: {readText(item, 'expectedResult')}</p>
                              </details>
                            </div>
                          ))}

                          {snapshotTestCases.length === 0 && (
                            <p className="text-sm text-slate-400">
                              No tests were included in this run.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {(selected.requirementAssessments ?? []).length > 0 && (
                    <section className="space-y-3">
                      <h4 className="text-lg font-semibold text-white">Requirement Assessments</h4>

                      {(selected.requirementAssessments ?? []).map((assessment) => (
                        <div
                          key={assessment.requirementId}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"
                        >
                          <p className="font-semibold text-white">
                            {requirementNames.get(assessment.requirementId) ??
                              assessment.requirementId}
                          </p>

                          <p
                            className={`mt-2 text-xs font-semibold ${assessmentClass(assessment.assessment)}`}
                          >
                            {readable(assessment.assessment)}
                          </p>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                            {assessment.explanation}
                          </p>

                          {assessment.relatedExistingTestIds.length > 0 && (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
                              {assessment.relatedExistingTestIds.map((id) => (
                                <li key={id}>{testNames.get(id) ?? id}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </section>
                  )}

                  <section className="space-y-3">
                    <h4 className="text-lg font-semibold text-white">
                      Saved Suggestions ({selected.suggestions.length})
                    </h4>

                    {selected.suggestions.length === 0 && (
                      <p className="text-sm text-slate-400">
                        No suggestions were saved for this run.
                      </p>
                    )}

                    {selected.suggestions.map((suggestion) => (
                      <article
                        key={suggestion.id}
                        className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h5 className="font-semibold text-white">{suggestion.title}</h5>

                          {suggestion.savedTestCase ? (
                            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                              Saved as Test Case
                            </span>
                          ) : (
                            <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              Not added
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-blue-300">
                          {readable(suggestion.type)}
                          {' · '}
                          {suggestion.priority} priority
                        </p>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {suggestion.description}
                        </p>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Related Requirements
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            {suggestion.relatedRequirementIds
                              .map((id) => requirementNames.get(id) ?? id)
                              .join(', ')}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-400">Reason</p>

                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                            {suggestion.reason}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Execution Steps
                          </p>

                          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
                            {suggestion.steps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Expected Result
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                            {suggestion.expectedResult}
                          </p>
                        </div>
                      </article>
                    ))}
                  </section>

                  {(selected.limitations ?? []).length > 0 && (
                    <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
                      <h4 className="font-semibold text-amber-200">Analysis Limitations</h4>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-100">
                        {(selected.limitations ?? []).map((item, index) => (
                          <li key={index}>{item.description}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
