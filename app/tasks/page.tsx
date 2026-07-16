"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type TaskPriority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
type Section = "today" | "upcoming" | "all" | "completed";
type RequestState = "idle" | "loading" | "success" | "error";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at?: string | null;
  completed_at?: string | null;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  dueTime: string;
};

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  priority: "medium",
  status: "open",
  dueDate: "",
  dueTime: "",
};

const copy = {
  en: {
    title: "Tasks",
    subtitle: "A focused workspace for priorities, reminders, and follow-ups.",
    today: "Today",
    upcoming: "Upcoming",
    all: "All Tasks",
    completed: "Completed",
    addTask: "Add Task",
    editTask: "Edit Task",
    save: "Save",
    saving: "Saving",
    cancel: "Cancel",
    complete: "Complete",
    reopen: "Reopen",
    delete: "Delete",
    edit: "Edit",
    search: "Search",
    searchPlaceholder: "Search tasks",
    status: "Status",
    priority: "Priority",
    dueDate: "Due date",
    dueTime: "Due time",
    description: "Description",
    titlePlaceholder: "Task title",
    descriptionPlaceholder: "Notes, context, or next step",
    loading: "Loading tasks",
    empty: "No tasks here.",
    error: "Tasks could not be loaded.",
    saveError: "Task could not be saved. Your changes are still here.",
    deleteError: "Task could not be deleted.",
    mutationError: "Task could not be updated.",
    titleRequired: "Add a title before saving.",
    overdue: "Overdue",
    noDueDate: "No due date",
    open: "Open",
    inProgress: "In progress",
    cancelled: "Cancelled",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    source: "Source",
    manual: "Manual",
    almaChat: "ALMA",
    planner: "Planner",
    import: "Import",
  },
  es: {
    title: "Tareas",
    subtitle:
      "Un espacio enfocado para prioridades, recordatorios y pendientes.",
    today: "Hoy",
    upcoming: "Proximas",
    all: "Todas",
    completed: "Completadas",
    addTask: "Agregar tarea",
    editTask: "Editar tarea",
    save: "Guardar",
    saving: "Guardando",
    cancel: "Cancelar",
    complete: "Completar",
    reopen: "Reabrir",
    delete: "Eliminar",
    edit: "Editar",
    search: "Buscar",
    searchPlaceholder: "Buscar tareas",
    status: "Estado",
    priority: "Prioridad",
    dueDate: "Fecha limite",
    dueTime: "Hora limite",
    description: "Descripcion",
    titlePlaceholder: "Titulo de la tarea",
    descriptionPlaceholder: "Notas, contexto o siguiente paso",
    loading: "Cargando tareas",
    empty: "No hay tareas aqui.",
    error: "No se pudieron cargar las tareas.",
    saveError: "No se pudo guardar. Tus cambios siguen aqui.",
    deleteError: "No se pudo eliminar la tarea.",
    mutationError: "No se pudo actualizar la tarea.",
    titleRequired: "Agrega un titulo antes de guardar.",
    overdue: "Vencida",
    noDueDate: "Sin fecha limite",
    open: "Abierta",
    inProgress: "En progreso",
    cancelled: "Cancelada",
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
    source: "Origen",
    manual: "Manual",
    almaChat: "ALMA",
    planner: "Planificador",
    import: "Importacion",
  },
};

function toInputParts(value?: string | null) {
  if (!value) return { dueDate: "", dueTime: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { dueDate: "", dueTime: "" };
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    dueDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    dueTime: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function toDueAt(draft: TaskDraft) {
  if (!draft.dueDate) return null;
  return new Date(`${draft.dueDate}T${draft.dueTime || "23:59"}`).toISOString();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isActive(task: Task) {
  return !["completed", "cancelled"].includes(task.status);
}

function isOverdue(task: Task) {
  return Boolean(
    task.due_at && isActive(task) && new Date(task.due_at) < new Date(),
  );
}

function formatDateTime(
  value: string | null | undefined,
  language: AlmaShellLanguage,
) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function priorityLabel(priority: TaskPriority, t: (typeof copy)["en"]) {
  return t[priority];
}

function statusLabel(status: TaskStatus, t: (typeof copy)["en"]) {
  if (status === "in_progress") return t.inProgress;
  if (status === "completed") return t.completed;
  if (status === "cancelled") return t.cancelled;
  return t.open;
}

function sourceLabel(
  source: string | null | undefined,
  t: (typeof copy)["en"],
) {
  if (source === "alma_chat") return t.almaChat;
  if (source === "planner") return t.planner;
  if (source === "import") return t.import;
  return t.manual;
}

export default function TasksPage() {
  const [language, setLanguage] =
    useState<AlmaShellLanguage>(readStoredLanguage);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [section, setSection] = useState<Section>("today");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [listState, setListState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [formState, setFormState] = useState<RequestState>("idle");
  const [formError, setFormError] = useState("");
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const t = copy[language];

  async function loadTasks() {
    setListState("loading");
    setError("");
    try {
      const params = new URLSearchParams({
        status: "all",
        q: query,
      });
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      const response = await fetch(`/api/tasks/list?${params}`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(t.error);
      setTasks(data);
      setListState("success");
    } catch {
      setListState("error");
      setError(t.error);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTasks(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, priorityFilter]);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  const visibleTasks = useMemo(() => {
    const today = new Date();
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (section === "completed") return task.status === "completed";
      if (section === "today") {
        return Boolean(
          isActive(task) &&
          task.due_at &&
          isSameDay(new Date(task.due_at), today),
        );
      }
      if (section === "upcoming") {
        return Boolean(
          isActive(task) &&
          task.due_at &&
          !isSameDay(new Date(task.due_at), today) &&
          new Date(task.due_at) > today,
        );
      }
      return true;
    });
  }, [section, statusFilter, tasks]);

  function openCreate() {
    setDraft(emptyDraft);
    setEditingTask(null);
    setPanelMode("create");
    setFormError("");
    setFormState("idle");
  }

  function openEdit(task: Task) {
    setDraft({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      status: task.status,
      ...toInputParts(task.due_at),
    });
    setEditingTask(task);
    setPanelMode("edit");
    setFormError("");
    setFormState("idle");
  }

  async function saveTask() {
    if (formState === "loading") return;
    if (!draft.title.trim()) {
      setFormError(t.titleRequired);
      setFormState("error");
      return;
    }

    setFormState("loading");
    setFormError("");
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      priority: draft.priority,
      status: draft.status,
      dueAt: toDueAt(draft),
    };

    try {
      const response = await fetch(
        panelMode === "edit" && editingTask
          ? `/api/tasks/${editingTask.id}`
          : "/api/tasks/create",
        {
          method: panelMode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(t.saveError);
      setPanelMode(null);
      setEditingTask(null);
      setDraft(emptyDraft);
      setFormState("success");
      await loadTasks();
    } catch {
      setFormState("error");
      setFormError(t.saveError);
    }
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    if (mutatingId) return;
    setMutatingId(task.id);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(t.mutationError);
      await loadTasks();
    } catch {
      setError(t.mutationError);
    } finally {
      setMutatingId(null);
    }
  }

  async function deleteTask(task: Task) {
    if (mutatingId) return;
    setMutatingId(task.id);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(t.deleteError);
      await loadTasks();
    } catch {
      setError(t.deleteError);
    } finally {
      setMutatingId(null);
    }
  }

  const sections: Array<{ key: Section; label: string }> = [
    { key: "today", label: t.today },
    { key: "upcoming", label: t.upcoming },
    { key: "all", label: t.all },
    { key: "completed", label: t.completed },
  ];

  return (
    <AlmaShell
      language={language}
      activeWorkspace="tasks"
      title={t.title}
      description={t.subtitle}
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 text-[#111111] sm:px-4 md:px-6 md:py-8">
        <header className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="text-4xl font-medium tracking-tight md:text-6xl">
                {t.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#6B7280] md:text-lg">
                {t.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 py-3 font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              {t.addTask}
            </button>
          </div>
        </header>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm md:p-4">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-[#F7F7F8] p-1">
            {sections.map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`min-h-11 truncate rounded-xl px-2 text-sm font-medium ${
                  section === item.key
                    ? "bg-black text-white"
                    : "text-[#6B7280]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_160px]">
            <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3">
              <Search className="h-4 w-4 shrink-0 text-[#6B7280]" />
              <span className="sr-only">{t.search}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            <Select
              label={t.status}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as "all" | TaskStatus)}
              options={[
                ["all", t.all],
                ["open", t.open],
                ["in_progress", t.inProgress],
                ["completed", t.completed],
                ["cancelled", t.cancelled],
              ]}
            />
            <Select
              label={t.priority}
              value={priorityFilter}
              onChange={(value) =>
                setPriorityFilter(value as "all" | TaskPriority)
              }
              options={[
                ["all", t.all],
                ["low", t.low],
                ["medium", t.medium],
                ["high", t.high],
                ["urgent", t.urgent],
              ]}
            />
          </div>
        </section>

        {error ? <ErrorNote message={error} /> : null}

        <section className="grid gap-3">
          {listState === "loading" ? (
            <LoadingState text={t.loading} />
          ) : listState === "error" ? (
            <RetryState
              message={error || t.error}
              label={t.error}
              onRetry={() => void loadTasks()}
            />
          ) : visibleTasks.length ? (
            visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                language={language}
                text={t}
                mutating={mutatingId === task.id}
                onEdit={() => openEdit(task)}
                onComplete={() =>
                  void updateTaskStatus(
                    task,
                    task.status === "completed" ? "open" : "completed",
                  )
                }
                onCancel={() => void updateTaskStatus(task, "cancelled")}
                onDelete={() => void deleteTask(task)}
              />
            ))
          ) : (
            <EmptyState text={t.empty} />
          )}
        </section>
      </div>

      {panelMode ? (
        <TaskPanel
          mode={panelMode}
          draft={draft}
          text={t}
          state={formState}
          error={formError}
          onChange={setDraft}
          onClose={() => setPanelMode(null)}
          onSave={() => void saveTask()}
        />
      ) : null}
    </AlmaShell>
  );
}

function TaskCard({
  task,
  language,
  text,
  mutating,
  onEdit,
  onComplete,
  onCancel,
  onDelete,
}: {
  task: Task;
  language: AlmaShellLanguage;
  text: (typeof copy)["en"];
  mutating: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(task);
  return (
    <article className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex min-w-0 gap-3">
        <button
          type="button"
          disabled={mutating}
          onClick={onComplete}
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D1D5DB] disabled:opacity-60"
          aria-label={task.status === "completed" ? text.reopen : text.complete}
        >
          {mutating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : task.status === "completed" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className={`min-w-0 break-words text-lg font-medium ${
                task.status === "completed" ? "text-[#6B7280] line-through" : ""
              }`}
            >
              {task.title}
            </h2>
            {overdue ? (
              <span className="rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-medium text-[#991B1B]">
                {text.overdue}
              </span>
            ) : null}
          </div>
          {task.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6B7280]">
              {task.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#6B7280]">
            <span className="rounded-full bg-[#F7F7F8] px-2.5 py-1">
              {statusLabel(task.status, text)}
            </span>
            <span className="rounded-full bg-[#F7F7F8] px-2.5 py-1">
              {priorityLabel(task.priority, text)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F7F8] px-2.5 py-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(task.due_at, language) || text.noDueDate}
            </span>
            <span className="rounded-full bg-[#F7F7F8] px-2.5 py-1">
              {text.source}: {sourceLabel(task.source, text)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <ActionButton icon={Edit3} label={text.edit} onClick={onEdit} />
        <ActionButton
          icon={task.status === "completed" ? RefreshCcw : CheckCircle2}
          label={task.status === "completed" ? text.reopen : text.complete}
          onClick={onComplete}
          disabled={mutating}
        />
        {task.status !== "cancelled" ? (
          <ActionButton
            icon={X}
            label={text.cancel}
            onClick={onCancel}
            disabled={mutating}
          />
        ) : null}
        <ActionButton
          icon={Trash2}
          label={text.delete}
          onClick={onDelete}
          disabled={mutating}
        />
      </div>
    </article>
  );
}

function TaskPanel({
  mode,
  draft,
  text,
  state,
  error,
  onChange,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  draft: TaskDraft;
  text: (typeof copy)["en"];
  state: RequestState;
  error: string;
  onChange: (draft: TaskDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-medium">
            {mode === "edit" ? text.editTask : text.addTask}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
            aria-label={text.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">{text.title}</span>
            <input
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              placeholder={text.titlePlaceholder}
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
            />
          </label>
          <label>
            <span className="text-sm font-medium">{text.status}</span>
            <select
              value={draft.status}
              onChange={(event) =>
                onChange({ ...draft, status: event.target.value as TaskStatus })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
            >
              <option value="open">{text.open}</option>
              <option value="in_progress">{text.inProgress}</option>
              <option value="completed">{text.completed}</option>
              <option value="cancelled">{text.cancelled}</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">{text.priority}</span>
            <select
              value={draft.priority}
              onChange={(event) =>
                onChange({
                  ...draft,
                  priority: event.target.value as TaskPriority,
                })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
            >
              <option value="low">{text.low}</option>
              <option value="medium">{text.medium}</option>
              <option value="high">{text.high}</option>
              <option value="urgent">{text.urgent}</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">{text.dueDate}</span>
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) =>
                onChange({ ...draft, dueDate: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
            />
          </label>
          <label>
            <span className="text-sm font-medium">{text.dueTime}</span>
            <input
              type="time"
              value={draft.dueTime}
              onChange={(event) =>
                onChange({ ...draft, dueTime: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">{text.description}</span>
            <textarea
              value={draft.description}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              placeholder={text.descriptionPlaceholder}
              className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-4 outline-none focus:border-black"
            />
          </label>
        </div>

        {error ? <ErrorNote message={error} /> : null}

        <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-[#D1D5DB] px-5 font-medium"
          >
            {text.cancel}
          </button>
          <button
            type="button"
            disabled={state === "loading"}
            onClick={onSave}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white disabled:bg-[#9CA3AF]"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {state === "loading" ? text.saving : text.save}
          </button>
        </div>
      </section>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full appearance-none rounded-2xl border border-[#E5E7EB] bg-white px-3 pr-9 text-sm outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
    </label>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Edit3;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-4 text-sm font-medium disabled:text-[#9CA3AF]"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white p-6 text-[#6B7280]">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 text-sm leading-6 text-[#6B7280]">
      {text}
    </div>
  );
}

function RetryState({
  message,
  label,
  onRetry,
}: {
  message: string;
  label: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[#FCA5A5] bg-white p-5">
      <div className="flex items-start gap-3 text-sm leading-6 text-[#991B1B]">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D1D5DB] px-4 py-2 text-sm font-medium"
      >
        <RefreshCcw className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-[#FEF2F2] p-3 text-sm leading-6 text-[#991B1B]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
