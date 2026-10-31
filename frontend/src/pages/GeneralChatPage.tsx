import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowUp, Bot, FileText, LoaderCircle, MessageCircle, Plus, Sparkles, UserRound } from "lucide-react";
import { Button } from "../components/Ui";
import { CHAT_HISTORY_UPDATED_EVENT, notifyChatHistoryChanged } from "../lib/generalChat";
import { getErrorMessage } from "../lib/api";
import { chatHistoryApi, generalChatApi } from "../lib/generalChatApi";
import type { ChatMessage } from "../types";
import { ChatAttachmentPicker, formatFileSize } from "../components/ChatAttachmentPicker";
import { useChatAttachments } from "../hooks/useChatAttachments";

const suggestions = [
  "Help me brainstorm ideas",
  "Explain a complex topic simply",
  "Draft a thoughtful email",
  "What can you help me with?",
];

export function GeneralChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { attachments, error: attachmentError, addFiles, removeFile, clearFiles } = useChatAttachments();
  const scrollContainer = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setDraft("");
      setNotice("");
      setIsConversationLoading(false);
      setUploadProgress(null);
      clearFiles();
      return;
    }
    const id = Number(conversationId);
    if (!Number.isSafeInteger(id) || id < 1) {
      setMessages([]);
      setNotice("This conversation link is invalid.");
      setIsConversationLoading(false);
      return;
    }

    let active = true;
    setMessages([]);
    setDraft("");
    setNotice("");
    setIsConversationLoading(true);
    setUploadProgress(null);
    clearFiles();
    dragDepth.current = 0;
    setIsDragging(false);
    chatHistoryApi.get(id)
      .then((conversation) => {
        if (active) setMessages(conversation.messages);
      })
      .catch((error: unknown) => {
        if (active) setNotice(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsConversationLoading(false);
      });
    inputRef.current?.focus();
    return () => { active = false; };
  }, [conversationId, navigate, clearFiles]);

  useEffect(() => {
    scrollContainer.current?.scrollTo({ top: scrollContainer.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, isConversationLoading]);

  useEffect(() => {
    const refreshOpenConversation = () => {
      const id = Number(conversationId);
      if (!Number.isSafeInteger(id) || id < 1) return;
      chatHistoryApi.get(id)
        .then((conversation) => setMessages(conversation.messages))
        .catch((error: unknown) => setNotice(getErrorMessage(error)));
    };
    window.addEventListener(CHAT_HISTORY_UPDATED_EVENT, refreshOpenConversation);
    return () => window.removeEventListener(CHAT_HISTORY_UPDATED_EVENT, refreshOpenConversation);
  }, [conversationId]);

  async function submitMessage(event: React.FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isLoading || isConversationLoading) return;

    setNotice("");
    setUploadProgress(attachments.length > 0 ? 0 : null);
    setIsLoading(true);
    try {
      const activeId = conversationId ? Number(conversationId) : undefined;
      if (activeId !== undefined && (!Number.isSafeInteger(activeId) || activeId < 1)) {
        throw new Error("This conversation link is invalid.");
      }
      const response = attachments.length > 0
        ? await generalChatApi.sendMessageWithAttachments(
          message,
          attachments.map((attachment) => attachment.file),
          activeId,
          setUploadProgress,
        )
        : await generalChatApi.sendMessage(message, activeId);
      const returnedAttachments = (response.attachments || []).map((file) => ({
        ...file,
        size: attachments.find((attachment) => attachment.file.name === file.filename)?.file.size,
      }));
      const updatedMessages: ChatMessage[] = [
        ...messages,
        { id: Date.now(), role: "user", content: response.question, created_at: new Date().toISOString(), attachments: returnedAttachments },
        { id: Date.now() + 1, role: "assistant", content: response.answer, created_at: new Date().toISOString() },
      ];
      setMessages(updatedMessages);
      setDraft("");
      clearFiles();
      notifyChatHistoryChanged();
      if (response.conversation_id !== activeId) {
        navigate(`/chat/${response.conversation_id}`, { replace: true });
      }
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  }

  function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function startNewChat() { navigate("/chat"); }

  function handleDragEnter(event: React.DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <section
      className={`general-chat-shell relative -mx-2 -my-3 flex flex-col overflow-hidden rounded-2xl border bg-white shadow-soft transition sm:-mx-3 md:-my-4 ${isDragging ? "border-brand ring-4 ring-brand/10" : "border-line"}`}
      onDragEnter={handleDragEnter}
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-white/90">
        <div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><MessageCircle size={22} /></div><p className="mt-3 text-sm font-semibold text-ink">Drop files to attach</p><p className="mt-1 text-xs text-muted">PDF, JPG, PNG or WEBP</p></div>
      </div>}
      <header className="chat-panel-header flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><MessageCircle size={18} /></div>
          <div><h1 className="text-sm font-semibold text-ink">General AI chat</h1><p className="mt-0.5 text-xs text-muted">Ask anything, independent of your documents</p></div>
        </div>
        <Button variant="secondary" className="!px-3 !py-2" onClick={startNewChat}><Plus size={15} /><span className="hidden sm:inline">New chat</span></Button>
      </header>

      <div ref={scrollContainer} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[800px] px-4 py-7 sm:px-8 sm:py-10">
          {isConversationLoading ? <div className="flex min-h-[min(56vh,520px)] items-center justify-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" />Loading conversation…</div>
            : messages.length === 0 ? <div className="flex min-h-[min(56vh,520px)] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Sparkles size={24} /></div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">What would you like to explore?</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">Start a conversation on any topic. General AI chat is separate from questions about your documents.</p>
            <div className="mt-7 grid w-full max-w-[610px] gap-2 sm:grid-cols-2">
              {suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setDraft(suggestion); inputRef.current?.focus(); }} className="chat-suggestion rounded-xl border border-line px-4 py-3 text-left text-xs font-medium text-[#586571] transition">{suggestion}</button>)}
            </div>
          </div> : <div className="space-y-7">
            {messages.map((message) => <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "assistant" ? "bg-brand text-white" : "bg-[#eef0f2] text-[#65717d]"}`}>
                {message.role === "assistant" ? <Bot size={16} /> : <UserRound size={16} />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === "assistant" ? "bg-[#f4f3fc] text-[#34414b]" : "chat-message-user text-white"}`}>
                {message.attachments?.length ? <div className="mb-2 flex flex-wrap gap-2">{message.attachments.map((file, index) => <div key={`${file.filename}-${index}`} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${message.role === "assistant" ? "bg-white" : "bg-white/15"}`}><FileText size={14} /><span className="max-w-40 truncate">{file.filename}</span>{file.size !== undefined && <span className="opacity-75">{formatFileSize(file.size)}</span>}</div>)}</div> : null}
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </article>)}
            {isLoading && <div role="status" className="flex items-center gap-3 text-sm text-muted"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"><Bot size={16} /></span><LoaderCircle size={16} className="animate-spin text-brand" />Thinking…</div>}
          </div>}
        </div>
      </div>

      <div className="chat-composer-area border-t border-line px-3 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-[800px]">
          {notice && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{notice}</div>}
          {isLoading && attachments.length > 0 && uploadProgress !== null && <div role="status" className="mb-3 flex items-center gap-3 text-xs text-muted">
            <span className="shrink-0">{uploadProgress < 100 ? `Uploading files ${uploadProgress}%` : "Files uploaded · generating response…"}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9e8f4]"><span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} /></span>
          </div>}
          <form onSubmit={(event) => void submitMessage(event)} className="chat-composer rounded-2xl border bg-white p-2 transition">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setNotice(""); }}
              onKeyDown={onComposerKeyDown}
              maxLength={5000}
              rows={2}
              aria-label="Message"
              placeholder="Ask me anything..."
              className="max-h-40 min-h-[68px] w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-[#9aa3aa] focus:ring-0"
              disabled={isLoading || isConversationLoading}
            />
            <ChatAttachmentPicker
              attachments={attachments}
              error={attachmentError}
              disabled={isLoading || isConversationLoading}
              onAddFiles={(files) => { addFiles(files); setNotice(""); }}
              onRemove={(id) => { removeFile(id); setNotice(""); }}
            />
            <div className="flex items-center justify-between px-1 pb-0.5">
              <p className="text-[11px] text-muted">{attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} · ready to send` : "General AI chat"}</p>
              <div className="flex items-center gap-2">
                <span className="hidden text-[10px] text-[#9aa3aa] sm:inline">Enter to send · Shift + Enter for a new line</span>
                <button type="submit" disabled={!draft.trim() || isLoading || isConversationLoading} aria-label="Send message" title="Send message" className="chat-send-button flex h-9 w-9 items-center justify-center rounded-xl text-white transition disabled:cursor-not-allowed">
                  {isLoading ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowUp size={17} />}
                </button>
              </div>
            </div>
          </form>
          <p className="mt-2 text-center text-[10px] leading-4 text-muted">AI responses may not always be accurate. Verify important information.</p>
        </div>
      </div>
    </section>
  );
}
