"use client";

import { useState } from "react";

interface Props {
  onSend: (prompt: string, enableRag: boolean) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const [enableRag, setEnableRag] = useState(true);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, enableRag);
    setValue("");
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <input
          id="rag-toggle"
          type="checkbox"
          checked={enableRag}
          onChange={(e) => setEnableRag(e.target.checked)}
        />
        <label htmlFor="rag-toggle">Use document knowledge (RAG)</label>
      </div>
      <div className="flex gap-2">
        <textarea
          className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          rows={2}
          placeholder="Ask AgenticMesh anything..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          onClick={submit}
          disabled={disabled}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
