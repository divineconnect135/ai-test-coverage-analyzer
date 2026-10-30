import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  CheckCircle2,
  FilePlus2,
  FileText,
  FlaskConical,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { getRequirements, type Requirement } from '../../lib/requirements-api'

import { getTestCases, type TestCase } from '../../lib/test-cases-api'

import {
  runAnalysis,
  saveSuggestion,
  type AnalysisRun,
  type AnalysisSuggestion,
  type RequirementAssessment,
} from '../../lib/analyses-api'

type Props = {
  projectId: string
  refreshToken: number
  onTestCaseSaved: () => void
}

function readable(value: string): string {
  return value.replaceAll('_', ' ')
}

function assessmentLabel(assessment: RequirementAssessment['assessment']): string {
  switch (assessment) {
    case 'POTENTIALLY_COVERED':
      return 'Potentially Covered'
    case 'POTENTIAL_GAP':
      return 'Potential Gap'
    case 'UNCERTAIN':
      return 'Uncertain'
  }
}

function assessmentClass(assessment: RequirementAssessment['assessment']): string {
  switch (assessment) {
    case 'POTENTIALLY_COVERED':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
    case 'POTENTIAL_GAP':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-200'
    case 'UNCERTAIN':
      return 'border-slate-600 bg-slate-800 text-slate-200'
  }
}

function priorityClass(priority: AnalysisSuggestion['priority']): string {
  switch (priority) {
    case 'HIGH':
      return 'border-red-500/20 bg-red-500/10 text-red-200'
    case 'MEDIUM':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-200'
    case 'LOW':
      return 'border-slate-600 bg-slate-800 text-slate-200'
  }
}

export function AnalysisSection({ projectId, refreshToken, onTestCaseSaved }: Props) {
  const [requirements, setRequirements] = useState<Requirement[] | null>(null)

  const [testCases, setTestCases] = useState<TestCase[] | null>(null)

  const [contextError, setContextError] = useState('')
  const [contextReload, setContextReload] = useState(0)

  const [analysis, setAnalysis] = useState<AnalysisRun | null>(null)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  const [savingIds, setSavingIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])

  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})

  const analysisInFlight = useRef(false)
  const savingInFlight = useRef(new Set<string>())

  useEffect(() => {
    const controller = new AbortController()

    void Promise.all([
      getRequirements(projectId, controller.signal),
      getTestCases(projectId, controller.signal),
    ])
      .then(([loadedRequirements, loadedTests]) => {
        if (controller.signal.aborted) return

        setRequirements(loadedRequirements)
        setTestCases(loadedTests)
        setContextError('')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        setContextError(error instanceof Error ? error.message : 'Unable to load analysis inputs.')
      })

    return () => controller.abort()
  }, [projectId, refreshToken, contextReload])

  function refreshInputs() {
    setRequirements(null)
    setTestCases(null)
    setContextError('')
    setContextReload((value) => value + 1)
  }

  async function handleAnalyze() {
    if (
      analysisInFlight.current ||
      !requirements ||
      requirements.length === 0 ||
      !testCases ||
      contextError
    ) {
      return
    }

    analysisInFlight.current = true

    setIsAnalyzing(true)
    setAnalysisError('')
    setAnalysis(null)
    setSavedIds([])
    setSaveErrors({})
    setSavingIds([])

    try {
      const result = await runAnalysis(projectId)

      if (result.status !== 'COMPLETED') {
        throw new Error('The analysis did not complete successfully.')
      }

      setAnalysis(result)
    } catch (error: unknown) {
      setAnalysisError(error instanceof Error ? error.message : 'Unable to run AI analysis.')
    } finally {
      analysisInFlight.current = false
      setIsAnalyzing(false)
    }
  }

  async function handleSaveSuggestion(suggestion: AnalysisSuggestion) {
    if (
      !analysis ||
      savingInFlight.current.has(suggestion.id) ||
      savedIds.includes(suggestion.id)
    ) {
      return
    }

    savingInFlight.current.add(suggestion.id)

    setSavingIds((current) => [...current, suggestion.id])

    setSaveErrors((current) => {
      const next = { ...current }
      delete next[suggestion.id]
      return next
    })

    try {
      const result = await saveSuggestion(projectId, analysis.id, suggestion.id)

      setSavedIds((current) =>
        current.includes(suggestion.id) ? current : [...current, suggestion.id],
      )

      if (!result.alreadySaved) {
        onTestCaseSaved()
      }
    } catch (error: unknown) {
      setSaveErrors((current) => ({
        ...current,
        [suggestion.id]: error instanceof Error ? error.message : 'Unable to save suggestion.',
      }))
    } finally {
      savingInFlight.current.delete(suggestion.id)

      setSavingIds((current) => current.filter((id) => id !== suggestion.id))
    }
  }

  const isLoadingInputs = requirements === null || testCases === null

  const canAnalyze = !isLoadingInputs && !contextError && requirements.length > 0 && !isAnalyzing

  const requirementNames = new Map(
    (requirements ?? []).map((requirement) => [
      requirement.id,
      `${requirement.code} — ${requirement.title}`,
    ]),
  )

  const testNames = new Map((testCases ?? []).map((testCase) => [testCase.id, testCase.title]))

  const snapshot = analysis?.inputSnapshot

  const savedRequirementNames = new Map<string, string>()
  const savedTestNames = new Map<string, string>()

  if (
    snapshot &&
    typeof snapshot === 'object' &&
    'requirements' in snapshot &&
    Array.isArray(snapshot.requirements)
  ) {
    for (const item of snapshot.requirements) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.code === 'string' &&
        typeof item.title === 'string'
      ) {
        savedRequirementNames.set(item.id, `${item.code} — ${item.title}`)
      }
    }
  }

  if (
    snapshot &&
    typeof snapshot === 'object' &&
    'testCases' in snapshot &&
    Array.isArray(snapshot.testCases)
  ) {
    for (const item of snapshot.testCases) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.title === 'string'
      ) {
        savedTestNames.set(item.id, item.title)
      }
    }
  }

  function requirementLabel(id: string): string {
    return (
      savedRequirementNames.get(id) ?? requirementNames.get(id) ?? 'Requirement no longer available'
    )
  }

  function testLabel(id: string): string {
    return savedTestNames.get(id) ?? testNames.get(id) ?? 'Existing test no longer available'
  }

  return (
    <section
      id="ai-analysis"
      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-xl shadow-black/10"
    >
      <div className="border-b border-slate-800 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400">
              <BrainCircuit size={23} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                AI Workspace
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                AI Test Coverage Analysis
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Review current requirements and tests, identify possible coverage gaps, and generate
                additional test suggestions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshInputs}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh Inputs
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center gap-2">
              <FileText size={19} className="text-blue-400" />
              <h3 className="font-semibold text-white">Requirements</h3>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              {requirements?.length ?? '—'} requirements available for analysis
            </p>

            <div className="mt-4 max-h-56 space-y-3 overflow-y-auto">
              {requirements?.map((requirement) => (
                <div
                  key={requirement.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                >
                  <p className="font-mono text-xs font-semibold text-blue-300">
                    {requirement.code}
                  </p>

                  <p className="mt-1 text-sm font-medium text-white">{requirement.title}</p>
                </div>
              ))}

              {requirements?.length === 0 && (
                <p className="text-sm text-slate-400">Add a requirement before analyzing.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center gap-2">
              <FlaskConical size={19} className="text-blue-400" />
              <h3 className="font-semibold text-white">Existing Test Cases</h3>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              {testCases?.length ?? '—'} existing tests available for analysis
            </p>

            <div className="mt-4 max-h-56 space-y-3 overflow-y-auto">
              {testCases?.map((testCase) => (
                <div
                  key={testCase.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                >
                  <p className="text-sm font-medium text-white">{testCase.title}</p>

                  <p className="mt-1 text-xs text-slate-400">
                    {readable(testCase.type)}
                    {' · '}
                    {readable(testCase.status)}
                    {' · '}
                    {testCase.requirementIds.length} linked requirements
                  </p>
                </div>
              ))}

              {testCases?.length === 0 && (
                <p className="text-sm text-slate-400">
                  No tests exist yet. The analysis can still suggest tests for your requirements.
                </p>
              )}
            </div>
          </div>
        </div>

        {isLoadingInputs && !contextError && (
          <p role="status" className="text-sm text-slate-400">
            Loading analysis inputs...
          </p>
        )}

        {contextError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-200">{contextError}</p>

            <button
              type="button"
              onClick={refreshInputs}
              className="mt-2 text-sm font-medium text-red-200 underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-white">Run Coverage Analysis</h3>

              <p className="mt-1 text-sm text-slate-400">
                AI findings are recommendations for review, not verified test execution results.
              </p>
            </div>

            <button
              type="button"
              disabled={!canAnalyze}
              onClick={() => void handleAnalyze()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={17} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Project'}
            </button>
          </div>

          {isAnalyzing && (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 flex items-center gap-3 text-sm text-slate-300"
            >
              <RefreshCw size={17} className="animate-spin" />
              Analyzing requirements and existing tests. This may take a moment.
            </div>
          )}
        </div>

        {analysisError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="flex items-center gap-2 font-semibold text-red-200">
              <AlertTriangle size={18} />
              Analysis failed
            </div>

            <p className="mt-2 text-sm text-red-300">{analysisError}</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-7" aria-live="polite">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={19} className="text-blue-300" />
                <h3 className="font-semibold text-white">Analysis Complete</h3>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                {analysis.resultSummary}
              </p>

              <p className="mt-3 text-xs text-slate-400">
                Provider model: {analysis.model ?? 'Unknown'}
                {' · '}
                {new Date(analysis.createdAt).toLocaleString()}
              </p>
            </div>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Requirement Assessments</h3>

              {(analysis.requirementAssessments ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No requirement assessments were returned.</p>
              ) : (
                (analysis.requirementAssessments ?? []).map((assessment) => (
                  <article
                    key={assessment.requirementId}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="font-semibold text-white">
                        {requirementLabel(assessment.requirementId)}
                      </h4>

                      <span
                        className={`rounded-lg border px-3 py-1 text-xs font-semibold ${assessmentClass(assessment.assessment)}`}
                      >
                        {assessmentLabel(assessment.assessment)}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {assessment.explanation}
                    </p>

                    {assessment.relatedExistingTestIds.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Related existing tests
                        </p>

                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                          {assessment.relatedExistingTestIds.map((testId) => (
                            <li key={testId}>{testLabel(testId)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Suggested Test Cases</h3>

                <p className="mt-1 text-sm text-slate-400">
                  {analysis.suggestions.length} suggestions available for review
                </p>
              </div>

              {analysis.suggestions.length === 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                  <p className="text-sm text-slate-400">
                    No additional test suggestions were generated for this analysis.
                  </p>
                </div>
              )}

              {analysis.suggestions.map((suggestion) => {
                const saved = savedIds.includes(suggestion.id)
                const saving = savingIds.includes(suggestion.id)

                return (
                  <article
                    key={suggestion.id}
                    className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-semibold text-white">{suggestion.title}</h4>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">
                            {readable(suggestion.type)}
                          </span>

                          <span
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${priorityClass(suggestion.priority)}`}
                          >
                            {suggestion.priority} Priority
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={saved || saving || isAnalyzing}
                        onClick={() => void handleSaveSuggestion(suggestion)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saved ? (
                          <>
                            <Check size={16} />
                            Saved as Test Case
                          </>
                        ) : saving ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <FilePlus2 size={16} />
                            Add as Test Case
                          </>
                        )}
                      </button>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {suggestion.description}
                    </p>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Related Requirements
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestion.relatedRequirementIds.map((id) => (
                          <span
                            key={id}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200"
                          >
                            {requirementLabel(id)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Why this test was suggested
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {suggestion.reason}
                      </p>
                    </div>

                    {suggestion.steps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Execution Steps
                        </p>

                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
                          {suggestion.steps.map((step, index) => (
                            <li key={`${suggestion.id}-${index}`}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Expected Result
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {suggestion.expectedResult}
                      </p>
                    </div>

                    {saveErrors[suggestion.id] && (
                      <p
                        role="alert"
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
                      >
                        {saveErrors[suggestion.id]}
                      </p>
                    )}

                    {saved && (
                      <p role="status" className="text-sm text-emerald-300">
                        This suggestion is now a saved test case.
                      </p>
                    )}
                  </article>
                )
              })}
            </section>

            {(analysis.limitations ?? []).length > 0 && (
              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                <h3 className="font-semibold text-amber-100">Analysis Limitations</h3>

                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-100">
                  {(analysis.limitations ?? []).map((limitation, index) => (
                    <li key={index}>{limitation.description}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {!analysis && !isAnalyzing && !analysisError && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-10 text-center">
            <BrainCircuit size={27} className="mx-auto text-slate-500" />

            <p className="mt-3 text-sm text-slate-400">
              Run an analysis to view requirement assessments and suggested test cases.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
