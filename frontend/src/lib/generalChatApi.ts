import { api } from "./api";
import type { ChatConversation, ChatConversationDetail } from "../types";

export interface GeneralChatResponse {
  conversation_id: number;
  question: string;
  answer: string;
  attachments?: {
    filename: string;
    file_type: string;
  }[];
}

export const generalChatApi = {
  async sendMessage(message: string, conversationId?: number): Promise<GeneralChatResponse> {
    const body: { message: string; conversation_id?: number } = { message };
    if (conversationId !== undefined) body.conversation_id = conversationId;
    const { data } = await api.post<GeneralChatResponse>("/chat/", body);
    return data;
  },
  async sendMessageWithAttachments(
    message: string,
    files: File[],
    conversationId?: number,
    onUploadProgress?: (progress: number) => void,
  ): Promise<GeneralChatResponse> {
    const formData = new FormData();
    formData.append("message", message);
    if (conversationId !== undefined) formData.append("conversation_id", String(conversationId));
    files.forEach((file) => formData.append("files", file));
    const { data } = await api.post<GeneralChatResponse>("/chat/with-files", formData, {
      onUploadProgress: (event) => {
        if (event.total) onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data;
  },
};

export const chatHistoryApi = {
  async list(): Promise<ChatConversation[]> {
    const { data } = await api.get<ChatConversation[]>("/chat-history/");
    return data;
  },
  async get(conversationId: number): Promise<ChatConversationDetail> {
    const { data } = await api.get<ChatConversationDetail>(`/chat-history/${conversationId}`);
    return data;
  },
  async remove(conversationId: number): Promise<void> {
    await api.delete(`/chat-history/${conversationId}`);
  },
  async removeAll(): Promise<void> {
    await api.delete("/chat-history/");
  },
};
