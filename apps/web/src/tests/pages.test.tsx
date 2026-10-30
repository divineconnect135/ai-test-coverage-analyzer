import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

const api = vi.hoisted(() => ({
  getProjects: vi.fn(),
}))

vi.mock('../src/lib/projects-api', () => ({
  getProjects: api.getProjects,
}))

import type { Project } from '../../src/lib/projects-api'
import { Projects } from '../../src/pages/Projects'
import { Dashboard } from '../../src/pages/Dashboard'

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'E-commerce Application',
    description: 'Login, shopping cart, and checkout.',
    createdAt: '2026-10-30T10:00:00Z',
    updatedAt: '2026-10-30T12:00:00Z',
    requirementCount: 3,
    testCaseCount: 2,
    analysisCount: 1,
    ...overrides,
  }
}

function mount(children: ReactNode) {
  return render(<MemoryRouter>{children}</MemoryRouter>)
}

beforeEach(() => {
  api.getProjects.mockReset()
})

describe('Projects page', () => {
  it('displays an empty state', async () => {
    api.getProjects.mockResolvedValue([])

    mount(<Projects />)

    expect(
      await screen.findByRole('heading', {
        name: 'No projects yet',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('link', {
        name: 'Create Project',
      }),
    ).toHaveAttribute('href', '/projects/new')
  })

  it('shows project information and counts', async () => {
    api.getProjects.mockResolvedValue([project()])

    mount(<Projects />)

    expect(
      await screen.findByRole('heading', {
        name: 'E-commerce Application',
      }),
    ).toBeInTheDocument()

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('filters by project name', async () => {
    api.getProjects.mockResolvedValue([
      project(),
      project({
        id: 'project-2',
        name: 'Inventory Manager',
      }),
    ])

    const user = userEvent.setup()
    mount(<Projects />)

    await screen.findByText('Inventory Manager')

    await user.type(
      screen.getByRole('searchbox', {
        name: 'Search projects',
      }),
      'inventory',
    )

    expect(screen.getByText('Inventory Manager')).toBeInTheDocument()

    expect(screen.queryByText('E-commerce Application')).not.toBeInTheDocument()
  })

  it('shows an API failure and supports retry', async () => {
    api.getProjects
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce([project()])

    const user = userEvent.setup()
    mount(<Projects />)

    expect(await screen.findByText('Service unavailable')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Try Again',
      }),
    )

    expect(await screen.findByText('E-commerce Application')).toBeInTheDocument()
  })
})

describe('Dashboard page', () => {
  it('renders live statistics', async () => {
    api.getProjects.mockResolvedValue([project()])

    mount(<Dashboard />)

    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard',
      }),
    ).toBeInTheDocument()

    const statistics = screen.getByRole('region', {
      name: 'Workspace statistics',
    })

    expect(within(statistics).getByText('3')).toBeInTheDocument()

    expect(within(statistics).getByText('2')).toBeInTheDocument()

    // Total Projects and AI Analyses are both 1.
    expect(within(statistics).getAllByText('1')).toHaveLength(2)
  })

  it('links to the recent project', async () => {
    api.getProjects.mockResolvedValue([project()])

    mount(<Dashboard />)

    const link = await screen.findByRole('link', {
      name: /E-commerce Application/,
    })

    expect(link).toHaveAttribute('href', '/projects/project-1')
  })
})
