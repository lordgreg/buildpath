import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render crash so a bug in one panel does not leave a blank page.
 * The generated filter and the saved builds live outside the tree, so a reload
 * loses nothing that was committed.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('FilterPath crashed while rendering', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold text-white">
          Something went wrong
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          The builder hit an error while rendering. Your saved builds and the
          filters in your folder are untouched.
        </p>
        <pre className="max-h-64 w-full overflow-auto rounded-lg border border-ink-700 bg-ink-900/60 p-3 text-xs text-red-200">
          {this.state.error.message}
        </pre>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gold-400 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-gold-300"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-lg border border-ink-600 px-3 py-2 text-sm text-zinc-300 hover:border-ink-500"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }
}