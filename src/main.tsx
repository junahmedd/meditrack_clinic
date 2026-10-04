import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import './index.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070d18] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20 text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">MediTrack Workspace Notice</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              An unexpected session state was detected. Click below to restore your authorized workspace.
            </p>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-rose-400 text-left overflow-x-auto max-h-28">
              {this.state.error?.message || "Unknown Runtime Error"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Reset &amp; Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
