import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, FileText, MessageSquareText, Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button, ErrorNotice, FileBadge, formatDate, Spinner } from "../components/Ui";
import { documentsApi, getErrorMessage } from "../lib/api";
import type { AskResponse, ConversationEntry, DocumentDetail, SummaryResponse } from "../types";

type DetailTab = "overview" | "chat";

function historyKey(email: string | undefined) {
  return `intellidocs_chat_history_${email || "anonymous"}`;
}

export function DocumentDetailPage() {
  const { documentId } = useParams();
  const id = Number(documentId);
  const { user } = useAuth();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<DetailTab>("overview");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");

  const loadDocument = useCallback(async () => {
    if (!Number.isInteger(id) || id < 1) {
      setError("This document link is invalid.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try { setDocument(await documentsApi.get(id)); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void loadDocument(); }, [loadDocument]);

  async function generateSummary() {
    setSummaryBusy(true);
    setSummaryError("");
    try { setSummary(await documentsApi.summary(id)); }
    catch (err) { setSummaryError(getErrorMessage(err)); }
    finally { setSummaryBusy(false); }
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setChatBusy(true);
    setChatError("");
    try {
      const result = await documentsApi.ask(id, question.trim());
      setAnswer(result);
      setQuestion("");
      const key = historyKey(user?.email);
      const previous = readHistory(key);
      const entry: ConversationEntry = {
        id: `${Date.now()}-${result.document_id}`,
        documentId: result.document_id,
        filename: document?.filename || "Document",
        question: result.question,
        answer: result.answer,
        sources: result.sources,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify([entry, ...previous].slice(0, 100)));
    } catch (err) {
      setChatError(getErrorMessage(err));
    } finally { setChatBusy(false); }
  }

  const suggestedQuestions = useMemo(() => [
    "What is this document about?",
    "What are the key points?",
    "What conclusions does it make?",
  ], []);

  if (loading) return <Spinner label="Loading document…" />;
  if (error || !document) return <div><Link to="/documents" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} />All documents</Link><ErrorNotice message={error || "Document could not be loaded."} onRetry={() => void loadDocument()} /></div>;

  return <>
    <Link to="/documents" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} />All documents</Link>
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <FileBadge type={document.file_type} />
      <div className="min-w-0 flex-1"><h1 className="break-all text-xl font-semibold tracking-tight text-ink">{document.filename}</h1><p className="mt-1 text-sm text-muted">Added {formatDate(document.created_at)} · {document.file_type.toUpperCase()}</p></div>
      <Button onClick={() => setTab("chat")}><MessageSquareText size={16} />Ask this document</Button>
    </div>
    <div className="mb-5 flex gap-1 border-b border-line">
      <button onClick={() => setTab("overview")} className={`tab-button ${tab === "overview" ? "tab-button-active" : ""}`}><FileText size={15} />Overview</button>
      <button onClick={() => setTab("chat")} className={`tab-button ${tab === "chat" ? "tab-button-active" : ""}`}><Sparkles size={15} />AI chat</button>
    </div>
    {tab === "overview" ? <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
      <section className="min-h-[380px] rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-ink">Document preview</h2><p className="mt-1 text-xs text-muted">File information from your workspace</p></div><FileText size={18} className="text-muted" /></div>
        <div className="mt-6 flex min-h-[270px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-[#f8f7ff] px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><FileBadge type={document.file_type} /></div>
          <h3 className="mt-4 max-w-md break-all text-sm font-semibold text-ink">{document.filename}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            {document.extracted_text_available
              ? "Text was extracted and is available to the AI. The current API does not provide a document preview or extracted-text download."
              : "The API does not report extracted text for this document. It may not yet be readable by the document intelligence features."}
          </p>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><Sparkles size={17} /></div><div><h2 className="text-sm font-semibold text-ink">AI summary</h2><p className="mt-1 text-xs text-muted">{document.summary_available ? "A summary is saved for this document" : "Get the key ideas at a glance"}</p></div></div>
        {!summary && <div className="mt-6"><p className="text-sm leading-6 text-muted">Generate an AI-written summary grounded in the content available to the backend.</p><Button onClick={() => void generateSummary()} disabled={summaryBusy} className="mt-4">{summaryBusy ? "Generating…" : document.summary_available ? "Load saved summary" : "Generate summary"}</Button></div>}
        {summaryError && <div className="mt-4"><ErrorNotice message={summaryError} /></div>}
        {summary && <div className="mt-5"><div className="whitespace-pre-wrap text-sm leading-7 text-[#46525d]">{summary.summary}</div>{summary.cached && <p className="mt-4 text-xs text-muted">Loaded saved summary.</p>}</div>}
      </section>
    </div> : <section className="rounded-2xl border border-line bg-white shadow-soft">
      <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-ink">Ask a question</h2><p className="mt-1 text-xs text-muted">Answers use relevant document excerpts and include page citations when available.</p></div>
      <div className="min-h-[250px] p-5 sm:p-6">
        {!answer && <div className="mb-6"><p className="text-sm text-muted">Try asking:</p><div className="mt-3 flex flex-wrap gap-2">{suggestedQuestions.map((item) => <button key={item} onClick={() => setQuestion(item)} className="rounded-full border border-line px-3 py-2 text-xs text-[#5d6974] transition hover:border-brand/40 hover:bg-brand-soft hover:text-brand">{item}</button>)}</div></div>}
        {answer && <AnswerPanel answer={answer} />}
        {chatError && <div className="mb-4"><ErrorNotice message={chatError} /></div>}
      </div>
      <form onSubmit={ask} className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:p-5">
        <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={5000} className="field flex-1" placeholder="Ask a question about this document…" disabled={chatBusy} />
        <Button type="submit" disabled={chatBusy || !question.trim()}>{chatBusy ? "Thinking…" : "Ask question"}<ArrowUpRight size={15} /></Button>
      </form>
    </section>}
  </>;
}

export function AnswerPanel({ answer }: { answer: AskResponse }) {
  return <div className="space-y-5">
    <div className="rounded-2xl bg-[#f5f4fc] p-4 sm:p-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">You asked</p><p className="text-sm font-medium leading-6 text-ink">{answer.question}</p></div>
    <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand"><Sparkles size={14} />AI response</div><p className="whitespace-pre-wrap text-sm leading-7 text-[#46525d]">{answer.answer}</p></div>
    <div className="border-t border-line pt-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Retrieved sources</h3><span className="text-xs text-muted">{answer.sources.length} {answer.sources.length === 1 ? "source" : "sources"}</span></div>
      {answer.sources.length ? <div className="grid gap-3 md:grid-cols-2">{answer.sources.map((source, index) => <div key={`${source.page_number}-${index}`} className="rounded-xl border border-line p-4"><div className="mb-2 flex items-center justify-between"><span className="rounded-md bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand">Page {source.page_number}</span><span className="text-[11px] text-muted">Match {(source.similarity_score * 100).toFixed(0)}%</span></div><p className="line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-[#65717d]">{source.content}</p></div>)}</div> : <p className="text-sm text-muted">No source excerpts were returned for this answer.</p>}
    </div>
  </div>;
}

export function readHistory(key: string): ConversationEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed as ConversationEntry[] : [];
  } catch {
    return [];
  }
}
