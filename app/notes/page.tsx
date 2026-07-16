"use client";

import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type Note = { id: string; title: string; content: string; updated_at?: string };

function readStoredLanguage(): "en" | "es" {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

const text = {
  en: {
    title: "Notes",
    new: "New note",
    search: "Search notes",
    empty: "No notes yet.",
    saving: "Saving...",
    saved: "Saved",
    error: "Save failed",
    delete: "Delete",
    body: "Write your note...",
    backToList: "Back to notes",
  },
  es: {
    title: "Notas",
    new: "Nueva nota",
    search: "Buscar notas",
    empty: "Aún no hay notas.",
    saving: "Guardando...",
    saved: "Guardado",
    error: "No se pudo guardar",
    delete: "Eliminar",
    body: "Escribe tu nota...",
    backToList: "Volver a notas",
  },
};

export default function NotesPage() {
  const [lang, setLang] = useState<"en" | "es">(readStoredLanguage);
  const [notes, setNotes] = useState<Note[]>([]);
  const [note, setNote] = useState<Note | null>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  const [loading, setLoading] = useState(true);
  const saved = useRef({ id: "", title: "", content: "" });
  const version = useRef(0);
  const t = text[lang];

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/notes/list?q=${encodeURIComponent(query)}`);
      if (!r.ok) throw new Error();
      setNotes(await r.json());
    } catch {
      setState("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => void load(), query ? 200 : 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function updateLanguage(next: AlmaShellLanguage) {
    setLang(next);
    localStorage.setItem("alma_language", next);
  }

  const select = (next: Note) => {
    saved.current = { id: next.id, title: next.title, content: next.content };
    setNote(next);
    setState("");
  };

  const save = async (current: Note, captured: number) => {
    setState("saving");
    try {
      const r = await fetch(`/api/notes/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: current.title,
          content: current.content,
        }),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      if (captured === version.current) {
        saved.current = {
          id: updated.id,
          title: updated.title,
          content: updated.content,
        };
        setNote(updated);
        setNotes((all) => all.map((n) => (n.id === updated.id ? updated : n)));
        setState("saved");
      }
    } catch {
      if (captured === version.current) setState("error");
    }
  };

  useEffect(() => {
    if (!note || saved.current.id !== note.id) return;
    const captured = ++version.current;
    if (
      saved.current.title === note.title &&
      saved.current.content === note.content
    )
      return;
    const id = setTimeout(() => void save(note, captured), 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, note?.title, note?.content]);

  const create = async () => {
    const r = await fetch("/api/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t.new, content: "" }),
    });
    if (!r.ok) {
      setState("error");
      return;
    }
    const created = await r.json();
    setNotes((all) => [created, ...all]);
    select(created);
  };

  const remove = async () => {
    if (!note) return;
    const r = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (r.ok) {
      setNotes((all) => all.filter((n) => n.id !== note.id));
      setNote(null);
    }
  };

  const listPane = (
    <aside className={note ? "hidden md:block" : "block"}>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="min-w-0 flex-1 rounded-2xl bg-[#F7F7F8] px-3 py-2 outline-none"
        />
        <button
          onClick={create}
          className="rounded-2xl bg-black p-2 text-white"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-[#6B7280]">...</p>
        ) : notes.length ? (
          notes.map((n) => (
            <button
              key={n.id}
              onClick={() => select(n)}
              className={
                note?.id === n.id
                  ? "w-full rounded-2xl bg-black p-3 text-left text-white"
                  : "w-full rounded-2xl bg-[#F7F7F8] p-3 text-left"
              }
            >
              <p className="truncate text-sm font-medium">{n.title}</p>
              <p className="truncate text-xs opacity-60">{n.content}</p>
            </button>
          ))
        ) : (
          <p className="text-sm text-[#6B7280]">{t.empty}</p>
        )}
      </div>
    </aside>
  );

  const editorPane = (
    <div className={note ? "block" : "hidden md:block"}>
      <div className="min-h-[420px] rounded-2xl bg-[#F7F7F8] p-3 md:p-4">
        {note ? (
          <>
            <div className="mb-3 flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setNote(null)}
                className="rounded-lg p-2 text-[#6B7280] hover:bg-white hover:text-black"
                aria-label={t.backToList}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {t.backToList}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-xl font-medium outline-none"
              />
              <span className="shrink-0 text-xs text-[#6B7280]">
                {state && t[state]}
              </span>
              <button onClick={remove} aria-label={t.delete}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={note.content}
              onChange={(e) => setNote({ ...note, content: e.target.value })}
              placeholder={t.body}
              className="mt-4 min-h-96 w-full resize-none bg-transparent text-sm leading-6 outline-none"
            />
          </>
        ) : (
          <div className="grid h-full min-h-[360px] place-items-center text-sm text-[#6B7280]">
            {t.empty}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AlmaShell
      language={lang}
      activeWorkspace="notes"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto w-full max-w-6xl px-3 py-4 md:px-6 md:py-10">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 md:rounded-[2rem] md:p-8">
          <div className="flex justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border bg-[#F7F7F8]">
                <FileText className="h-5 w-5" />
              </div>
              <h1 className="text-4xl font-medium">{t.title}</h1>
            </div>
            <button
              onClick={() => updateLanguage(lang === "en" ? "es" : "en")}
              className="shrink-0 rounded-full border px-3 py-2 text-xs"
            >
              {lang.toUpperCase()}
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:mt-7 md:min-h-[520px] md:grid-cols-[280px_1fr] md:gap-5">
            {listPane}
            {editorPane}
          </div>
        </section>
      </div>
    </AlmaShell>
  );
}
