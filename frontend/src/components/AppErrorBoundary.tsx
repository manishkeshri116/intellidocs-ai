import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { logger } from "../lib/logger";

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    logger.captureException(error, { category: "react" });
  }

  render() {
    if (this.state.hasError) {
      return <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
        <section className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-soft" role="alert">
          <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-muted">We couldn’t load this part of IntelliDocs. Please try again.</p>
          <button className="button-primary mt-6 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}
