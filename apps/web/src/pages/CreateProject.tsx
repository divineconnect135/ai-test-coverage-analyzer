import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

import FormField from '../components/ui/FormField'

type ProjectDraft = {
  name: string
  description: string
}

export default function CreateProject() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [preview, setPreview] = useState<ProjectDraft | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()

    if (trimmedName.length < 2) {
      setNameError('Project name must contain at least 2 characters.')
      setPreview(null)
      return
    }

    setNameError('')

    // UI-only preview. No data is saved yet.
    setPreview({
      name: trimmedName,
      description: description.trim(),
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Projects
      </Link>

      <header className="mt-8">
        <h1 className="text-3xl font-bold text-white">Create Project</h1>

        <p className="mt-2 text-slate-400">
          Define a project to organize requirements and test cases.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-6"
      >
        <FormField
          id="project-name"
          name="name"
          type="text"
          label="Project Name"
          placeholder="e.g. Authentication System"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setNameError('')
            setPreview(null)
          }}
          error={nameError}
          minLength={2}
          maxLength={100}
          required
        />

        <div>
          <label
            htmlFor="project-description"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            Description
          </label>

          <textarea
            id="project-description"
            name="description"
            rows={5}
            maxLength={1000}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              setPreview(null)
            }}
            placeholder="Describe the software functionality you want to test..."
            className="w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-blue-500"
          />

          <p className="mt-2 text-xs text-slate-500">Optional. Maximum 1000 characters.</p>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-6">
          <Link
            to="/projects"
            className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Preview Project
          </button>
        </div>
      </form>

      {preview && (
        <section
          aria-live="polite"
          className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-6"
        >
          <h2 className="text-lg font-semibold text-white">Project Preview</h2>

          <h3 className="mt-4 font-medium text-blue-300">{preview.name}</h3>

          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
            {preview.description || 'No description provided.'}
          </p>

          <p className="mt-4 text-xs text-slate-400">
            This is a temporary preview. The project has not been saved. Database persistence will
            be added in Phase 6.
          </p>
        </section>
      )}
    </div>
  )
}
