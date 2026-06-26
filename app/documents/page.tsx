"use client";

import { FileText, FolderOpen, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function loadDocuments() {
    const res = await fetch("/api/documents/list");
    const data = await res.json();
    if (Array.isArray(data)) setDocuments(data);
  }

  async function createDocument() {
    if (!title.trim()) return;

    await fetch("/api/documents/create", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ title, content }),
    });

    setTitle("");
    setContent("");
    loadDocuments();
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <FolderOpen className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight">Documentos</h1>
          <p className="mt-4 max-w-2xl text-[#6B7280]">
            Guarda información importante para que ALMA pueda usarla como conocimiento.
          </p>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <h2 className="text-2xl font-medium">Agregar conocimiento</h2>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del documento"
            className="mt-6 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pega aquí el contenido, políticas, FAQs, procesos o información importante..."
            className="mt-4 min-h-40 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
          />

          <button
            onClick={createDocument}
            className="mt-5 flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Guardar documento
          </button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {documents.length === 0 ? (
            <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280]">
              No tienes documentos todavía.
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
                <FileText className="mb-5 h-5 w-5 text-[#6B7280]" />
                <h3 className="font-medium">{doc.title}</h3>
                <p className="mt-3 line-clamp-5 text-sm leading-6 text-[#6B7280]">
                  {doc.content || "Sin contenido"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
