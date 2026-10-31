import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatAttachment {
  id: string;
  file: File;
  previewUrl: string | null;
  kind: "pdf" | "image";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const SUPPORTED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

function getKind(file: File): ChatAttachment["kind"] | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !SUPPORTED_EXTENSIONS.has(extension)) return null;
  return extension === "pdf" ? "pdf" : "image";
}

export function useChatAttachments() {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState("");
  const urls = useRef(new Map<string, string>());
  const attachmentsRef = useRef<ChatAttachment[]>([]);

  useEffect(() => () => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    setError("");
    const selected = Array.from(files);
    if (!selected.length) return;

    const next = [...attachmentsRef.current];
    const errors: string[] = [];

    for (const file of selected) {
      const kind = getKind(file);
      if (!kind) {
        errors.push(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size === 0) {
        errors.push(`${file.name}: the file is empty.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: files must be 10 MB or smaller.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        errors.push(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (next.some((attachment) => attachment.file.name === file.name && attachment.file.size === file.size)) {
        errors.push(`${file.name}: this file is already attached.`);
        continue;
      }

      const id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = kind === "image" ? URL.createObjectURL(file) : null;
      if (previewUrl) urls.current.set(id, previewUrl);
      next.push({ id, file, previewUrl, kind });
    }

    attachmentsRef.current = next;
    setAttachments(next);
    if (errors.length) setError(errors.join(" "));
  }, []);

  const removeFile = useCallback((id: string) => {
    const url = urls.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      urls.current.delete(id);
    }
    const next = attachmentsRef.current.filter((attachment) => attachment.id !== id);
    attachmentsRef.current = next;
    setAttachments(next);
    setError("");
  }, []);

  const clearFiles = useCallback(() => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    attachmentsRef.current = [];
    setAttachments([]);
    setError("");
  }, []);

  const clearError = useCallback(() => setError(""), []);
  return { attachments, error, addFiles, removeFile, clearFiles, clearError };
}
