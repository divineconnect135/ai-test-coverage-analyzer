import { Link } from 'react-router-dom'
import { ArrowLeft, FolderKanban, House, SearchX } from 'lucide-react'

export function NotFound() {
  return (
    <section className="flex min-h-[75vh] items-center justify-center bg-[#020617] px-5 py-12 text-slate-100">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center shadow-xl sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
          <SearchX size={31} />
        </div>

        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-blue-400">Error 404</p>

        <h1 className="mt-3 text-3xl font-bold text-white">Page not found</h1>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          The page you requested could not be found. Your projects and saved analyses have not been
          changed.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <House size={17} />
            Dashboard
          </Link>

          <Link
            to="/projects"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <FolderKanban size={17} />
            Projects
          </Link>
        </div>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="mt-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </section>
  )
}

export default NotFound
