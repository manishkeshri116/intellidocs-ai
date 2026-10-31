import axios from "axios";
import type {
  AskResponse,
  DocumentDetail,
  DocumentListResponse,
  SummaryResponse,
  UploadResponse,
  User,
} from "../types";

export const TOKEN_KEY = "intellidocs_access_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("intellidocs:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (!error.response) return "Cannot reach the API. Check that the backend is running.";
    return `Request failed (${error.response.status}). Please try again.`;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export const authApi = {
  async signup(full_name: string, email: string, password: string) {
    const { data } = await api.post<User>("/auth/signup", { full_name, email, password });
    return data;
  },
  async login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password });
    const { data } = await api.post<{ access_token: string; token_type: string }>(
      "/auth/login",
      body,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return data;
  },
  async me() {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },
};

export const documentsApi = {
  async list() {
    const { data } = await api.get<DocumentListResponse>("/documents/");
    return data;
  },
  async get(id: number) {
    const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
    return data;
  },
  async upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post<UploadResponse>("/documents/upload", formData);
    return data;
  },
  async remove(id: number) {
    const { data } = await api.delete<{ message: string; document_id: number }>(`/documents/${id}`);
    return data;
  },
  async summary(id: number) {
    const { data } = await api.post<SummaryResponse>(`/documents/${id}/summary`);
    return data;
  },
  async ask(id: number, question: string) {
    const { data } = await api.post<AskResponse>(`/documents/${id}/ask`, { question });
    return data;
  },
};
