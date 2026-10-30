import { Component, type ReactNode } from 'react'

import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class RenderErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  }

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
    }
  }

  componentDidCatch(error: Error) {
    console.error('Page rendering error:', error)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        role="alert"
        className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-500/30 bg-slate-900 p-8 text-center shadow-xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <AlertTriangle size={26} />
        </div>

        <h1 className="mt-5 text-xl font-bold text-white">This page encountered an error</h1>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          Something went wrong while displaying this page. You can reload it or return to your
          projects.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <RefreshCw size={17} />
            Reload Page
          </button>

          <a
            href="/projects"
            className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            Back to Projects
          </a>
        </div>
      </div>
    )
  }
}
