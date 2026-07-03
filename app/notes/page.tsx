"use client";

import { FileText, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function loadNotes() {
    const res = await fetch("/api/notes/list");
    const data = await res.json();
    if (Array.isArray(data)) setNotes(data);
  }

  async function createNote() {
    if (!title.trim()) return;

    await fetch("/api/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });

    setTitle("");
    setContent("");
    loadNotes();
  }

  useEffect(() => {
    loadNotes();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight">Notes</h1>
            <p className="mt-4 text-[#6B7280]">Guarda ideas, reuniones y contexto importante.</p>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
            placeholder="Título de la nota"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-4 min-h-32 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
            placeholder="Escribe tu nota..."
          />
          <button
            onClick={createNote}
            className="mt-4 flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Nueva nota
          </button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="font-medium">{note.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">{note.content}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
