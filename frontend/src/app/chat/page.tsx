"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import ChatInput from "@/components/ChatInput";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import { deleteSession, getToken, listMessages, listSessions, streamAgent } from "@/services/api";
import type { ChatSession, RetrievedSource } from "@/types";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RetrievedSource[];
  streaming?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    refreshSessions();
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function refreshSessions() {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch {
      // ignore — likely just an empty/new account
    }
  }

  async function openSession(sessionId: string) {
    setActiveSessionId(sessionId);
    setError(null);
    try {
      const history = await listMessages(sessionId);
      setMessages(history.map((m) => ({ id: m.id, role: m.role, content: m.content })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    }
  }

  function startNewChat() {
    setActiveSessionId(undefined);
    setMessages([]);
    setError(null);
  }

  async function handleDeleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this chat? This can't be undone.")) return;

    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        startNewChat();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete chat");
    }
  }

  async function handleSend(prompt: string, enableRag: boolean) {
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `local-user-${Date.now()}`, role: "user", content: prompt },
      { id: `local-assistant-${Date.now()}`, role: "assistant", content: "", streaming: true },
    ]);
    setIsStreaming(true);

    try {
      for await (const event of streamAgent({ prompt, session_id: activeSessionId, enable_rag: enableRag })) {
        if (event.type === "session") {
          if (!activeSessionId) {
            setActiveSessionId(event.session_id);
            refreshSessions();
          }
        } else if (event.type === "token") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + event.content };
            }
            return next;
          });
        } else if (event.type === "done") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, sources: event.sources, streaming: false };
            }
            return next;
          });
        } else if (event.type === "error") {
          setError(event.message);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, streaming: false };
            }
            return next;
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach the agent");
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, streaming: false };
        }
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <aside className="w-56 shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
        <button
          onClick={startNewChat}
          className="mb-3 w-full rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
        >
          + New chat
        </button>
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id} className="group flex items-center gap-1">
              <button
                onClick={() => openSession(s.id)}
                className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm ${
                  activeSessionId === s.id ? "bg-slate-200" : "hover:bg-slate-100"
                }`}
              >
                {s.title}
              </button>
              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                title="Delete chat"
                className="shrink-0 rounded-md px-1.5 py-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="mt-8 text-center text-sm text-slate-400">
              Start a conversation — enable RAG to ground answers in your uploaded documents.
            </p>
          )}
          {messages.map((m) => (
            <ChatMessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              sources={m.sources}
              isStreaming={m.streaming}
            />
          ))}
          <div ref={bottomRef} />
        </div>
        {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </section>
    </div>
  );
}
