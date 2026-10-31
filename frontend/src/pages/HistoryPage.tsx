import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageSquareText } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { AnswerPanel, readHistory } from "./DocumentDetailPage";
import { EmptyState, FileBadge, formatDate, PageHeader } from "../components/Ui";
import type { AskResponse } from "../types";

export function HistoryPage() {
  const { user } = useAuth();
  const history = useMemo(() => readHistory(`intellidocs_chat_history_${user?.email || "anonymous"}`), [user?.email]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = history.find((entry) => entry.id === selectedId);

  return <>
    <PageHeader title="Document Q&A history" description="Revisit questions you’ve asked about your documents." />
    {history.length === 0 ? <EmptyState title="No conversations yet" description="Questions and answers from your document chats will appear here on this device." /> :
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-ink">Recent questions</h2><p className="mt-1 text-xs text-muted">Saved locally in this browser</p></div>
          <div className="divide-y divide-line">{history.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-canvas sm:px-5 ${selectedId === item.id ? "bg-brand-soft/60" : ""}`}>
            <FileBadge type={item.filename.split(".").pop() || "txt"} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{item.question}</span><span className="mt-1 block truncate text-xs text-muted">{item.filename} · {formatDate(item.createdAt)}</span></span><ArrowUpRight size={15} className="mt-1 shrink-0 text-muted" />
          </button>)}</div>
        </section>
        <section className="min-h-[300px] rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
          {selected ? <><div className="mb-5 flex items-center gap-3 border-b border-line pb-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><MessageSquareText size={17} /></div><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-ink">{selected.filename}</h2><p className="mt-1 text-xs text-muted">{formatDate(selected.createdAt)}</p></div><Link to={`/documents/${selected.documentId}`} className="text-xs font-semibold text-brand hover:underline">Open document</Link></div>
            <AnswerPanel answer={{ document_id: selected.documentId, question: selected.question, answer: selected.answer, sources: selected.sources } satisfies AskResponse} />
          </> : <EmptyState title="Select a conversation" description="Choose a question on the left to view its response and source citations." />}
        </section>
      </div>}
    <p className="mt-5 text-xs leading-5 text-muted">Document Q&A history is kept locally in this browser. General AI chat conversations are saved to your account and appear in the sidebar.</p>
  </>;
}
