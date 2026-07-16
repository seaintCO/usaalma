"use client";

import { FileText, FolderOpen, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type DocumentRecord = {
  id: string;
  title: string;
  content?: string | null;
};

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

const copy = {
  en: {
    title: "Documents",
    subtitle: "Save important information so ALMA can use it as knowledge.",
    add: "Add knowledge",
    titlePlaceholder: "Document title",
    contentPlaceholder:
      "Paste content, policies, FAQs, processes, or important information...",
    save: "Save document",
    empty: "You do not have documents yet.",
    noContent: "No content",
  },
  es: {
    title: "Documentos",
    subtitle:
      "Guarda información importante para que ALMA pueda usarla como conocimiento.",
    add: "Agregar conocimiento",
    titlePlaceholder: "Título del documento",
    contentPlaceholder:
      "Pega aquí el contenido, políticas, FAQs, procesos o información importante...",
    save: "Guardar documento",
    empty: "No tienes documentos todavía.",
    noContent: "Sin contenido",
  },
};

export default function DocumentsPage() {
  const [language, setLanguage] =
    useState<AlmaShellLanguage>(readStoredLanguage);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const t = copy[language];

  async function loadDocuments() {
    const res = await fetch("/api/documents/list");
    const data = await res.json();
    if (Array.isArray(data)) setDocuments(data);
  }

  async function createDocument() {
    if (!title.trim()) return;

    await fetch("/api/documents/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });

    setTitle("");
    setContent("");
    loadDocuments();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDocuments(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="documents"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto w-full max-w-6xl px-3 py-4 text-[#111111] md:px-6 md:py-10">
        <div>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <FolderOpen className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight">{t.title}</h1>
          <p className="mt-4 max-w-2xl text-[#6B7280]">{t.subtitle}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-4 md:mt-8 md:rounded-[2rem] md:p-6">
          <h2 className="text-2xl font-medium">{t.add}</h2>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            className="mt-6 w-full min-w-0 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.contentPlaceholder}
            className="mt-4 min-h-40 w-full min-w-0 resize-none rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
          />

          <button
            onClick={createDocument}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white sm:w-auto"
          >
            <Plus className="h-4 w-4" /> {t.save}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
              {t.empty}
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-5"
              >
                <FileText className="mb-5 h-5 w-5 text-[#6B7280]" />
                <h3 className="truncate font-medium">{doc.title}</h3>
                <p className="mt-3 line-clamp-5 text-sm leading-6 text-[#6B7280]">
                  {doc.content || t.noContent}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </AlmaShell>
  );
}
