import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, History, ListChecks, Sparkles, ShieldCheck } from 'lucide-react'

const features = [
  {
    icon: ClipboardList,
    title: 'Manage Requirements',
    description:
      'Organize software requirements in one place and keep them connected to your test cases.',
  },
  {
    icon: ListChecks,
    title: 'Track Test Cases',
    description: 'Document existing tests, expected results, and their related requirements.',
  },
  {
    icon: Sparkles,
    title: 'Discover Potential Gaps',
    description:
      'Use AI to identify potentially missing positive, negative, and edge-case scenarios.',
  },
  {
    icon: History,
    title: 'Review Analysis History',
    description:
      'Revisit previous analyses and review recommendations without generating them again.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Add requirements',
    description: 'Describe what your software is expected to do.',
  },
  {
    number: '02',
    title: 'Add existing tests',
    description: 'Document the test scenarios you already have.',
  },
  {
    number: '03',
    title: 'Analyze with AI',
    description: 'Review potential gaps and save useful suggestions.',
  },
]

export default function Landing() {
  const [apiStatus, setApiStatus] = useState('')
  const [checking, setChecking] = useState(false)

  async function checkApiConnection() {
    setChecking(true)
    setApiStatus('')

    try {
      const response = await fetch('/api/health')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      setApiStatus('Backend connection successful.')
    } catch {
      setApiStatus('Unable to connect to the backend.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
              AI-Powered Test Planning
            </span>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find the tests you
              <span className="text-blue-500"> might be missing.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              Compare software requirements with existing test cases to identify potential coverage
              gaps and improve your testing strategy.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Explore Dashboard
                <ArrowRight size={18} aria-hidden="true" />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-lg border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:bg-slate-800"
              >
                How It Works
              </a>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Dashboard preview — authentication and AI analysis are coming in later phases.
            </p>
          </div>

          {/* Static illustrative analysis */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-blue-950/20">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <h2 className="font-semibold text-white">Analysis Preview</h2>
              <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400">
                Example
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Requirement
                </p>
                <div className="rounded-lg bg-slate-800 p-4 text-sm text-slate-200">
                  Users can log in using valid credentials.
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Existing Test
                </p>
                <div className="rounded-lg bg-slate-800 p-4 text-sm text-slate-200">
                  Verify login with correct email and password.
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-blue-400">
                  <Sparkles size={14} aria-hidden="true" />
                  Potential Missing Scenarios
                </p>

                <div className="space-y-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-200">• Login with an incorrect password</p>
                  <p className="text-sm text-slate-200">• Login with empty credentials</p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Static illustration. This is not a live AI result.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-bold text-white">Everything needed to plan better tests</h2>
          <p className="mt-4 text-slate-400">
            The application will bring requirements, existing tests, and AI recommendations into one
            workflow.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <article
                key={feature.title}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="mb-5 inline-flex rounded-lg bg-blue-500/10 p-3 text-blue-400">
                  <Icon size={22} aria-hidden="true" />
                </div>

                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>

                <p className="mt-3 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* Workflow Section */}
      <section id="how-it-works" className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold text-white">How it works</h2>

          <p className="mt-4 text-slate-400">Three steps to review your test plan.</p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number}>
                <span className="text-3xl font-bold text-blue-500">{step.number}</span>

                <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>

                <p className="mt-3 text-slate-400">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 sm:flex-row sm:items-start">
          <ShieldCheck className="shrink-0 text-blue-400" size={28} aria-hidden="true" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              AI suggestions, not verified test results
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              This tool evaluates only the requirements and test descriptions you provide. It does
              not execute tests, verify bugs, or measure actual code coverage.
            </p>
          </div>
        </div>
      </section>

      {/* Development-only API diagnostic */}
      {import.meta.env.DEV && (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="border-t border-slate-800 pt-6">
            <p className="mb-3 text-xs text-slate-500">Development tools</p>

            <button
              type="button"
              onClick={checkApiConnection}
              disabled={checking}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Check API Connection'}
            </button>

            <p role="status" className="mt-2 text-sm text-slate-400">
              {apiStatus}
            </p>
          </div>
        </section>
      )}
    </main>
  )
}
