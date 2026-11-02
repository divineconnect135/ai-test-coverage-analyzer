import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react'

import { authClient } from '../../lib/auth-client'

type AuthFormMode = 'login' | 'register' | 'sign-in' | 'sign-up'

type AuthFormProps = {
  mode: AuthFormMode
}

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate()

  const isRegister = mode === 'register' || mode === 'sign-up'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const content = useMemo(() => {
    if (isRegister) {
      return {
        title: 'Create your account',
        subtitle:
          'Register to manage your testing projects, requirements, and AI analysis workflows.',
        submitLabel: 'Create account',
        switchText: 'Already have an account?',
        switchLinkText: 'Sign in',
        switchHref: '/login',
      }
    }

    return {
      title: 'Welcome back',
      subtitle: 'Sign in to access your projects, test cases, and AI-powered coverage analysis.',
      submitLabel: 'Sign in',
      switchText: "Don't have an account?",
      switchLinkText: 'Create an account',
      switchHref: '/register',
    }
  }, [isRegister])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail || !password) {
      setError('Please fill in all required fields.')
      return
    }

    if (isRegister) {
      if (!trimmedName) {
        setError('Please enter your full name.')
        return
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (isRegister) {
        const result = await authClient.signUp.email({
          name: trimmedName,
          email: trimmedEmail,
          password,
        })

        if (result.error) {
          setError(result.error.message ?? 'Unable to create account.')
          return
        }
      } else {
        const result = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        })

        if (result.error) {
          setError(result.error.message ?? 'Unable to sign in.')
          return
        }
      }

      navigate('/dashboard', { replace: true })
    } catch {
      setError(
        isRegister
          ? 'Something went wrong while creating your account.'
          : 'Something went wrong while signing in.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.3),rgba(2,6,23,0.88))]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <Sparkles size={16} />
                AI Test Coverage Analyzer
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">
                Build better test coverage with clear requirements and AI-assisted insights.
              </h1>

              <p className="mt-5 text-lg leading-8 text-slate-300">
                Organize your projects, manage requirements, create test cases, and discover
                possible testing gaps with a clean workflow built for modern QA and software teams.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="mb-3 inline-flex rounded-xl bg-blue-500/15 p-2 text-blue-300">
                    <ShieldCheck size={18} />
                  </div>
                  <h2 className="text-base font-semibold text-white">
                    Structured project workspace
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Keep requirements, linked test cases, and analysis history in one place.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="mb-3 inline-flex rounded-xl bg-cyan-500/15 p-2 text-cyan-300">
                    <Sparkles size={18} />
                  </div>
                  <h2 className="text-base font-semibold text-white">
                    AI-assisted recommendations
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Surface possible coverage gaps and convert suggestions into test cases.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-xl">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-blue-950/40 backdrop-blur-xl sm:p-8">
              <div className="mb-8 lg:hidden">
                <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200">
                  <Sparkles size={16} />
                  AI Test Coverage Analyzer
                </div>
              </div>

              <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {content.title}
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-300">{content.subtitle}</p>
              </header>

              {error && (
                <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                {isRegister && (
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-medium text-slate-200">
                      Full name
                    </label>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                  />
                </div>

                {isRegister && (
                  <div className="space-y-2">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-slate-200"
                    >
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm your password"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      {isRegister ? 'Creating account...' : 'Signing in...'}
                    </>
                  ) : (
                    <>
                      {content.submitLabel}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-300">
                {content.switchText}{' '}
                <Link
                  to={content.switchHref}
                  className="font-semibold text-blue-400 transition hover:text-blue-300"
                >
                  {content.switchLinkText}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
