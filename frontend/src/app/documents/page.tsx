"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DocumentList from "@/components/DocumentList";
import DocumentUploader from "@/components/DocumentUploader";
import { deleteDocument, getToken, listDocuments } from "@/services/api";
import type { DocumentItem } from "@/types";

const POLL_INTERVAL_MS = 4000;

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listDocuments();
      setDocuments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    refresh();
  }, [router, refresh]);

  useEffect(() => {
    const hasInFlight = documents.some((d) => d.status === "pending" || d.status === "processing");
    if (!hasInFlight) return;
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [documents, refresh]);

  async function handleDelete(documentId: string) {
    if (!window.confirm("Delete this document? Its indexed content will no longer be used for RAG.")) return;

    try {
      await deleteDocument(documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Documents</h1>
      <DocumentUploader onUploaded={refresh} />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <DocumentList documents={documents} onDelete={handleDelete} />
    </div>
  );
}
