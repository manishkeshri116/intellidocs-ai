export interface User {
  id: number;
  full_name: string;
  email: string;
}

export interface DocumentItem {
  id: number;
  filename: string;
  file_type: string;
  created_at: string;
  summary_available: boolean;
}

export interface DocumentDetail extends DocumentItem {
  extracted_text_available: boolean;
}

export interface DocumentListResponse {
  total: number;
  documents: DocumentItem[];
}

export interface UploadResponse {
  message: string;
  document_id: number;
  filename: string;
  total_chunks: number;
}

export interface SummaryResponse {
  document_id: number;
  summary: string;
  cached: boolean;
}

export interface DocumentSource {
  page_number: number;
  content: string;
  similarity_score: number;
}

export interface AskResponse {
  document_id: number;
  question: string;
  answer: string;
  sources: DocumentSource[];
}

export interface ConversationEntry {
  id: string;
  documentId: number;
  filename: string;
  question: string;
  answer: string;
  sources: DocumentSource[];
  createdAt: string;
}

export interface ChatConversation {
  id: number;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
  attachments?: ChatAttachmentMetadataWithSize[];
}

export interface ChatConversationDetail extends ChatConversation {
  messages: ChatMessage[];
}

export interface ChatAttachmentMetadata {
  filename: string;
  file_type: string;
}

export interface ChatAttachmentMetadataWithSize extends ChatAttachmentMetadata {
  size?: number;
}

export type GeneralChatMessage = ChatMessage;
export type GeneralChatConversation = ChatConversation;
