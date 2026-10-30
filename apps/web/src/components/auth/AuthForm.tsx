import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authClient } from '../../lib/auth-client'

type AuthFormProps = {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate()
  const isRegister = mode === 'register'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    setFormError('')

    if (isRegister && password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (isRegister) {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: normalizedEmail,
          password,
        })

        if (result.error) {
          setFormError(result.error.message ?? 'Registration failed.')
          return
        }
      } else {
        const result = await authClient.signIn.email({
          email: normalizedEmail,
          password,
        })

        if (result.error) {
          setFormError(result.error.message ?? 'Invalid login credentials.')
          return
        }
      }

      navigate('/dashboard', { replace: true })
    } catch {
      setFormError('Unable to complete the request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100'

  return (
    <section className="mx-auto w-full max-w-md px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        {isRegister ? 'Create your account' : 'Welcome back'}
      </h1>

      <p className="mt-2 text-sm text-slate-600">
        {isRegister
          ? 'Register to manage your testing projects.'
          : 'Sign in to access your projects and analyses.'}
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-5">
        {isRegister && (
          <div>
            <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700">
              Full name
            </label>

            <input
              id="auth-name"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Your name"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>

          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700">
            Password
          </label>

          <input
            id="auth-password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="Enter your password"
          />
        </div>

        {isRegister && (
          <div>
            <label
              htmlFor="auth-confirm-password"
              className="block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>

            <input
              id="auth-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              placeholder="Confirm your password"
            />
          </div>
        )}

        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        {isRegister ? (
          <>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </section>
  )
}
