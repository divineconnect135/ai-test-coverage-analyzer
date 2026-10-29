import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  title: string
  value: number | string
  icon: LucideIcon
  description?: string
}

export default function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-400">{title}</p>

        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-white">{value}</p>

      {description && <p className="mt-2 text-xs text-slate-500">{description}</p>}
    </article>
  )
}
