"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type PlannerView = "agenda" | "day" | "week" | "month";
type PlannerStatus = "scheduled" | "completed" | "cancelled";
type PlannerPriority = "low" | "medium" | "high" | "urgent";
type RequestState = "idle" | "loading" | "success" | "error";

type PlannerItem = {
  id: string;
  title: string;
  notes?: string | null;
  task_date: string;
  task_time?: string | null;
  status: PlannerStatus;
  category?: string | null;
  priority?: PlannerPriority | string | null;
  duration_minutes?: number | null;
  color?: string | null;
  reminder_minutes?: number | null;
  recurrence_rule?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
};

type PlannerDraft = {
  title: string;
  notes: string;
  taskDate: string;
  taskTime: string;
  category: string;
  priority: PlannerPriority;
  durationMinutes: string;
  status: PlannerStatus;
};

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

const copy = {
  en: {
    title: "Planner",
    subtitle:
      "Plan the day, protect focus blocks, and keep commitments visible.",
    agenda: "Agenda",
    day: "Day",
    week: "Week",
    month: "Month",
    addItem: "Add Item",
    editItem: "Edit Item",
    save: "Save",
    saving: "Saving",
    cancel: "Cancel",
    complete: "Complete",
    reopen: "Reopen",
    delete: "Delete",
    edit: "Edit",
    date: "Date",
    time: "Time",
    titleLabel: "Title",
    titlePlaceholder: "Event, meeting, work block...",
    notes: "Notes",
    notesPlaceholder: "Context, location, or preparation",
    category: "Category",
    priority: "Priority",
    duration: "Duration",
    status: "Status",
    scheduled: "Scheduled",
    completed: "Completed",
    cancelled: "Cancelled",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    empty: "No planner items here.",
    loading: "Loading planner",
    error: "Planner items could not be loaded.",
    saveError: "Planner item could not be saved. Your changes are still here.",
    deleteError: "Planner item could not be deleted.",
    mutationError: "Planner item could not be updated.",
    titleRequired: "Add a title before saving.",
    noTime: "No time",
    minutes: "minutes",
    previous: "Previous",
    next: "Next",
  },
  es: {
    title: "Planificador",
    subtitle:
      "Organiza el dia, protege bloques de enfoque y mantiene compromisos visibles.",
    agenda: "Agenda",
    day: "Dia",
    week: "Semana",
    month: "Mes",
    addItem: "Agregar item",
    editItem: "Editar item",
    save: "Guardar",
    saving: "Guardando",
    cancel: "Cancelar",
    complete: "Completar",
    reopen: "Reabrir",
    delete: "Eliminar",
    edit: "Editar",
    date: "Fecha",
    time: "Hora",
    titleLabel: "Titulo",
    titlePlaceholder: "Evento, reunion o bloque de trabajo...",
    notes: "Notas",
    notesPlaceholder: "Contexto, lugar o preparacion",
    category: "Categoria",
    priority: "Prioridad",
    duration: "Duracion",
    status: "Estado",
    scheduled: "Programado",
    completed: "Completado",
    cancelled: "Cancelado",
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
    empty: "No hay items aqui.",
    loading: "Cargando planificador",
    error: "No se pudieron cargar los items.",
    saveError: "No se pudo guardar. Tus cambios siguen aqui.",
    deleteError: "No se pudo eliminar el item.",
    mutationError: "No se pudo actualizar el item.",
    titleRequired: "Agrega un titulo antes de guardar.",
    noTime: "Sin hora",
    minutes: "minutos",
    previous: "Anterior",
    next: "Siguiente",
  },
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function rangeFor(view: PlannerView, anchor: string) {
  const date = new Date(`${anchor}T12:00:00`);
  if (view === "week") {
    const start = startOfWeek(date);
    return { from: dateKey(start), to: dateKey(addDays(start, 6)) };
  }
  if (view === "month") {
    return { from: dateKey(startOfMonth(date)), to: dateKey(endOfMonth(date)) };
  }
  if (view === "agenda") {
    return { from: anchor, to: dateKey(addDays(date, 13)) };
  }
  return { from: anchor, to: anchor };
}

function displayDate(value: string, language: AlmaShellLanguage) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function displayRange(
  view: PlannerView,
  anchor: string,
  language: AlmaShellLanguage,
) {
  const range = rangeFor(view, anchor);
  if (range.from === range.to) return displayDate(anchor, language);
  return `${displayDate(range.from, language)} - ${displayDate(range.to, language)}`;
}

function priorityLabel(
  priority: string | null | undefined,
  t: (typeof copy)["en"],
) {
  if (priority === "low" || priority === "high" || priority === "urgent") {
    return t[priority];
  }
  return t.medium;
}

function statusLabel(status: PlannerStatus, t: (typeof copy)["en"]) {
  if (status === "completed") return t.completed;
  if (status === "cancelled") return t.cancelled;
  return t.scheduled;
}

function emptyDraft(anchor: string): PlannerDraft {
  return {
    title: "",
    notes: "",
    taskDate: anchor,
    taskTime: "",
    category: "personal",
    priority: "medium",
    durationMinutes: "30",
    status: "scheduled",
  };
}

export default function PlannerPage() {
  const [language, setLanguage] =
    useState<AlmaShellLanguage>(readStoredLanguage);
  const [anchorDate, setAnchorDate] = useState(todayString);
  const [view, setView] = useState<PlannerView>("agenda");
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [listState, setListState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [draft, setDraft] = useState<PlannerDraft>(() =>
    emptyDraft(todayString()),
  );
  const [formState, setFormState] = useState<RequestState>("idle");
  const [formError, setFormError] = useState("");
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const t = copy[language];

  async function loadItems() {
    const range = rangeFor(view, anchorDate);
    setListState("loading");
    setError("");
    try {
      const response = await fetch(
        `/api/planner?from=${range.from}&to=${range.to}`,
      );
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(t.error);
      setItems(data);
      setListState("success");
    } catch {
      setListState("error");
      setError(t.error);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadItems(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate, view]);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, PlannerItem[]>>((groups, item) => {
      const key = item.task_date;
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    }, {});
  }, [items]);

  function shiftDate(direction: -1 | 1) {
    const date = new Date(`${anchorDate}T12:00:00`);
    const amount = view === "month" ? 31 : view === "week" ? 7 : 1;
    setAnchorDate(dateKey(addDays(date, direction * amount)));
  }

  function openCreate(date = anchorDate) {
    setDraft(emptyDraft(date));
    setEditingItem(null);
    setPanelMode("create");
    setFormState("idle");
    setFormError("");
  }

  function openEdit(item: PlannerItem) {
    setDraft({
      title: item.title,
      notes: item.notes ?? "",
      taskDate: item.task_date,
      taskTime: item.task_time ?? "",
      category: item.category ?? "personal",
      priority:
        item.priority === "low" ||
        item.priority === "high" ||
        item.priority === "urgent"
          ? item.priority
          : "medium",
      durationMinutes: String(item.duration_minutes ?? 30),
      status: item.status,
    });
    setEditingItem(item);
    setPanelMode("edit");
    setFormState("idle");
    setFormError("");
  }

  async function saveItem() {
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
      notes: draft.notes.trim(),
      task_date: draft.taskDate,
      task_time: draft.taskTime,
      taskDate: draft.taskDate,
      taskTime: draft.taskTime,
      category: draft.category.trim() || "personal",
      priority: draft.priority,
      duration_minutes: Number(draft.durationMinutes) || 30,
      durationMinutes: Number(draft.durationMinutes) || 30,
      status: draft.status,
    };

    try {
      const response = await fetch(
        panelMode === "edit" && editingItem
          ? `/api/planner/${editingItem.id}`
          : "/api/planner/add",
        {
          method: panelMode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            panelMode === "edit"
              ? {
                  title: payload.title,
                  notes: payload.notes,
                  task_date: payload.task_date,
                  task_time: payload.task_time,
                  category: payload.category,
                  priority: payload.priority,
                  duration_minutes: payload.duration_minutes,
                  status: payload.status,
                }
              : payload,
          ),
        },
      );
      if (!response.ok) throw new Error(t.saveError);
      setPanelMode(null);
      setEditingItem(null);
      setDraft(emptyDraft(anchorDate));
      setFormState("success");
      setAnchorDate(payload.task_date);
      await loadItems();
    } catch {
      setFormState("error");
      setFormError(t.saveError);
    }
  }

  async function updateStatus(item: PlannerItem) {
    if (mutatingId) return;
    setMutatingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/planner/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: item.status === "completed" ? "scheduled" : "completed",
        }),
      });
      if (!response.ok) throw new Error(t.mutationError);
      await loadItems();
    } catch {
      setError(t.mutationError);
    } finally {
      setMutatingId(null);
    }
  }

  async function deleteItem(item: PlannerItem) {
    if (mutatingId) return;
    setMutatingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/planner/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(t.deleteError);
      await loadItems();
    } catch {
      setError(t.deleteError);
    } finally {
      setMutatingId(null);
    }
  }

  const views: Array<{ key: PlannerView; label: string }> = [
    { key: "agenda", label: t.agenda },
    { key: "day", label: t.day },
    { key: "week", label: t.week },
    { key: "month", label: t.month },
  ];

  return (
    <AlmaShell
      language={language}
      activeWorkspace="planner"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 text-[#111111] sm:px-4 md:px-6 md:py-8">
        <header className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                <CalendarDays className="h-5 w-5" />
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
              onClick={() => openCreate()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 py-3 font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              {t.addItem}
            </button>
          </div>
        </header>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm md:p-4">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-[#F7F7F8] p-1">
            {views.map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => setView(item.key)}
                className={`min-h-11 truncate rounded-xl px-2 text-sm font-medium ${
                  view === item.key ? "bg-black text-white" : "text-[#6B7280]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB]"
                aria-label={t.previous}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <input
                type="date"
                value={anchorDate}
                onChange={(event) => setAnchorDate(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-3"
              />
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB]"
                aria-label={t.next}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <p className="truncate text-sm font-medium text-[#6B7280]">
              {displayRange(view, anchorDate, language)}
            </p>
          </div>
        </section>

        {error ? <ErrorNote message={error} /> : null}

        {listState === "loading" ? (
          <LoadingState text={t.loading} />
        ) : listState === "error" ? (
          <RetryState
            message={error || t.error}
            label={t.error}
            onRetry={() => void loadItems()}
          />
        ) : (
          <PlannerViewContent
            view={view}
            anchorDate={anchorDate}
            items={items}
            groupedItems={groupedItems}
            language={language}
            text={t}
            mutatingId={mutatingId}
            onCreate={openCreate}
            onEdit={openEdit}
            onStatus={(item) => void updateStatus(item)}
            onDelete={(item) => void deleteItem(item)}
          />
        )}
      </div>

      {panelMode ? (
        <PlannerPanel
          mode={panelMode}
          draft={draft}
          text={t}
          state={formState}
          error={formError}
          onChange={setDraft}
          onClose={() => setPanelMode(null)}
          onSave={() => void saveItem()}
        />
      ) : null}
    </AlmaShell>
  );
}

function PlannerViewContent({
  view,
  anchorDate,
  items,
  groupedItems,
  language,
  text,
  mutatingId,
  onCreate,
  onEdit,
  onStatus,
  onDelete,
}: {
  view: PlannerView;
  anchorDate: string;
  items: PlannerItem[];
  groupedItems: Record<string, PlannerItem[]>;
  language: AlmaShellLanguage;
  text: (typeof copy)["en"];
  mutatingId: string | null;
  onCreate: (date?: string) => void;
  onEdit: (item: PlannerItem) => void;
  onStatus: (item: PlannerItem) => void;
  onDelete: (item: PlannerItem) => void;
}) {
  if (!items.length) return <EmptyState text={text.empty} />;

  if (view === "week" || view === "month") {
    const range = rangeFor(view, anchorDate);
    const days: string[] = [];
    let current = new Date(`${range.from}T12:00:00`);
    const end = new Date(`${range.to}T12:00:00`);
    while (current <= end) {
      days.push(dateKey(current));
      current = addDays(current, 1);
    }
    return (
      <section className="grid gap-3 lg:grid-cols-7">
        {days.map((day) => (
          <div
            key={day}
            className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm"
          >
            <button
              type="button"
              onClick={() => onCreate(day)}
              className="mb-3 flex w-full items-center justify-between gap-2 text-left text-sm font-medium"
            >
              <span className="truncate">{displayDate(day, language)}</span>
              <Plus className="h-4 w-4 shrink-0" />
            </button>
            <div className="space-y-2">
              {(groupedItems[day] ?? []).length ? (
                groupedItems[day].map((item) => (
                  <PlannerCard
                    key={item.id}
                    item={item}
                    language={language}
                    text={text}
                    compact
                    mutating={mutatingId === item.id}
                    onEdit={() => onEdit(item)}
                    onStatus={() => onStatus(item)}
                    onDelete={() => onDelete(item)}
                  />
                ))
              ) : (
                <p className="rounded-2xl bg-[#F7F7F8] p-3 text-xs text-[#6B7280]">
                  {text.empty}
                </p>
              )}
            </div>
          </div>
        ))}
      </section>
    );
  }

  const dates = Object.keys(groupedItems).sort();
  return (
    <section className="grid gap-4">
      {dates.map((date) => (
        <div
          key={date}
          className="rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm md:p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="truncate text-lg font-medium">
              {displayDate(date, language)}
            </h2>
            <button
              type="button"
              onClick={() => onCreate(date)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-3 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              {text.addItem}
            </button>
          </div>
          <div className="grid gap-3">
            {groupedItems[date].map((item) => (
              <PlannerCard
                key={item.id}
                item={item}
                language={language}
                text={text}
                mutating={mutatingId === item.id}
                onEdit={() => onEdit(item)}
                onStatus={() => onStatus(item)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function PlannerCard({
  item,
  language,
  text,
  mutating,
  compact,
  onEdit,
  onStatus,
  onDelete,
}: {
  item: PlannerItem;
  language: AlmaShellLanguage;
  text: (typeof copy)["en"];
  mutating: boolean;
  compact?: boolean;
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-3">
      <div className="flex min-w-0 gap-3">
        <button
          type="button"
          disabled={mutating}
          onClick={onStatus}
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white disabled:opacity-60"
          aria-label={item.status === "completed" ? text.reopen : text.complete}
        >
          {mutating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : item.status === "completed" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <h3
            className={`break-words font-medium ${
              item.status === "completed" ? "text-[#6B7280] line-through" : ""
            }`}
          >
            {item.title}
          </h3>
          {item.notes && !compact ? (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6B7280]">
              {item.notes}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-[#6B7280]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
              <Clock className="h-3.5 w-3.5" />
              {item.task_time || text.noTime}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1">
              {statusLabel(item.status, text)}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1">
              {priorityLabel(item.priority, text)}
            </span>
            {item.duration_minutes ? (
              <span className="rounded-full bg-white px-2.5 py-1">
                {item.duration_minutes} {text.minutes}
              </span>
            ) : null}
            {compact ? null : (
              <span className="rounded-full bg-white px-2.5 py-1">
                {displayDate(item.task_date, language)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <ActionButton icon={Edit3} label={text.edit} onClick={onEdit} />
        <ActionButton
          icon={item.status === "completed" ? RefreshCcw : CheckCircle2}
          label={item.status === "completed" ? text.reopen : text.complete}
          onClick={onStatus}
          disabled={mutating}
        />
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

function PlannerPanel({
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
  draft: PlannerDraft;
  text: (typeof copy)["en"];
  state: RequestState;
  error: string;
  onChange: (draft: PlannerDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-medium">
            {mode === "edit" ? text.editItem : text.addItem}
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
            <span className="text-sm font-medium">{text.titleLabel}</span>
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
            <span className="text-sm font-medium">{text.date}</span>
            <input
              type="date"
              value={draft.taskDate}
              onChange={(event) =>
                onChange({ ...draft, taskDate: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
            />
          </label>
          <label>
            <span className="text-sm font-medium">{text.time}</span>
            <input
              type="time"
              value={draft.taskTime}
              onChange={(event) =>
                onChange({ ...draft, taskTime: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
            />
          </label>
          <label>
            <span className="text-sm font-medium">{text.status}</span>
            <select
              value={draft.status}
              onChange={(event) =>
                onChange({
                  ...draft,
                  status: event.target.value as PlannerStatus,
                })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
            >
              <option value="scheduled">{text.scheduled}</option>
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
                  priority: event.target.value as PlannerPriority,
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
            <span className="text-sm font-medium">{text.category}</span>
            <input
              value={draft.category}
              onChange={(event) =>
                onChange({ ...draft, category: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
            />
          </label>
          <label>
            <span className="text-sm font-medium">{text.duration}</span>
            <input
              type="number"
              min="1"
              value={draft.durationMinutes}
              onChange={(event) =>
                onChange({ ...draft, durationMinutes: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">{text.notes}</span>
            <textarea
              value={draft.notes}
              onChange={(event) =>
                onChange({ ...draft, notes: event.target.value })
              }
              placeholder={text.notesPlaceholder}
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-4 outline-none focus:border-black"
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
      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2 text-xs font-medium disabled:text-[#9CA3AF]"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
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
