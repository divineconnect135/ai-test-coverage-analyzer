import { expect, test, type APIResponse, type Response as BrowserResponse } from '@playwright/test'

const email = process.env.E2E_EMAIL?.trim()
const password = process.env.E2E_PASSWORD

// Both APIResponse and browser Response can provide
// HTTP status and JSON response bodies.
async function responseMessage(response: APIResponse | BrowserResponse): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>

    if (record.error && typeof record.error === 'object') {
      const error = record.error as Record<string, unknown>

      if (typeof error.message === 'string') {
        return error.message
      }

      if (typeof error.code === 'string') {
        return error.code
      }
    }

    if (typeof record.message === 'string') {
      return record.message
    }

    if (typeof record.code === 'string') {
      return record.code
    }
  }

  return 'No detailed error message returned.'
}

// Extract the actual project ID returned by Express.
// Never use "new" from /projects/new as an ID.
function readCreatedProjectId(body: unknown): string {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid project creation response.')
  }

  const record = body as Record<string, unknown>

  const candidate = record.project && typeof record.project === 'object' ? record.project : record

  const project = candidate as Record<string, unknown>

  if (typeof project.id !== 'string' || !project.id.trim() || project.id === 'new') {
    throw new Error('Project creation response is missing a valid project ID.')
  }

  return project.id
}

test('authenticated project workspace workflow', async ({ page }) => {
  test.skip(!email || !password, 'E2E_EMAIL and E2E_PASSWORD are required.')

  if (!email || !password) {
    return
  }

  const unique = Date.now().toString(36).toUpperCase()

  const projectName = `E2E Project ${unique}`
  const requirementCode = `E2E-${unique}`
  const testCaseTitle = `Login scenario ${unique}`

  let projectId: string | null = null

  try {
    // ----------------------------------------
    // STEP 1: Authenticate with Better Auth
    // ----------------------------------------

    const signIn = await page.request.post('/api/auth/sign-in/email', {
      headers: {
        Origin: 'http://localhost:5173',
      },
      data: {
        email,
        password,
      },
    })

    if (!signIn.ok()) {
      throw new Error(
        `E2E sign-in failed: HTTP ${signIn.status()} — ` + (await responseMessage(signIn)),
      )
    }

    // ----------------------------------------
    // STEP 2: Verify Dashboard
    // ----------------------------------------

    await page.goto('/dashboard')

    await expect(
      page.getByRole('heading', {
        name: 'Dashboard',
      }),
    ).toBeVisible()

    // ----------------------------------------
    // STEP 3: Create a project
    // ----------------------------------------

    await page.goto('/projects/new')

    await page.getByLabel('Project Name').fill(projectName)

    await page.getByLabel('Description').fill('Disposable project used for automated testing.')

    // Wait for the actual project-creation API response.
    const [createResponse] = await Promise.all([
      page.waitForResponse((response) => {
        const pathname = new URL(response.url()).pathname.replace(/\/$/, '')

        return response.request().method() === 'POST' && pathname === '/api/projects'
      }),

      page
        .getByRole('button', {
          name: 'Create Project',
        })
        .click(),
    ])

    if (!createResponse.ok()) {
      throw new Error(
        `Project creation failed: HTTP ${createResponse.status()} — ` +
          (await responseMessage(createResponse)),
      )
    }

    const creationBody: unknown = await createResponse.json()

    projectId = readCreatedProjectId(creationBody)

    // Confirm navigation to the actual project.
    await page.waitForURL((url) => url.pathname === `/projects/${projectId}`, {
      timeout: 15_000,
    })

    await expect(
      page.getByRole('heading', {
        name: projectName,
      }),
    ).toBeVisible()

    // ----------------------------------------
    // STEP 4: Create a requirement
    // ----------------------------------------

    await page
      .getByRole('button', {
        name: 'Add Requirement',
      })
      .click()

    await page.locator('#requirement-code').fill(requirementCode)

    await page.locator('#requirement-title').fill('Verify user login')

    await page
      .locator('#requirement-description')
      .fill('Users must be able to sign in with valid credentials.')

    await page
      .getByRole('button', {
        name: 'Create Requirement',
      })
      .click()

    const requirementsSection = page.locator('section[aria-labelledby="requirements-heading"]')

    await expect(
      requirementsSection.getByText(requirementCode, {
        exact: true,
      }),
    ).toBeVisible()

    // ----------------------------------------
    // STEP 5: Create another requirement
    // ----------------------------------------

    // This second requirement has no linked test,
    // allowing mock AI to identify a potential gap.

    const gapResponse = await page.request.post(
      `/api/projects/${encodeURIComponent(projectId)}/requirements`,
      {
        data: {
          code: `GAP-${unique}`,
          title: 'Password reset',
          description: 'Users must be able to request a password reset.',
        },
      },
    )

    if (gapResponse.status() !== 201) {
      throw new Error(
        `Second requirement creation failed: HTTP ${gapResponse.status()} — ` +
          (await responseMessage(gapResponse)),
      )
    }

    await page.reload()

    // ----------------------------------------
    // STEP 6: Create a linked test case
    // ----------------------------------------

    await page
      .getByRole('button', {
        name: 'Add Test Case',
      })
      .click()

    await page.locator('#test-title').fill(testCaseTitle)

    await page.locator('#test-description').fill('Verify successful login with valid credentials.')

    await page.locator('#test-steps').fill('Open login page\nEnter valid credentials\nSubmit')

    await page.locator('#test-expected-result').fill('The dashboard is displayed.')

    await page
      .getByRole('checkbox', {
        name: new RegExp(requirementCode),
      })
      .check()

    await page
      .getByRole('button', {
        name: 'Create Test Case',
      })
      .click()

    await expect(
      page.getByRole('heading', {
        name: testCaseTitle,
      }),
    ).toBeVisible()

    // ----------------------------------------
    // STEP 7: Verify database persistence
    // ----------------------------------------

    await page.reload()

    await expect(
      requirementsSection.getByText(requirementCode, {
        exact: true,
      }),
    ).toBeVisible()

    await expect(
      page.getByRole('heading', {
        name: testCaseTitle,
      }),
    ).toBeVisible()

    // ----------------------------------------
    // STEP 8: Optional mock AI analysis
    // ----------------------------------------

    // Run only when E2E_RUN_AI=1.
    // The backend must use AI_PROVIDER=mock.

    if (process.env.E2E_RUN_AI === '1') {
      await page
        .getByRole('button', {
          name: 'Analyze Project',
        })
        .click()

      await expect(page.getByText('Analysis Complete')).toBeVisible({
        timeout: 60_000,
      })

      await expect(page.getByText('mock-coverage-v1')).toBeVisible()

      // Save one AI suggestion as a test case.
      const saveButton = page
        .getByRole('button', {
          name: 'Add as Test Case',
        })
        .first()

      await expect(saveButton).toBeVisible()

      await saveButton.click()

      await expect(
        page.getByRole('button', {
          name: 'Saved as Test Case',
        }),
      ).toBeDisabled()

      // Verify saved AI analysis history.
      await page
        .getByRole('button', {
          name: 'View History',
        })
        .click()

      await expect(page.getByText(/saved analysis runs/)).toBeVisible()
    }
  } finally {
    // ----------------------------------------
    // STEP 9: Clean up the E2E project
    // ----------------------------------------

    // Only delete a project with an ID received
    // from the successful creation API response.

    if (projectId) {
      const cleanupResponse = await page.request.delete(
        `/api/projects/${encodeURIComponent(projectId)}`,
      )

      if (!cleanupResponse.ok()) {
        console.warn(
          `E2E cleanup failed for project ${projectId}: ` + `HTTP ${cleanupResponse.status()}`,
        )
      }
    }
  }
})
