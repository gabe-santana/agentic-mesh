import type { ChatMessage, ChatSession, DocumentItem, StreamEvent, User } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "agenticmesh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function register(email: string, password: string, fullName?: string) {
  const data = await request<{ access_token: string }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName || null }),
  });
  setToken(data.access_token);
}

export async function login(email: string, password: string) {
  const data = await request<{ access_token: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
}

export async function getMe(): Promise<User> {
  return request<User>("/api/v1/auth/me");
}

export async function listDocuments(): Promise<DocumentItem[]> {
  return request<DocumentItem[]>("/api/v1/documents");
}

export async function uploadDocument(file: File, category?: string): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("file", file);
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return request<DocumentItem>(`/api/v1/documents/ingest${query}`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteDocument(documentId: string): Promise<void> {
  await request<void>(`/api/v1/documents/${documentId}`, { method: "DELETE" });
}

export async function listSessions(): Promise<ChatSession[]> {
  return request<ChatSession[]>("/api/v1/agent/sessions");
}

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/api/v1/agent/sessions/${sessionId}/messages`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await request<void>(`/api/v1/agent/sessions/${sessionId}`, { method: "DELETE" });
}

export interface StreamAgentPayload {
  prompt: string;
  session_id?: string;
  enable_rag: boolean;
}

/**
 * Streams SSE events from POST /agent/stream. Browser EventSource can't send
 * a POST body or Authorization header, so we parse the stream manually.
 */
export async function* streamAgent(payload: StreamAgentPayload): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_URL}/api/v1/agent/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Agent stream failed with status ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // sse_starlette terminates frames with "\r\n\r\n" (CRLF), not bare "\n\n" —
    // match either so a real network stream doesn't silently never split.
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";

    for (const rawEvent of events) {
      const dataLine = rawEvent.split(/\r?\n/).find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const jsonStr = dataLine.slice("data:".length).trim();
      if (!jsonStr) continue;
      yield JSON.parse(jsonStr) as StreamEvent;
    }
  }
}
