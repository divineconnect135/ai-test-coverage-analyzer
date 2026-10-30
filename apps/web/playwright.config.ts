import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webDirectory = fileURLToPath(new URL('.', import.meta.url))

const repositoryRoot = resolve(webDirectory, '../..')

// Local test credentials. Never commit this file.
loadEnv({
  path: resolve(webDirectory, '.env.e2e.local'),
  quiet: true,
})

export default defineConfig({
  testDir: './e2e',

  timeout: 90_000,

  expect: {
    timeout: 15_000,
  },

  fullyParallel: false,
  workers: 1,

  retries: process.env.CI ? 1 : 0,

  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',

    ...devices['Desktop Chrome'],

    // Avoid recording authentication secrets in traces.
    trace: 'off',

    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    cwd: repositoryRoot,
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
