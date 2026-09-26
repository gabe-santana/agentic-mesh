"use client";

import { useRef, useState } from "react";

import { uploadDocument } from "@/services/api";

interface Props {
  onUploaded: () => void;
}

export default function DocumentUploader({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file, category || undefined);
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-slate-700">Category (optional)</label>
        <input
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          placeholder="e.g. architecture"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center text-sm ${
          isDragging ? "border-brand-500 bg-brand-50" : "border-slate-300 text-slate-500"
        }`}
      >
        <p>{uploading ? "Uploading..." : "Drag & drop a .txt, .md or .pdf file here, or click to browse"}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
