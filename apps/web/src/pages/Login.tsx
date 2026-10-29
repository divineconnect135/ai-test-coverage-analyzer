import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import FormField from '../components/ui/FormField'

export default function Login() {
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Authentication will be implemented in Phase 5.
    setNotice('Login is not connected yet. Authentication will be added in Phase 5.')
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-center text-3xl font-bold text-white">Welcome back</h1>

          <p className="mt-3 text-center text-sm text-slate-400">
            Sign in to access your testing projects.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <FormField
              id="login-email"
              name="email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <FormField
              id="login-password"
              name="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              Sign In
            </button>
          </form>

          {notice && (
            <p
              role="status"
              className="mt-5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-300"
            >
              {notice}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-blue-400 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
