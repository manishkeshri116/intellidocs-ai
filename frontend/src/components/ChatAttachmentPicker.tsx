import { useRef } from "react";
import { FileText, Image, Paperclip, X } from "lucide-react";
import type { ChatAttachment } from "../hooks/useChatAttachments";

const ACCEPTED_FILES = ".pdf,.jpg,.jpeg,.png,.webp";

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatAttachmentPicker({
  attachments,
  error,
  disabled,
  onAddFiles,
  onRemove,
}: {
  attachments: ChatAttachment[];
  error: string;
  disabled: boolean;
  onAddFiles: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILES}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files) onAddFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {attachments.length > 0 && <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {attachments.map((attachment) => <article key={attachment.id} className="relative min-w-0 overflow-hidden rounded-xl border border-line bg-[#faf9ff]">
          {attachment.kind === "image" && attachment.previewUrl
            ? <img src={attachment.previewUrl} alt={attachment.file.name} className="h-24 w-full bg-[#eef0f2] object-cover" />
            : <div className="flex h-24 items-center justify-center bg-[#f7f8fa] text-rose-600"><FileText size={28} strokeWidth={1.6} /></div>}
          <div className="flex min-w-0 items-center gap-2 px-2.5 py-2">
            {attachment.kind === "pdf" ? <FileText size={14} className="shrink-0 text-rose-600" /> : <Image size={14} className="shrink-0 text-brand" />}
            <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-ink" title={attachment.file.name}>{attachment.file.name}</p><p className="mt-0.5 text-[10px] text-muted">{formatFileSize(attachment.file.size)} · Ready to send</p></div>
          </div>
          <button type="button" disabled={disabled} onClick={() => onRemove(attachment.id)} aria-label={`Remove ${attachment.file.name}`} title="Remove attachment" className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white/95 text-muted shadow-sm transition hover:text-red-600 disabled:opacity-50"><X size={14} /></button>
        </article>)}
      </div>}
      {error && <p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{error}</p>}
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} aria-label="Attach PDF or image" title="Attach PDF or image" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-canvas hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"><Paperclip size={18} /></button>
    </div>
  );
}
