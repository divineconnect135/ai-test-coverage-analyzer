import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderPlus, LoaderCircle } from 'lucide-react'

import { createProject } from '../lib/projects-api'

export function CreateProject() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    const cleanedName = name.trim()
    const cleanedDescription = description.trim()

    if (cleanedName.length < 2 || cleanedName.length > 100) {
      setError('Project name must contain 2–100 characters.')
      return
    }

    if (cleanedDescription.length > 1000) {
      setError('Description cannot exceed 1000 characters.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      // Send the project to the real Express API.
      // The API associates the project with the
      // authenticated user and saves it in Neon.
      const project = await createProject({
        name: cleanedName,
        description: cleanedDescription,
      })

      // Navigate to the newly saved project.
      navigate(`/projects/${project.id}`, {
        replace: true,
      })
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to create project. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft size={17} />
        Back to Projects
      </Link>

      <header>
        <div className="flex items-center gap-3">
          <FolderPlus size={28} className="text-blue-500" />

          <h1 className="text-3xl font-bold text-white">Create Project</h1>
        </div>

        <p className="mt-3 text-sm text-slate-400">
          Create a project to organize requirements, test cases, and AI coverage analyses.
        </p>
      </header>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-6 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-sm"
      >
        <div>
          <label htmlFor="project-name" className="mb-2 block text-sm font-semibold text-slate-200">
            Project Name
          </label>

          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
            required
            minLength={2}
            maxLength={100}
            disabled={isSubmitting}
            placeholder="E-commerce Application"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
          />

          <p className="mt-2 text-xs text-slate-500">2–100 characters</p>
        </div>

        <div>
          <label
            htmlFor="project-description"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Description
          </label>

          <textarea
            id="project-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              setError('')
            }}
            rows={5}
            maxLength={1000}
            disabled={isSubmitting}
            placeholder="Testing login, shopping cart, and payment functionality."
            className="w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
          />

          <div className="mt-2 flex justify-between gap-3 text-xs text-slate-500">
            <span>Optional. Maximum 1000 characters.</span>
            <span>{description.length}/1000</span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-700 pt-6">
          <Link
            to="/projects"
            aria-disabled={isSubmitting}
            className="rounded-lg border border-slate-600 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus size={17} />
                Create Project
              </>
            )}
          </button>
        </div>
      </form>

      <p className="text-center text-xs text-slate-500">
        Your project will be saved securely to Neon PostgreSQL and associated with your account.
      </p>
    </div>
  )
}

export default CreateProject
