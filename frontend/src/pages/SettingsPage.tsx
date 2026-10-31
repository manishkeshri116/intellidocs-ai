import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button, PageHeader } from "../components/Ui";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }
  return <>
    <PageHeader title="Settings" description="Manage your profile and account access." />
    <div className="max-w-3xl space-y-5">
      <section className="rounded-2xl border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4"><div className="flex items-center gap-2"><UserRound size={16} className="text-brand" /><h2 className="text-sm font-semibold text-ink">Profile</h2></div><p className="mt-1 text-xs text-muted">Your account information from the API</p></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div><p className="text-xs font-medium text-muted">Full name</p><p className="mt-1.5 text-sm font-semibold text-ink">{user?.full_name || "Unavailable"}</p></div>
          <div><p className="text-xs font-medium text-muted">Email address</p><p className="mt-1.5 text-sm font-semibold text-ink">{user?.email || "Unavailable"}</p></div>
          <div><p className="text-xs font-medium text-muted">Account ID</p><p className="mt-1.5 text-sm font-semibold text-ink">{user?.id ?? "Unavailable"}</p></div>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand" /><h2 className="text-sm font-semibold text-ink">Security & account</h2></div><p className="mt-1 text-xs text-muted">Manage this session</p></div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-sm font-medium text-ink">Sign out of IntelliDocs AI</p><p className="mt-1 text-xs text-muted">Your authentication token will be removed from this browser.</p></div><Button variant="secondary" onClick={signOut}><LogOut size={15} />Log out</Button></div>
      </section>
      <p className="text-xs leading-5 text-muted">Profile editing and password changes are not currently exposed by the connected API.</p>
    </div>
  </>;
}
