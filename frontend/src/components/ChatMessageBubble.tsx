import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import TracePanel from "@/components/TracePanel";
import type { RetrievedSource, TraceTiming } from "@/types";

interface Props {
  role: "user" | "assistant";
  content: string;
  sources?: RetrievedSource[] | null;
  systemPrompt?: string | null;
  timing?: TraceTiming | null;
  isStreaming?: boolean;
}

export default function ChatMessageBubble({
  role,
  content,
  sources,
  systemPrompt,
  timing,
  isStreaming,
}: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 max-w-[75%] rounded-lg px-4 py-2 text-sm shadow-sm ${
          isUser ? "bg-brand-600 text-white" : "bg-white text-slate-800 border border-slate-200"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-slate max-w-none prose-p:my-1.5 prose-pre:bg-slate-900 prose-pre:text-slate-100">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto">
                    <table {...props} />
                  </div>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
        {isStreaming && <span className="animate-pulse">▍</span>}

        {!isStreaming && !isUser && (
          <TracePanel sources={sources} systemPrompt={systemPrompt} timing={timing} />
        )}
      </div>
    </div>
  );
}
