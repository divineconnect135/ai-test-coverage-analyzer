import { useState } from 'react'

type HealthResponse = {
  status: string
  message: string
}

function App() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function checkApiConnection() {
    setLoading(true)
    setError(false)
    setMessage('')

    try {
      const response = await fetch('/api/health')

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data: HealthResponse = await response.json()

      setMessage(data.message)
    } catch (err) {
      console.error('API request failed:', err)
      setError(true)
      setMessage('Unable to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="max-w-xl text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">AI Test Coverage Analyzer</h1>

        <p className="mb-8 text-lg text-slate-400">
          Identify potential test coverage gaps using AI.
        </p>

        <button
          type="button"
          onClick={checkApiConnection}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check API Connection'}
        </button>

        <p role="status" className={`mt-6 ${error ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      </div>
    </main>
  )
}

export default App
