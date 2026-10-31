import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, FileText, Files, Layers3, Sparkles, Upload } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "../auth/AuthContext";
import { UploadDropzone } from "../components/UploadDropzone";
import { Button, EmptyState, ErrorNotice, FileBadge, formatDate, PageHeader, Spinner } from "../components/Ui";
import { documentsApi, getErrorMessage } from "../lib/api";
import type { DocumentItem, DocumentListResponse } from "../types";

const chartColors = ["#476c5b", "#7d9e8c", "#b2c7ba", "#dce7df"];

function useDocuments() {
  const [data, setData] = useState<DocumentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setData(await documentsApi.list()); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

function DocumentRows({ documents }: { documents: DocumentItem[] }) {
  return <div className="divide-y divide-line">
    {documents.map((doc) => (
      <Link key={doc.id} to={`/documents/${doc.id}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#fbfcfb]">
        <FileBadge type={doc.file_type} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{doc.filename}</p><p className="mt-1 text-xs text-muted">Added {formatDate(doc.created_at)}</p></div>
        {doc.summary_available && <span className="hidden rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand sm:inline">Summary ready</span>}
        <ArrowUpRight size={16} className="shrink-0 text-[#9ba4ac]" />
      </Link>
    ))}
  </div>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useDocuments();
  const [showUpload, setShowUpload] = useState(false);
  const docs = data?.documents ?? [];
  const fileCounts = useMemo(() => {
    const counts = docs.reduce<Record<string, number>>((acc, doc) => {
      const type = doc.file_type.toUpperCase();
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [docs]);
  const summarized = docs.filter((doc) => doc.summary_available).length;
  const recent = [...docs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return <>
    <PageHeader title={`Good ${getGreeting()}, ${user?.full_name.split(" ")[0] || "there"}`} description="Here’s what’s happening with your documents." action={<Button onClick={() => setShowUpload((value) => !value)}><Upload size={16} />{showUpload ? "Close upload" : "Upload document"}</Button>} />
    {showUpload && <div className="mb-6"><UploadDropzone onUploaded={() => { void refresh(); setShowUpload(false); }} /></div>}
    {error && <div className="mb-6"><ErrorNotice message={error} onRetry={() => void refresh()} /></div>}
    {loading && !data ? <Spinner label="Loading your workspace…" /> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total documents" value={data ? String(data.total) : "—"} caption="In your workspace" icon={<Files size={18} />} />
        <StatCard title="Summaries ready" value={String(summarized)} caption="AI summaries generated" icon={<Sparkles size={18} />} />
        <StatCard title="PDF documents" value={String(fileCounts.find((type) => type.name === "PDF")?.value || 0)} caption="Available to ask about" icon={<FileText size={18} />} />
        <StatCard title="Other formats" value={String(docs.filter((doc) => doc.file_type.toLowerCase() !== "pdf").length)} caption="DOCX and TXT documents" icon={<Layers3 size={18} />} />
      </section>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold text-ink">Recent uploads</h2><p className="mt-1 text-xs text-muted">Your latest documents</p></div><Link to="/documents" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">View all <ArrowRight size={14} /></Link></div>
          {loading && !data ? <Spinner /> : recent.length ? <DocumentRows documents={recent} /> : <div className="p-5"><EmptyState title="No documents yet" description="Upload your first PDF, DOCX or TXT file to get started." action={<Button onClick={() => setShowUpload(true)}>Upload a document</Button>} /></div>}
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div><h2 className="text-sm font-semibold text-ink">Document formats</h2><p className="mt-1 text-xs text-muted">Breakdown of your library</p></div>
          {fileCounts.length ? <div className="mt-3 flex items-center gap-3">
            <div className="h-[180px] min-w-0 flex-1"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={fileCounts} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={4} stroke="none">{fileCounts.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value, name) => [value, name]} contentStyle={{ borderRadius: 12, borderColor: "#e8ebef", fontSize: 12 }} /></PieChart></ResponsiveContainer></div>
            <div className="space-y-3">{fileCounts.map((entry, index) => <div key={entry.name} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span className="text-muted">{entry.name}</span><span className="font-semibold text-ink">{entry.value}</span></div>)}</div>
          </div> : <div className="flex h-[180px] items-center justify-center text-sm text-muted">Format data will appear after your first upload.</div>}
        </section>
      </div>
      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><Sparkles size={17} /></div><div className="flex-1"><h2 className="text-sm font-semibold text-ink">Ask your documents</h2><p className="mt-1 text-sm leading-6 text-muted">Open any PDF document to generate a summary or ask questions grounded in its content, with page citations and source excerpts.</p></div><Link to="/documents"><Button variant="secondary" className="hidden sm:inline-flex">Explore documents<ArrowRight size={15} /></Button></Link></div>
      </section>
    </>}
  </>;
}

function StatCard({ title, value, caption, icon }: { title: string; value: string; caption: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><span className="text-[13px] font-medium text-muted">{title}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-brand">{icon}</span></div><p className="mt-4 text-3xl font-semibold tracking-tight text-ink">{value}</p><p className="mt-1 text-xs text-muted">{caption}</p></div>;
}

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
