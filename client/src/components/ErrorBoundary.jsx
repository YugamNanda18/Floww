import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Floww ErrorBoundary Caught]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
          <div className="max-w-md w-full bg-surface-800 border border-surface-700 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something unexpected happened</h2>
            <p className="text-sm text-slate-400 mb-6">
              Floww caught a rendering error and kept the application safe. You can reload the page or return to the main dashboard.
            </p>
            {this.state.error && (
              <div className="mb-6 text-left p-3 rounded-lg bg-surface-900 border border-surface-700 text-xs font-mono text-red-300 max-h-32 overflow-y-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleHome}
                className="px-4 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-slate-200 text-sm font-semibold transition"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
