import type { ComponentProps } from 'react'

type FormFieldProps = ComponentProps<'input'> & {
  id: string
  label: string
  error?: string
  hint?: string
}

export default function FormField({
  id,
  label,
  error,
  hint,
  className = '',
  ...props
}: FormFieldProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        className={`w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 aria-invalid:border-red-500 ${className}`}
      />

      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {!error && hint && (
        <p id={`${id}-hint`} className="mt-2 text-xs text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
}
