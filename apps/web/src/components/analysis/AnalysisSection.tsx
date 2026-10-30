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
      return 'bg-green-50 text-green-800'
    case 'POTENTIAL_GAP':
      return 'bg-amber-50 text-amber-800'
    case 'UNCERTAIN':
      return 'bg-slate-100 text-slate-700'
  }
}

function priorityClass(priority: AnalysisSuggestion['priority']): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-red-50 text-red-700'
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-800'
    case 'LOW':
      return 'bg-slate-100 text-slate-700'
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

  // Refs prevent duplicate requests even when events happen
  // before React has rendered updated button states.
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

  // A completed run uses the input snapshot saved when
  // the request was made. Preview data may be refreshed
  // independently after test cases are added.
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
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit size={23} className="text-blue-600" />

            <h2 className="text-xl font-semibold">AI Test Coverage Analysis</h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Review existing requirements and tests, identify possible coverage gaps, and generate
            additional test suggestions.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshInputs}
          disabled={isAnalyzing}
          aria-label="Refresh analysis inputs"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh Inputs
        </button>
      </header>

      {/* Preview of project records sent to analysis */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2">
            <FileText size={19} className="text-blue-600" />

            <h3 className="font-semibold">Requirements</h3>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {requirements?.length ?? '—'} requirements available for analysis
          </p>

          <div className="mt-4 max-h-56 space-y-3 overflow-y-auto">
            {requirements?.map((requirement) => (
              <div key={requirement.id} className="rounded-lg bg-slate-50 p-3">
                <p className="font-mono text-xs font-semibold text-blue-700">{requirement.code}</p>

                <p className="mt-1 text-sm font-medium">{requirement.title}</p>
              </div>
            ))}

            {requirements?.length === 0 && (
              <p className="text-sm text-slate-500">Add a requirement before analyzing.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2">
            <FlaskConical size={19} className="text-blue-600" />

            <h3 className="font-semibold">Existing Test Cases</h3>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {testCases?.length ?? '—'} existing tests available for analysis
          </p>

          <div className="mt-4 max-h-56 space-y-3 overflow-y-auto">
            {testCases?.map((testCase) => (
              <div key={testCase.id} className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-medium">{testCase.title}</p>

                <p className="mt-1 text-xs text-slate-500">
                  {readable(testCase.type)}
                  {' · '}
                  {readable(testCase.status)}
                  {' · '}
                  {testCase.requirementIds.length} linked requirements
                </p>
              </div>
            ))}

            {testCases?.length === 0 && (
              <p className="text-sm text-slate-500">
                No tests exist yet. The analysis can still suggest tests for your requirements.
              </p>
            )}
          </div>
        </div>
      </div>

      {isLoadingInputs && !contextError && (
        <p role="status" className="text-sm text-slate-500">
          Loading analysis inputs...
        </p>
      )}

      {contextError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{contextError}</p>

          <button
            type="button"
            onClick={refreshInputs}
            className="mt-2 text-sm font-medium text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-xl bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Run Coverage Analysis</h3>

            <p className="mt-1 text-sm text-slate-500">
              AI findings are recommendations for review, not verified test execution results.
            </p>
          </div>

          <button
            type="button"
            disabled={!canAnalyze}
            onClick={() => void handleAnalyze()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={17} />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Project'}
          </button>
        </div>

        {isAnalyzing && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 flex items-center gap-3 text-sm text-slate-600"
          >
            <RefreshCw size={17} className="animate-spin" />
            Analyzing requirements and existing tests. The request may take some time.
          </div>
        )}
      </div>

      {analysisError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <AlertTriangle size={18} />
            Analysis failed
          </div>

          <p className="mt-2 text-sm text-red-700">{analysisError}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-7" aria-live="polite">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={19} className="text-blue-700" />

              <h3 className="font-semibold">Analysis Complete</h3>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
              {analysis.resultSummary}
            </p>

            <p className="mt-3 text-xs text-slate-500">
              Provider model: {analysis.model ?? 'Unknown'}
              {' · '}
              {new Date(analysis.createdAt).toLocaleString()}
            </p>
          </div>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Requirement Assessments</h3>

            {(analysis.requirementAssessments ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No requirement assessments were returned.</p>
            ) : (
              (analysis.requirementAssessments ?? []).map((assessment) => (
                <article
                  key={assessment.requirementId}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="font-semibold">{requirementLabel(assessment.requirementId)}</h4>

                    <span
                      className={`rounded-md px-3 py-1 text-xs font-semibold ${assessmentClass(assessment.assessment)}`}
                    >
                      {assessmentLabel(assessment.assessment)}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                    {assessment.explanation}
                  </p>

                  {assessment.relatedExistingTestIds.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-600">Related existing tests</p>

                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
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
              <h3 className="text-lg font-semibold">Suggested Test Cases</h3>

              <p className="mt-1 text-sm text-slate-500">
                {analysis.suggestions.length} suggestions available for review
              </p>
            </div>

            {analysis.suggestions.length === 0 && (
              <div className="rounded-lg border border-slate-200 p-5">
                <p className="text-sm text-slate-600">
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
                  className="space-y-4 rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-semibold">{suggestion.title}</h4>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {readable(suggestion.type)}
                        </span>

                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${priorityClass(suggestion.priority)}`}
                        >
                          {suggestion.priority} Priority
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={saved || saving || isAnalyzing}
                      onClick={() => void handleSaveSuggestion(suggestion)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
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

                  <p className="whitespace-pre-wrap text-sm text-slate-600">
                    {suggestion.description}
                  </p>

                  <div>
                    <p className="text-xs font-semibold text-slate-700">Related Requirements</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestion.relatedRequirementIds.map((id) => (
                        <span
                          key={id}
                          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                        >
                          {requirementLabel(id)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Why this test was suggested
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {suggestion.reason}
                    </p>
                  </div>

                  {suggestion.steps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Execution Steps</p>

                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                        {suggestion.steps.map((step, index) => (
                          <li key={`${suggestion.id}-${index}`}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-700">Expected Result</p>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {suggestion.expectedResult}
                    </p>
                  </div>

                  {saveErrors[suggestion.id] && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      {saveErrors[suggestion.id]}
                    </p>
                  )}

                  {saved && (
                    <p role="status" className="text-sm text-green-700">
                      This suggestion is now a saved test case.
                    </p>
                  )}
                </article>
              )
            })}
          </section>

          {(analysis.limitations ?? []).length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-semibold text-amber-900">Analysis Limitations</h3>

              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-900">
                {(analysis.limitations ?? []).map((limitation, index) => (
                  <li key={index}>{limitation.description}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {!analysis && !isAnalyzing && !analysisError && (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <BrainCircuit size={27} className="mx-auto text-slate-400" />

          <p className="mt-3 text-sm text-slate-500">
            Run an analysis to view requirement assessments and suggested test cases.
          </p>
        </div>
      )}
    </section>
  )
}
