"use client";

import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  due_at?: string | null;
  completed_at?: string | null;
};

type Lang = "en" | "es";

function readStoredLanguage(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

const copy = {
  en: {
    title: "Tasks",
    subtitle: "Organize priorities, reminders, and follow-ups.",
    new: "New task",
    description: "Description (optional)",
    due: "Due date and time",
    create: "Create task",
    all: "All",
    open: "Open",
    completed: "Completed",
    search: "Search tasks",
    empty: "No tasks found.",
    delete: "Delete",
    cancel: "Cancel",
    reopen: "Reopen",
    complete: "Complete",
    overdue: "Overdue",
    loading: "Loading tasks...",
    error: "Unable to load tasks.",
  },
  es: {
    title: "Tareas",
    subtitle: "Organiza prioridades, recordatorios y pendientes.",
    new: "Nueva tarea",
    description: "Descripción (opcional)",
    due: "Fecha y hora límite",
    create: "Crear tarea",
    all: "Todas",
    open: "Abiertas",
    completed: "Completadas",
    search: "Buscar tareas",
    empty: "No hay tareas.",
    delete: "Eliminar",
    cancel: "Cancelar",
    reopen: "Reabrir",
    complete: "Completar",
    overdue: "Vencida",
    loading: "Cargando tareas...",
    error: "No se pudieron cargar las tareas.",
  },
};

export default function TasksPage() {
  const [lang, setLang] = useState<Lang>(readStoredLanguage);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueAt, setDueAt] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const t = copy[lang];

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ status: filter, q: query });
      const r = await fetch(`/api/tasks/list?${p}`);
      if (!r.ok) throw new Error();
      setTasks(await r.json());
      setError("");
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 200 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query]);

  function updateLanguage(next: AlmaShellLanguage) {
    setLang(next);
    localStorage.setItem("alma_language", next);
  }

  const create = async () => {
    if (!title.trim()) return;
    const r = await fetch("/api/tasks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      }),
    });
    if (r.ok) {
      setTitle("");
      setDescription("");
      setDueAt("");
      void load();
    } else setError(t.error);
  };

  const update = async (id: string, status: string) => {
    const r = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) void load();
    else setError(t.error);
  };

  const remove = async (id: string) => {
    const r = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (r.ok) void load();
    else setError(t.error);
  };

  const overdue = (task: Task) =>
    task.due_at &&
    new Date(task.due_at) < new Date() &&
    !["completed", "cancelled"].includes(task.status);

  return (
    <AlmaShell
      language={lang}
      activeWorkspace="tasks"
      title={t.title}
      description={t.subtitle}
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto w-full max-w-4xl px-3 py-4 md:px-6 md:py-10">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 md:rounded-[2rem] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="text-4xl font-medium tracking-tight">{t.title}</h1>
              <p className="mt-4 text-[#6B7280]">{t.subtitle}</p>
            </div>
            <button
              onClick={() => updateLanguage(lang === "en" ? "es" : "en")}
              className="shrink-0 rounded-full border px-3 py-2 text-xs"
            >
              {lang.toUpperCase()}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:mt-8">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.new}
              className="min-w-0 rounded-2xl border bg-[#F7F7F8] px-4 py-3 outline-none"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="min-w-0 rounded-2xl border bg-[#F7F7F8] px-4 py-3"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.description}
              className="min-w-0 rounded-2xl border bg-[#F7F7F8] px-4 py-3 outline-none"
            />
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              aria-label={t.due}
              className="min-w-0 rounded-2xl border bg-[#F7F7F8] px-4 py-3"
            />
          </div>

          <button
            onClick={create}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-white sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {t.create}
          </button>

          <div className="mt-8 flex flex-wrap gap-2">
            {["all", "open", "completed", "overdue", "today"].map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={
                  filter === value
                    ? "rounded-full bg-black px-4 py-2 text-sm text-white"
                    : "rounded-full bg-[#F7F7F8] px-4 py-2 text-sm"
                }
              >
                {t[value as keyof typeof t] || value}
              </button>
            ))}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="min-w-0 flex-1 rounded-full border px-4 py-2 text-sm outline-none sm:ml-auto sm:flex-none"
            />
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-[#6B7280]">{t.loading}</p>
            ) : tasks.length === 0 ? (
              <p className="rounded-2xl bg-[#F7F7F8] p-5 text-sm text-[#6B7280]">
                {t.empty}
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 sm:flex-row sm:items-center"
                >
                  <button
                    onClick={() =>
                      update(
                        task.id,
                        task.status === "completed" ? "open" : "completed",
                      )
                    }
                    className="shrink-0 self-start"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="block h-5 w-5 rounded-full border border-[#6B7280]" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        task.status === "completed"
                          ? "line-through text-[#6B7280]"
                          : ""
                      }
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {task.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[#6B7280]">
                      {task.priority}
                      {task.due_at
                        ? ` · ${new Date(task.due_at).toLocaleString()}`
                        : ""}
                      {overdue(task) ? ` · ${t.overdue}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {task.status !== "cancelled" && (
                      <button
                        onClick={() => update(task.id, "cancelled")}
                        className="text-xs text-[#6B7280]"
                      >
                        {t.cancel}
                      </button>
                    )}
                    <button
                      onClick={() => remove(task.id)}
                      aria-label={t.delete}
                      className="text-[#6B7280] hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AlmaShell>
  );
}
