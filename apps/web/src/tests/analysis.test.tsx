import { beforeEach, describe, expect, it, vi } from 'vitest'

import { render, screen, waitFor } from '@testing-library/react'

import userEvent from '@testing-library/user-event'

const api = vi.hoisted(() => ({
  getRequirements: vi.fn(),
  getTestCases: vi.fn(),
  runAnalysis: vi.fn(),
  saveSuggestion: vi.fn(),
}))

vi.mock('../src/lib/requirements-api', () => ({
  getRequirements: api.getRequirements,
}))

vi.mock('../src/lib/test-cases-api', () => ({
  getTestCases: api.getTestCases,
}))

vi.mock('../src/lib/analyses-api', () => ({
  runAnalysis: api.runAnalysis,
  saveSuggestion: api.saveSuggestion,
}))

import { AnalysisSection } from '../../src/components/analysis/AnalysisSection'

const requirement = {
  id: 'requirement-1',
  projectId: 'project-1',
  code: 'AUTH-001',
  title: 'User Login',
  description: 'Users can sign in.',
  createdAt: '2026-10-30T10:00:00Z',
  updatedAt: '2026-10-30T10:00:00Z',
}

const suggestion = {
  id: 'suggestion-1',
  analysisRunId: 'analysis-1',
  title: 'Reject an invalid password',
  description: 'Test login with incorrect credentials.',
  type: 'NEGATIVE',
  priority: 'HIGH',
  reason: 'Negative authentication behavior needs testing.',
  steps: ['Open the login page.', 'Enter an incorrect password.', 'Submit the form.'],
  expectedResult: 'Access is denied.',
  relatedRequirementIds: ['requirement-1'],
  createdAt: '2026-10-30T12:01:00Z',
}

const completedAnalysis = {
  id: 'analysis-1',
  projectId: 'project-1',
  status: 'COMPLETED',
  model: 'mock-coverage-v1',
  resultSummary: 'One possible testing gap was identified.',
  inputSnapshot: {
    requirements: [requirement],
    testCases: [],
  },
  requirementAssessments: [
    {
      requirementId: 'requirement-1',
      assessment: 'POTENTIAL_GAP',
      relatedExistingTestIds: [],
      explanation: 'No existing test covers this requirement.',
    },
  ],
  limitations: [
    {
      description: 'Tests were not executed.',
    },
  ],
  suggestions: [suggestion],
  errorCode: null,
  inputTokens: null,
  outputTokens: null,
  createdAt: '2026-10-30T12:00:00Z',
  completedAt: '2026-10-30T12:01:00Z',
}

beforeEach(() => {
  for (const mock of Object.values(api)) {
    mock.mockReset()
  }

  api.getRequirements.mockResolvedValue([requirement])
  api.getTestCases.mockResolvedValue([])
  api.runAnalysis.mockResolvedValue(completedAnalysis)

  api.saveSuggestion.mockResolvedValue({
    alreadySaved: false,
    testCase: {
      id: 'test-case-1',
    },
  })
})

describe('AI Analysis workspace', () => {
  it('disables analysis when no requirements exist', async () => {
    api.getRequirements.mockResolvedValue([])

    render(<AnalysisSection projectId="project-1" refreshToken={0} onTestCaseSaved={vi.fn()} />)

    expect(await screen.findByText('Add a requirement before analyzing.')).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: 'Analyze Project',
      }),
    ).toBeDisabled()
  })

  it('shows completed AI results', async () => {
    const user = userEvent.setup()

    render(<AnalysisSection projectId="project-1" refreshToken={0} onTestCaseSaved={vi.fn()} />)

    const button = screen.getByRole('button', {
      name: 'Analyze Project',
    })

    await waitFor(() => {
      expect(button).toBeEnabled()
    })

    await user.click(button)

    expect(await screen.findByText('Analysis Complete')).toBeInTheDocument()

    expect(screen.getByText('One possible testing gap was identified.')).toBeInTheDocument()

    expect(screen.getByText('Reject an invalid password')).toBeInTheDocument()

    expect(api.runAnalysis).toHaveBeenCalledWith('project-1')
  })

  it('saves a suggestion once and updates its button', async () => {
    const user = userEvent.setup()
    const onTestCaseSaved = vi.fn()

    render(
      <AnalysisSection projectId="project-1" refreshToken={0} onTestCaseSaved={onTestCaseSaved} />,
    )

    const analyzeButton = screen.getByRole('button', {
      name: 'Analyze Project',
    })

    await waitFor(() => {
      expect(analyzeButton).toBeEnabled()
    })

    await user.click(analyzeButton)

    const saveButton = await screen.findByRole('button', {
      name: 'Add as Test Case',
    })

    await user.click(saveButton)

    await waitFor(() => {
      expect(onTestCaseSaved).toHaveBeenCalledTimes(1)
    })

    expect(api.saveSuggestion).toHaveBeenCalledWith('project-1', 'analysis-1', 'suggestion-1')

    expect(
      screen.getByRole('button', {
        name: 'Saved as Test Case',
      }),
    ).toBeDisabled()
  })

  it('displays a provider failure', async () => {
    api.runAnalysis.mockRejectedValue(new Error('AI provider unavailable'))

    const user = userEvent.setup()

    render(<AnalysisSection projectId="project-1" refreshToken={0} onTestCaseSaved={vi.fn()} />)

    const button = screen.getByRole('button', {
      name: 'Analyze Project',
    })

    await waitFor(() => {
      expect(button).toBeEnabled()
    })

    await user.click(button)

    expect(await screen.findByText('AI provider unavailable')).toBeInTheDocument()
  })
})
