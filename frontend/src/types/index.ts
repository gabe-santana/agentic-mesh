export interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  category: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  chunk_count: number;
  error_message: string | null;
  created_at: string;
}

export interface RetrievedSource {
  filename: string | null;
  text: string;
  score: number;
  document_id: string;
  chunk_index: number;
}

export type StreamEvent =
  | { type: "session"; session_id: string }
  | { type: "token"; content: string }
  | { type: "done"; sources: RetrievedSource[] }
  | { type: "error"; message: string };
