import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle, Search } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-brand/50",
    secondary: "border border-line bg-white text-ink hover:bg-gray-50 disabled:opacity-50",
    ghost: "text-muted hover:bg-gray-100 hover:text-ink",
    danger: "text-red-600 hover:bg-red-50",
  };
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><LoaderCircle className="h-4 w-4 animate-spin" />{label}</div>;
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        {onRetry && <button className="font-semibold underline" onClick={onRetry}>Try again</button>}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Search size={20} /></div>
    <h3 className="font-semibold text-ink">{title}</h3>
    <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

export function FileBadge({ type }: { type: string }) {
  const label = type.toUpperCase();
  const style = type.toLowerCase() === "pdf" ? "bg-rose-50 text-rose-600" : type.toLowerCase() === "docx" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold tracking-wide ${style}`}>{label}</span>;
}

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}
