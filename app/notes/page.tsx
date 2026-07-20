"use client";

import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { formatAlmaDate } from "@/lib/i18n/locale";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { notesMessages } from "@/lib/i18n/messages";

type Note = {
  id: string;
  title: string;
  content: string;
  updated_at?: string;
};
type SaveState = "idle" | "saving" | "saved" | "error";

export default function NotesPage() {
  const { locale } = useAlmaLocale();
  const copy = notesMessages[locale];
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saved = useRef({ id: "", title: "", content: "" });
  const version = useRef(0);

  const choose = useCallback((note: Note | null) => {
    if (note) {
      saved.current = { id: note.id, title: note.title, content: note.content };
    }
    setSelected(note);
    setSaveState("idle");
  }, []);

  const load = useCallback(async (search: string, preserveSelection = true) => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(
        `/api/notes/list?q=${encodeURIComponent(search)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("notes_load_failed");
      const nextNotes = (await response.json()) as Note[];
      setNotes(nextNotes);
      setSelected((current) => {
        if (preserveSelection && current) {
          const refreshed = nextNotes.find((note) => note.id === current.id);
          if (refreshed) return current;
          if (search) return current;
        }
        const first = nextNotes[0] ?? null;
        if (first) {
          saved.current = {
            id: first.id,
            title: first.title,
            content: first.content,
          };
        }
        return first;
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  useEffect(() => {
    if (!selected || saved.current.id !== selected.id) return;
    if (
      saved.current.title === selected.title &&
      saved.current.content === selected.content
    )
      return;
    const captured = ++version.current;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/notes/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: selected.title.trim() || copy.untitled,
            content: selected.content,
          }),
        });
        if (!response.ok) throw new Error("note_save_failed");
        const updated = (await response.json()) as Note;
        if (captured !== version.current) return;
        saved.current = {
          id: updated.id,
          title: updated.title,
          content: updated.content,
        };
        setSelected(updated);
        setNotes((current) =>
          current.map((note) => (note.id === updated.id ? updated : note)),
        );
        setSaveState("saved");
      } catch {
        if (captured === version.current) setSaveState("error");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [copy.untitled, selected]);

  async function createNote() {
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: copy.untitled, content: "" }),
      });
      if (!response.ok) throw new Error("note_create_failed");
      const created = (await response.json()) as Note;
      setQuery("");
      setNotes((current) => [created, ...current]);
      choose(created);
    } catch {
      setSaveState("error");
    } finally {
      setCreating(false);
    }
  }

  async function deleteNote() {
    if (!selected || !window.confirm(copy.deleteConfirm)) return;
    const deletedId = selected.id;
    const response = await fetch(`/api/notes/${deletedId}`, {
      method: "DELETE",
    });
    if (!response.ok) return setSaveState("error");
    const remaining = notes.filter((note) => note.id !== deletedId);
    setNotes(remaining);
    choose(remaining[0] ?? null);
  }

  return (
    <AlmaShell language={locale} activeWorkspace="notes" title={copy.title}>
      <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-3 py-4 md:px-6 md:py-6">
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDE1E5] bg-white">
              <FileText className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => void createNote()}
            disabled={creating}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? <Loader2 className="animate-spin" /> : <Plus />}
            <span className="hidden sm:inline">{copy.newNote}</span>
          </button>
        </header>

        <section className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#DDE1E5] bg-white shadow-sm md:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={`${selected ? "hidden md:flex" : "flex"} min-h-[560px] flex-col border-r border-[#E5E7EB]`}
          >
            <div className="border-b border-[#E5E7EB] p-3">
              <label className="flex h-10 items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 focus-within:ring-2 focus-within:ring-black">
                <Search className="h-4 w-4 text-[#6B7280]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.search}
                  aria-label={copy.search}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loading ? (
                <StateLine icon={<Loader2 className="animate-spin" />}>
                  {copy.loading}
                </StateLine>
              ) : loadError ? (
                <div className="p-3 text-sm text-red-700">
                  <p>{copy.loadError}</p>
                  <button
                    onClick={() => void load(query)}
                    className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium"
                  >
                    {copy.retry}
                  </button>
                </div>
              ) : notes.length ? (
                notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => choose(note)}
                    className={`mb-1 w-full rounded-xl px-3 py-3 text-left focus:outline-none focus:ring-2 focus:ring-black ${
                      selected?.id === note.id
                        ? "bg-[#111111] text-white"
                        : "hover:bg-[#F3F4F6]"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">
                      {note.title || copy.untitled}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs opacity-60">
                      {note.content || copy.body}
                    </p>
                    {note.updated_at ? (
                      <p className="mt-2 text-[10px] opacity-50">
                        {formatAlmaDate(note.updated_at, locale, {
                          dateStyle: "medium",
                        })}
                      </p>
                    ) : null}
                  </button>
                ))
              ) : (
                <div className="p-5 text-center">
                  <p className="text-sm font-medium">
                    {query ? copy.searchEmpty : copy.empty}
                  </p>
                  {!query ? (
                    <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                      {copy.emptyHelp}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </aside>

          <article
            className={`${selected ? "flex" : "hidden md:flex"} min-h-[560px] min-w-0 flex-col bg-[#FAFAFA]`}
          >
            {selected ? (
              <>
                <div className="flex min-h-14 items-center gap-2 border-b border-[#E5E7EB] px-3 md:px-5">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label={copy.back}
                    className="rounded-lg p-2 text-[#6B7280] md:hidden"
                  >
                    <ArrowLeft />
                  </button>
                  <div className="ml-auto flex items-center gap-3">
                    <SaveIndicator state={saveState} copy={copy} />
                    <button
                      type="button"
                      onClick={() => void deleteNote()}
                      aria-label={copy.delete}
                      title={copy.delete}
                      className="rounded-lg p-2 text-[#6B7280] hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-6 md:px-10 md:py-9">
                  <input
                    value={selected.title}
                    onChange={(event) =>
                      setSelected({ ...selected, title: event.target.value })
                    }
                    aria-label={copy.title}
                    className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none md:text-3xl"
                  />
                  <textarea
                    value={selected.content}
                    onChange={(event) =>
                      setSelected({ ...selected, content: event.target.value })
                    }
                    placeholder={copy.body}
                    aria-label={copy.body}
                    className="mt-5 min-h-[420px] flex-1 resize-none bg-transparent text-[15px] leading-7 outline-none"
                  />
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-6 text-center text-sm text-[#6B7280]">
                {notes.length ? copy.select : copy.emptyHelp}
              </div>
            )}
          </article>
        </section>
      </div>
    </AlmaShell>
  );
}

function StateLine({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 p-3 text-sm text-[#6B7280]">
      {icon}
      {children}
    </div>
  );
}

function SaveIndicator({
  state,
  copy,
}: {
  state: SaveState;
  copy: (typeof notesMessages)["en"] | (typeof notesMessages)["es"];
}) {
  if (state === "idle") return null;
  if (state === "saving")
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#6B7280]">
        <Loader2 className="animate-spin" />
        {copy.saving}
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1.5 text-xs text-teal-700">
        <Check />
        {copy.saved}
      </span>
    );
  return (
    <span className="max-w-64 text-right text-xs text-red-700">
      {copy.saveError}
    </span>
  );
}
