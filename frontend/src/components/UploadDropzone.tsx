import { useRef, useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { documentsApi, getErrorMessage } from "../lib/api";
import { Button } from "./Ui";

const ACCEPTED = ".pdf,.docx,.txt";
const MAX_BYTES = 10 * 1024 * 1024;

export function UploadDropzone({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "docx", "txt"].includes(extension)) {
      setError("Choose a PDF, DOCX, or TXT file.");
      return;
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      setError(file.size === 0 ? "This file is empty." : "Files must be 10 MB or smaller.");
      return;
    }
    setError("");
    setMessage("");
    setUploading(true);
    try {
      const result = await documentsApi.upload(file);
      setMessage(`${result.filename} uploaded successfully.`);
      onUploaded();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className={`rounded-2xl border border-dashed px-5 py-7 text-center transition ${dragging ? "border-brand bg-brand-soft" : "border-[#d7ddd9] bg-[#fbfcfb]"}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileUp size={20} /></div>
      <p className="mt-3 text-sm font-semibold text-ink">Drop documents here, or <button className="text-brand underline underline-offset-2" onClick={() => inputRef.current?.click()}>browse</button></p>
      <p className="mt-1 text-xs text-muted">PDF, DOCX or TXT · Up to 10 MB</p>
      {uploading && <p className="mt-3 inline-flex items-center gap-2 text-sm text-brand"><LoaderCircle size={15} className="animate-spin" />Uploading securely…</p>}
      {message && <p role="status" className="mt-3 text-sm text-brand">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {!uploading && <Button variant="secondary" className="mt-4 !py-2" onClick={() => inputRef.current?.click()}>Select a file</Button>}
    </div>
  );
}
