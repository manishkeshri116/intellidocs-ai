import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, LoaderCircle, Search, Trash2, Upload, X } from "lucide-react";
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
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setActionError("");
    try {
      await documentsApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    }
    catch (err) { setActionError(getErrorMessage(err)); }
    finally { setDeleting(false); }
  }

  return <>
    <PageHeader title="Documents" description="Search, organize and get insights from your files." action={<Button onClick={() => setUploadOpen((value) => !value)}><Upload size={16} />{uploadOpen ? "Close upload" : "Upload document"}</Button>} />
    {uploadOpen && <div className="mb-6"><UploadDropzone onUploaded={() => { void refresh(); setUploadOpen(false); }} /></div>}
    {error && <div className="mb-5"><ErrorNotice message={error} onRetry={() => void refresh()} /></div>}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <label className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ba4ac]" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="field pl-10" placeholder="Search documents by name…" /></label>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="field sm:w-44"><option value="all">All file types</option><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="txt">TXT</option></select>
    </div>
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold text-ink">Your library</h2><p className="mt-1 text-xs text-muted">{data ? `${filtered.length} of ${data.total} documents` : "Loading documents…"}</p></div></div>
      {loading && !data ? <Spinner label="Loading documents…" /> : filtered.length ? <div className="divide-y divide-line">
        {filtered.map((doc) => <div key={doc.id} className="flex items-center gap-3 px-4 py-4 transition hover:bg-[#f8f7ff] sm:px-5">
          <FileBadge type={doc.file_type} />
          <Link to={`/documents/${doc.id}`} className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink hover:text-brand">{doc.filename}</p><p className="mt-1 text-xs text-muted">Uploaded {formatDate(doc.created_at)}</p></Link>
          {doc.summary_available && <span className="hidden rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand md:inline">Summary ready</span>}
          <Link to={`/documents/${doc.id}`} className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink" aria-label={`Open ${doc.filename}`}><ArrowUpRight size={16} /></Link>
          <button onClick={() => { setActionError(""); setDeleteTarget(doc); }} disabled={deleting} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label={`Delete ${doc.filename}`} title="Delete document"><Trash2 size={16} /></button>
        </div>)}
      </div> : <div className="p-5"><EmptyState title={query || filter !== "all" ? "No matching documents" : "Your library is empty"} description={query || filter !== "all" ? "Try another name or file type filter." : "Upload a PDF, DOCX or TXT file to see it here."} action={!query && filter === "all" ? <Button onClick={() => setUploadOpen(true)}>Upload your first document</Button> : undefined} /></div>}
    </section>
    {deleteTarget && <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#17212b]/40 px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) setDeleteTarget(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !deleting) setDeleteTarget(null);
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-document-title"
        aria-describedby="delete-document-description"
        className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,.22)]"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><AlertTriangle size={20} /></div>
          <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-lg p-2 text-muted transition hover:bg-gray-100 hover:text-ink disabled:opacity-50" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <h2 id="delete-document-title" className="mt-4 text-lg font-semibold tracking-tight text-ink">Delete this document?</h2>
        <p id="delete-document-description" className="mt-2 break-all text-sm leading-6 text-muted">
          “{deleteTarget.filename}” will be permanently deleted. This action cannot be undone.
        </p>
        {actionError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{actionError}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-[#56616c] transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={deleting} onClick={() => void confirmDelete()} className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
            {deleting && <LoaderCircle size={15} className="animate-spin" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </section>
    </div>}
  </>;
}
