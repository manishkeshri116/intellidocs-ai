import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search, Trash2, Upload } from "lucide-react";
import { Button, EmptyState, ErrorNotice, FileBadge, formatDate, PageHeader, Spinner } from "../components/Ui";
import { UploadDropzone } from "../components/UploadDropzone";
import { documentsApi, getErrorMessage } from "../lib/api";
import type { DocumentItem, DocumentListResponse } from "../types";

export function DocumentsPage() {
  const [data, setData] = useState<DocumentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try { setData(await documentsApi.list()); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => (data?.documents || []).filter((doc) => {
    const matchesText = doc.filename.toLowerCase().includes(query.toLowerCase());
    const matchesType = filter === "all" || doc.file_type.toLowerCase() === filter;
    return matchesText && matchesType;
  }), [data, query, filter]);

  async function remove(document: DocumentItem) {
    if (!window.confirm(`Delete "${document.filename}"? This cannot be undone.`)) return;
    setDeleting(document.id);
    setActionError("");
    try { await documentsApi.remove(document.id); await refresh(); }
    catch (err) { setActionError(getErrorMessage(err)); }
    finally { setDeleting(null); }
  }

  return <>
    <PageHeader title="Documents" description="Search, organize and get insights from your files." action={<Button onClick={() => setUploadOpen((value) => !value)}><Upload size={16} />{uploadOpen ? "Close upload" : "Upload document"}</Button>} />
    {uploadOpen && <div className="mb-6"><UploadDropzone onUploaded={() => { void refresh(); setUploadOpen(false); }} /></div>}
    {error && <div className="mb-5"><ErrorNotice message={error} onRetry={() => void refresh()} /></div>}
    {actionError && <div className="mb-5"><ErrorNotice message={actionError} /></div>}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <label className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ba4ac]" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="field pl-10" placeholder="Search documents by name…" /></label>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="field sm:w-44"><option value="all">All file types</option><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="txt">TXT</option></select>
    </div>
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold text-ink">Your library</h2><p className="mt-1 text-xs text-muted">{data ? `${filtered.length} of ${data.total} documents` : "Loading documents…"}</p></div></div>
      {loading && !data ? <Spinner label="Loading documents…" /> : filtered.length ? <div className="divide-y divide-line">
        {filtered.map((doc) => <div key={doc.id} className="flex items-center gap-3 px-4 py-4 transition hover:bg-[#fbfcfb] sm:px-5">
          <FileBadge type={doc.file_type} />
          <Link to={`/documents/${doc.id}`} className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink hover:text-brand">{doc.filename}</p><p className="mt-1 text-xs text-muted">Uploaded {formatDate(doc.created_at)}</p></Link>
          {doc.summary_available && <span className="hidden rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand md:inline">Summary ready</span>}
          <Link to={`/documents/${doc.id}`} className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink" aria-label={`Open ${doc.filename}`}><ArrowUpRight size={16} /></Link>
          <button onClick={() => void remove(doc)} disabled={deleting === doc.id} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label={`Delete ${doc.filename}`} title="Delete document"><Trash2 size={16} /></button>
        </div>)}
      </div> : <div className="p-5"><EmptyState title={query || filter !== "all" ? "No matching documents" : "Your library is empty"} description={query || filter !== "all" ? "Try another name or file type filter." : "Upload a PDF, DOCX or TXT file to see it here."} action={!query && filter === "all" ? <Button onClick={() => setUploadOpen(true)}>Upload your first document</Button> : undefined} /></div>}
    </section>
  </>;
}
