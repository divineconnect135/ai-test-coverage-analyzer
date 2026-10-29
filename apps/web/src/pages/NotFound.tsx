import { Link } from 'react-router'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-white">
      <h1 className="text-6xl font-bold">404</h1>

      <p className="mt-4 text-slate-400">The page you requested does not exist.</p>

      <Link to="/" className="mt-6 rounded-lg bg-blue-600 px-5 py-3 hover:bg-blue-700">
        Return Home
      </Link>
    </main>
  )
}
