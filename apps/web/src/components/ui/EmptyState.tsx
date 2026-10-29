import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
      <div className="mb-4 rounded-full bg-slate-800 p-4 text-slate-400">
        <Icon size={28} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-white">{title}</h3>

      <p className="mt-2 max-w-sm text-sm text-slate-400">{description}</p>
    </div>
  )
}
