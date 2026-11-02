import * as Sentry from "@sentry/react";

export type LogLevel = "debug" | "info" | "warn" | "error";
type SafeMetadata = { category?: string; status?: number; errorType?: string };

const isProduction = import.meta.env.PROD;
let sentryEnabled = false;
const reportedErrors = new WeakSet<object>();
const reportedMessages = new Set<string>();

export function shouldLog(level: LogLevel, production = isProduction) {
  return level !== "debug" || !production;
}

function safeMetadata(metadata?: SafeMetadata) {
  if (!metadata) return undefined;
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

function send(level: LogLevel, message: string, metadata?: SafeMetadata) {
  if (!shouldLog(level)) return;
  const safe = safeMetadata(metadata);
  const consoleMethod = level === "debug" ? "debug" : level;
  if (safe) console[consoleMethod](`[${level}] ${message}`, safe);
  else console[consoleMethod](`[${level}] ${message}`);
}

function markReported(error: unknown): boolean {
  if ((typeof error !== "object" || error === null) && typeof error !== "function") return false;
  if (reportedErrors.has(error as object)) return false;
  reportedErrors.add(error as object);
  return true;
}

export const logger = {
  debug: (message: string, metadata?: SafeMetadata) => send("debug", message, metadata),
  info: (message: string, metadata?: SafeMetadata) => send("info", message, metadata),
  warn: (message: string, metadata?: SafeMetadata) => send("warn", message, metadata),
  error(message: string, error?: unknown, metadata?: SafeMetadata) {
    send("error", message, metadata);
    if (sentryEnabled && error !== undefined && markReported(error)) {
      Sentry.withScope((scope) => {
        scope.setLevel("error");
        for (const [key, value] of Object.entries(safeMetadata(metadata) ?? {})) scope.setTag(key, String(value));
        Sentry.captureException(error);
      });
    }
  },
  captureException(error: unknown, metadata?: SafeMetadata) {
    if (!sentryEnabled || !markReported(error)) return;
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      for (const [key, value] of Object.entries(safeMetadata(metadata) ?? {})) scope.setTag(key, String(value));
      Sentry.captureException(error);
    });
  },
  captureMessage(message: string, metadata?: SafeMetadata) {
    if (!sentryEnabled) return;
    const key = `${message}:${JSON.stringify(safeMetadata(metadata) ?? {})}`;
    if (reportedMessages.has(key)) return;
    reportedMessages.add(key);
    // Bound memory while retaining recent duplicate suppression.
    if (reportedMessages.size > 500) reportedMessages.clear();
    Sentry.withScope((scope) => {
      scope.setLevel("error");
      for (const [tag, value] of Object.entries(safeMetadata(metadata) ?? {})) scope.setTag(tag, String(value));
      Sentry.captureMessage(message, "error");
    });
  },
};

export function initializeMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!isProduction || !dsn || sentryEnabled) return;
  Sentry.init({
    dsn,
    integrations: (defaults) => defaults.filter((integration) => integration.name !== "GlobalHandlers"),
    beforeSend(event) {
      // Keep stack frames for debugging, but strip request/user data and exception text,
      // which can contain credentials, prompts, filenames, or document contents.
      delete event.request;
      delete event.user;
      delete event.breadcrumbs;
      delete event.extra;
      delete event.contexts;
      delete event.message;
      if (event.logentry) event.logentry.message = "Application error";
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          exception.value = "Application error";
          exception.stacktrace?.frames?.forEach((frame) => { delete frame.vars; });
        }
      }
      return event;
    },
  });
  sentryEnabled = true;

  window.addEventListener("error", (event) => {
    logger.captureException(event.error ?? new Error("Unhandled JavaScript error"), { category: "javascript" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    logger.captureException(event.reason ?? new Error("Unhandled promise rejection"), { category: "promise" });
  });
}

export function isMonitoringEnabled() {
  return sentryEnabled;
}
