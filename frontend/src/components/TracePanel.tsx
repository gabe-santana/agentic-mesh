"use client";

import { useState } from "react";

import type { RetrievedSource, TraceTiming } from "@/types";

interface Props {
  sources?: RetrievedSource[] | null;
  systemPrompt?: string | null;
  timing?: TraceTiming | null;
}

export default function TracePanel({ sources, systemPrompt, timing }: Props) {
  const [open, setOpen] = useState(false);

  const hasSources = !!sources && sources.length > 0;
  if (!systemPrompt && !hasSources && !timing) return null;

  const maxScore = hasSources ? Math.max(...sources!.map((s) => s.score)) : 1;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-700"
      >
        <svg
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M6 4l8 6-8 6V4z" clipRule="evenodd" />
        </svg>
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-500 to-emerald-500" />
        Pipeline trace
        {timing && <span className="text-slate-400">· {timing.total_ms}ms</span>}
      </button>

      {open && (
        <div className="animate-trace-in mt-2 space-y-3 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-inner">
          {timing && <TimingBar timing={timing} />}
          {hasSources && <SourceList sources={sources!} maxScore={maxScore} />}
          {systemPrompt && <PromptTerminal prompt={systemPrompt} />}
        </div>
      )}
    </div>
  );
}

function TimingBar({ timing }: { timing: TraceTiming }) {
  const total = Math.max(timing.total_ms, 1);
  const retrievalPct = timing.retrieval_ms > 0 ? Math.max((timing.retrieval_ms / total) * 100, 3) : 0;
  const generationPct = 100 - retrievalPct;

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Pipeline timing
      </p>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200">
        {retrievalPct > 0 && (
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
            style={{ width: `${retrievalPct}%` }}
          />
        )}
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
          style={{ width: `${generationPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {timing.retrieval_ms > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            Retrieve <span className="font-medium tabular-nums text-slate-700">{timing.retrieval_ms}ms</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Generate <span className="font-medium tabular-nums text-slate-700">{timing.generation_ms}ms</span>
        </span>
        <span className="ml-auto font-medium tabular-nums text-slate-400">Total {timing.total_ms}ms</span>
      </div>
    </div>
  );
}

function SourceList({ sources, maxScore }: { sources: RetrievedSource[]; maxScore: number }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Retrieved context — {sources.length} chunk{sources.length === 1 ? "" : "s"}
      </p>
      <div className="space-y-1.5">
        {sources.map((s, i) => (
          <SourceCard key={`${s.document_id}-${s.chunk_index}`} source={s} index={i} maxScore={maxScore} />
        ))}
      </div>
    </div>
  );
}

function SourceCard({
  source,
  index,
  maxScore,
}: {
  source: RetrievedSource;
  index: number;
  maxScore: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.max((source.score / maxScore) * 100, 6);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-2 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-brand-100 text-[10px] font-bold text-brand-700">
          {index + 1}
        </span>
        <span className="truncate text-xs font-medium text-slate-700">{source.filename ?? "unknown"}</span>
        <span className="ml-auto shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500">
          {source.score.toFixed(3)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-1 text-[11px] font-medium text-brand-600 hover:underline"
      >
        {expanded ? "Hide excerpt" : "Show excerpt"}
      </button>
      {expanded && (
        <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-1.5 text-[11px] leading-relaxed text-slate-600">
          {source.text}
        </p>
      )}
    </div>
  );
}

function PromptTerminal({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable in this context — silently ignore
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        System prompt sent to the model
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
          <span className="font-mono text-[11px] text-slate-500">system_prompt.txt</span>
          <button
            onClick={handleCopy}
            className="text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-100"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap p-3 font-mono text-[11px] leading-relaxed text-slate-200">
          {prompt}
        </pre>
      </div>
    </div>
  );
}
