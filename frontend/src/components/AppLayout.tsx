import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, Clock3, FileText, LayoutDashboard, LoaderCircle, LogOut, Menu, MessageCircle, Plus, Settings, Trash2, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { CHAT_HISTORY_UPDATED_EVENT } from "../lib/generalChat";
import { chatHistoryApi } from "../lib/generalChatApi";
import { getErrorMessage } from "../lib/api";
import type { ChatConversation } from "../types";

const navigation = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Documents", to: "/documents", icon: FileText },
  { label: "General AI chat", to: "/chat", icon: MessageCircle },
  { label: "Document Q&A history", to: "/history", icon: Clock3 },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [generalChats, setGeneralChats] = useState<ChatConversation[]>([]);
  const [chatListLoading, setChatListLoading] = useState(true);
  const [chatListError, setChatListError] = useState("");
  const [chatActionMessage, setChatActionMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "one"; conversation: ChatConversation } | { type: "all" } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const initials = user?.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
  const activeTitle = location.pathname.startsWith("/documents/") ? "Document workspace" : location.pathname.startsWith("/chat") ? "General AI chat" : navigation.find((item) => item.to === location.pathname)?.label || "IntelliDocs AI";

  const refreshChats = useCallback(async () => {
    setChatListError("");
    setChatListLoading(true);
    try {
      const conversations = await chatHistoryApi.list();
      setGeneralChats(conversations);
    } catch (error) {
      setChatListError(getErrorMessage(error));
    } finally {
      setChatListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshChats();
    window.addEventListener(CHAT_HISTORY_UPDATED_EVENT, refreshChats);
    window.addEventListener("focus", refreshChats);
    return () => {
      window.removeEventListener(CHAT_HISTORY_UPDATED_EVENT, refreshChats);
      window.removeEventListener("focus", refreshChats);
    };
  }, [refreshChats]);

  function requestDeleteConversation(conversation: ChatConversation) {
    setChatActionMessage("");
    setDeleteError("");
    setDeleteTarget({ type: "one", conversation });
  }

  function requestDeleteAllConversations() {
    if (!generalChats.length) return;
    setChatActionMessage("");
    setDeleteError("");
    setDeleteTarget({ type: "all" });
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      if (deleteTarget.type === "one") {
        const { conversation } = deleteTarget;
        await chatHistoryApi.remove(conversation.id);
        setGeneralChats((current) => current.filter((item) => item.id !== conversation.id));
        setChatActionMessage("Conversation deleted.");
        if (location.pathname === `/chat/${conversation.id}`) navigate("/chat", { replace: true });
      } else {
        await chatHistoryApi.removeAll();
        setGeneralChats([]);
        setChatActionMessage("All chat history deleted.");
        if (location.pathname.startsWith("/chat/")) navigate("/chat", { replace: true });
      }
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  }

  function signOut() {
    logout();
    navigate("/login");
  }

  const sidebar = (
    <aside className="workspace-sidebar flex h-full flex-col border-r">
      <div className="flex h-[72px] items-center gap-3 border-b border-line px-6">
        <div className="sidebar-brand-mark flex h-9 w-9 items-center justify-center rounded-xl text-white"><BookOpen size={19} /></div>
        <div><p className="text-[15px] font-bold tracking-tight text-white">IntelliDocs</p><p className="sidebar-subtitle text-[10px] font-semibold uppercase tracking-[.14em]">AI workspace</p></div>
        <button className="sidebar-icon-button ml-auto rounded-lg p-2 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>
      <div className="px-4 pt-7">
        <p className="sidebar-section-label mb-3 px-3 text-[10px] font-bold uppercase tracking-[.14em]">Workspace</p>
        <nav className="space-y-1">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${isActive ? "is-active" : ""}`}>
              <Icon size={17} strokeWidth={1.8} />{label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mt-7 px-4">
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="sidebar-section-label text-[10px] font-bold uppercase tracking-[.14em]">General chat</p>
          <button onClick={() => navigate("/chat")} title="New chat" aria-label="Start a new general chat" className="sidebar-icon-button rounded-md p-1"><Plus size={16} /></button>
        </div>
        {chatListError && <p role="alert" className="px-3 py-2 text-[11px] leading-4 text-rose-300">{chatListError}<button onClick={() => void refreshChats()} className="ml-1 font-semibold underline">Retry</button></p>}
        {chatActionMessage && <p role="status" className={`px-3 py-1 text-[11px] leading-4 ${chatActionMessage.startsWith("Conversation deleted") || chatActionMessage.startsWith("All chat") ? "text-[#b8b2ff]" : "text-rose-300"}`}>{chatActionMessage}</p>}
        {chatListLoading ? <p className="flex items-center gap-2 px-3 py-2 text-xs text-[#9ba4b8]"><LoaderCircle size={13} className="animate-spin" />Loading chats…</p>
          : generalChats.length ? <nav className="max-h-[28vh] space-y-0.5 overflow-y-auto">
            {generalChats.map((conversation) => (
              <div key={conversation.id} className="group flex items-center gap-1">
                <NavLink to={`/chat/${conversation.id}`} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `sidebar-chat-link min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-xs transition ${isActive ? "is-active font-medium" : ""}`}>
                  {conversation.title}
                </NavLink>
                <button onClick={() => requestDeleteConversation(conversation)} aria-label={`Delete ${conversation.title}`} title="Delete conversation" className="sidebar-icon-button rounded-md p-1.5 opacity-0 transition focus:opacity-100 group-hover:opacity-100"><Trash2 size={13} /></button>
              </div>
            ))}
          </nav> : !chatListError && <p className="px-3 py-2 text-xs leading-5 text-[#8992a8]">Your conversations will appear here.</p>}
        {generalChats.length > 0 && <button onClick={requestDeleteAllConversations} className="sidebar-chat-link mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium"><Trash2 size={13} />Delete all chats</button>}
        <button onClick={() => { setMobileOpen(false); navigate("/chat"); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#c6c1ff] transition hover:bg-white/5"><Plus size={14} />New chat</button>
      </div>
      <div className="sidebar-profile-border mt-auto border-t p-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="sidebar-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">{initials}</div>
          <div className="min-w-0 flex-1"><p className="sidebar-profile-name truncate text-sm font-semibold">{user?.full_name}</p><p className="sidebar-profile-email truncate text-xs">{user?.email}</p></div>
          <button onClick={signOut} title="Log out" className="sidebar-icon-button rounded-lg p-2"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block">{sidebar}</div>
      {mobileOpen && <div className="fixed inset-0 z-40 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} /><div className="relative h-full w-[280px]">{sidebar}</div></div>}
      <div className="lg:pl-[248px]">
        <header className="workspace-topbar sticky top-0 z-20 flex h-[72px] items-center border-b px-5 md:px-8">
          <button className="mr-3 rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <p className="text-sm font-semibold text-ink">{activeTitle}</p>
          <div className="ml-auto text-xs text-muted">Document intelligence workspace</div>
        </header>
        <main className="workspace-content mx-auto max-w-[1440px] px-5 py-7 md:px-8 md:py-9"><Outlet /></main>
      </div>
      {deleteTarget && <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#17212b]/40 px-4 py-6 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deleteBusy) setDeleteTarget(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !deleteBusy) setDeleteTarget(null);
        }}
      >
        <section
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-chat-title"
          aria-describedby="delete-chat-description"
          className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,.22)]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><AlertTriangle size={20} /></div>
          <h2 id="delete-chat-title" className="mt-4 text-lg font-semibold tracking-tight text-ink">
            {deleteTarget.type === "one" ? "Delete this conversation?" : "Delete all conversations?"}
          </h2>
          <p id="delete-chat-description" className="mt-2 text-sm leading-6 text-muted">
            {deleteTarget.type === "one"
              ? `“${deleteTarget.conversation.title}” and its messages will be permanently deleted. This action cannot be undone.`
              : `All ${generalChats.length} conversations and their messages will be permanently deleted. This action cannot be undone.`}
          </p>
          {deleteError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{deleteError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" disabled={deleteBusy} onClick={() => setDeleteTarget(null)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-[#56616c] transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={deleteBusy} onClick={() => void confirmDelete()} className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
              {deleteBusy && <LoaderCircle size={15} className="animate-spin" />}
              {deleteBusy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </section>
      </div>}
    </div>
  );
}
