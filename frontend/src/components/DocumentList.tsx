import type { DocumentItem } from "@/types";

const STATUS_STYLES: Record<DocumentItem["status"], string> = {
  pending: "bg-slate-100 text-slate-600",
  processing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

interface Props {
  documents: DocumentItem[];
  onDelete: (documentId: string) => void;
}

export default function DocumentList({ documents, onDelete }: Props) {
  if (documents.length === 0) {
    return <p className="mt-6 text-center text-sm text-slate-400">No documents uploaded yet.</p>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Filename</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Chunks</th>
            <th className="px-4 py-2">Uploaded</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td className="px-4 py-2 font-medium text-slate-800">{doc.filename}</td>
              <td className="px-4 py-2 text-slate-500">{doc.category ?? "—"}</td>
              <td className="px-4 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[doc.status]}`}>
                  {doc.status}
                </span>
                {doc.status === "failed" && doc.error_message && (
                  <p className="mt-1 text-xs text-red-500">{doc.error_message}</p>
                )}
              </td>
              <td className="px-4 py-2 text-slate-500">{doc.chunk_count}</td>
              <td className="px-4 py-2 text-slate-500">{new Date(doc.created_at).toLocaleString()}</td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => onDelete(doc.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
