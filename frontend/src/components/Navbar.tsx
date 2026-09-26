"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearToken, getToken } from "@/services/api";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthed = typeof window !== "undefined" && !!getToken();

  function linkClass(href: string) {
    return `px-3 py-2 rounded-md text-sm font-medium ${
      pathname === href ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-brand-700">AgenticMesh</span>
          <div className="ml-6 flex gap-1">
            <Link href="/chat" className={linkClass("/chat")}>
              Chat
            </Link>
            <Link href="/documents" className={linkClass("/documents")}>
              Documents
            </Link>
          </div>
        </div>
        {isAuthed && (
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Log out
          </button>
        )}
      </div>
    </nav>
  );
}
