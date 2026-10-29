import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import FormField from '../components/ui/FormField'

export default function Register() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordError('')

    // Registration will be implemented in Phase 5.
    setNotice('Registration is not connected yet. Account creation will be added in Phase 5.')
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-center text-3xl font-bold text-white">Create your account</h1>

          <p className="mt-3 text-center text-sm text-slate-400">
            Start organizing your software testing projects.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <FormField
              id="register-name"
              name="name"
              type="text"
              label="Full name"
              placeholder="Your name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
            />

            <FormField
              id="register-email"
              name="email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <FormField
              id="register-password"
              name="password"
              type="password"
              label="Password"
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={8}
              hint="Use at least 8 characters."
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setPasswordError('')
                setNotice('')
              }}
              required
            />

            <FormField
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              label="Confirm password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={confirmPassword}
              error={passwordError}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setPasswordError('')
                setNotice('')
              }}
              required
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              Create Account
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
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
