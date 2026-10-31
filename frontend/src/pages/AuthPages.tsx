import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, LockKeyhole } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../lib/api";
import { Button } from "../components/Ui";

function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6] px-5 py-10">
    <div className="w-full max-w-[420px]">
      <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><BookOpen size={20} /></span>
        <span className="text-lg font-bold tracking-tight text-ink">IntelliDocs <span className="font-medium text-brand">AI</span></span>
      </Link>
      <section className="rounded-2xl border border-line bg-white p-7 shadow-soft sm:p-9">{children}</section>
      <p className="mt-6 text-center text-xs text-muted">Your documents stay in your secure workspace.</p>
    </div>
  </main>;
}

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try { await login(email, password); navigate("/", { replace: true }); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return <AuthShell>
    <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.12em] text-brand">Welcome back</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Sign in to your workspace</h1><p className="mt-2 text-sm leading-6 text-muted">Pick up where you left off with your documents.</p></div>
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium text-ink">Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1.5" placeholder="you@company.com" /></label>
      <label className="block text-sm font-medium text-ink">Password<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field mt-1.5" placeholder="Enter your password" /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full !py-3" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
    <div className="mt-5 flex justify-between text-sm"><Link className="font-medium text-brand hover:underline" to="/forgot-password">Forgot password?</Link><span className="text-muted">New here? <Link className="font-semibold text-brand hover:underline" to="/signup">Create account</Link></span></div>
  </AuthShell>;
}

export function SignupPage() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try { await signup(name, email, password); navigate("/", { replace: true }); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return <AuthShell>
    <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.12em] text-brand">Get started</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Create your account</h1><p className="mt-2 text-sm leading-6 text-muted">One calm place to organize and understand your documents.</p></div>
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium text-ink">Full name<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field mt-1.5" placeholder="Alex Morgan" /></label>
      <label className="block text-sm font-medium text-ink">Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1.5" placeholder="you@company.com" /></label>
      <label className="block text-sm font-medium text-ink">Password<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field mt-1.5" placeholder="At least 8 characters" /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full !py-3" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
    </form>
    <p className="mt-5 text-center text-sm text-muted">Already have an account? <Link className="font-semibold text-brand hover:underline" to="/login">Sign in</Link></p>
  </AuthShell>;
}

export function ForgotPasswordPage() {
  return <AuthShell>
    <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} />Back to sign in</Link>
    <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><LockKeyhole size={20} /></div>
    <h1 className="text-2xl font-semibold tracking-tight text-ink">Password recovery</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Password reset isn’t available yet because the connected API does not expose a recovery endpoint. Please contact your workspace administrator for help accessing your account.</p>
    <Link to="/login"><Button className="mt-6 w-full">Return to sign in</Button></Link>
  </AuthShell>;
}
