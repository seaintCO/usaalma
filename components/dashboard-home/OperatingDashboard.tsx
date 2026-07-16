"use client";

import {
  Activity,
  AlertCircle,
  Apple,
  Bot,
  CheckCircle2,
  Clock3,
  Dumbbell,
  FileText,
  ImageIcon,
  Inbox,
  Loader2,
  MessageSquare,
  NotebookText,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WORKSPACE_ROUTES } from "@/lib/platform/workspaceRoutes";

type Language = "en" | "es";
type RunStatus = "queued" | "running" | "failed" | "completed" | string;

type SummaryTask = {
  id: string;
  title: string;
  status?: string | null;
  due_at?: string | null;
};

type PlannerItem = {
  id: string;
  title: string;
  task_time?: string | null;
  status?: string | null;
};

type SummaryDocument = {
  id: string;
  title: string;
  updated_at?: string | null;
  status?: string | null;
};

type SummaryRun = {
  id: string;
  status: RunStatus;
  updated_at?: string | null;
};

type ActivityItem = {
  id: string;
  event_type?: string | null;
  summary?: string | null;
  created_at?: string | null;
  level?: string | null;
};

type FitnessGoals = {
  daily_calories?: number | null;
  daily_protein?: number | null;
  daily_carbs?: number | null;
  daily_fat?: number | null;
  water_goal_oz?: number | null;
};

type FitnessTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type DashboardSummary = {
  today: string;
  tasks: SummaryTask[];
  planner: PlannerItem[];
  notes: SummaryDocument[];
  documents: SummaryDocument[];
  runs: SummaryRun[];
  activity: ActivityItem[];
  fitness: {
    totals: FitnessTotals;
    goals: FitnessGoals | null;
  };
};

type Conversation = {
  id: string;
  title?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ConversationStatus = {
  active?: boolean;
  unread?: boolean;
  failed?: boolean;
};

type FocusItem = {
  id: string;
  title: string;
  meta: string;
  route?: string;
  icon: LucideIcon;
  tone?: "danger" | "active" | "normal";
  onClick?: () => void;
};

type DashboardCopy = (typeof COPY)[keyof typeof COPY];

type RunItem = {
  id: string;
  status: string;
  title: string;
  timestamp?: string | null;
  onClick?: () => void;
};

const COPY = {
  en: {
    greeting: "Good morning",
    attention: "Here's what needs attention.",
    loading: "Loading operating dashboard...",
    unavailable: "Dashboard is temporarily unavailable.",
    retry: "Retry",
    focus: "Today's Focus",
    noFocus: "Nothing urgent needs attention right now.",
    quickActions: "Quick Actions",
    runs: "Active ALMA Runs",
    noRuns: "No active or failed ALMA runs.",
    productivity: "Productivity",
    fitness: "Fitness Snapshot",
    noFitness: "No fitness goals or entries yet.",
    recentActivity: "Recent Activity",
    noActivity: "No recent activity yet.",
    conversations: "Recent Conversations",
    noConversations: "No recent conversations yet.",
    tasks: "Tasks",
    planner: "Planner",
    notes: "Notes",
    documents: "Documents",
    openTasks: "Open tasks",
    plannerToday: "Planner today",
    recentNotes: "Recent notes",
    recentDocuments: "Recent documents",
    ask: "Ask ALMA",
    newTask: "New Task",
    newNote: "New Note",
    plannerItem: "Planner Item",
    document: "Upload Document",
    image: "Generate Image",
    crm: "Open CRM",
    invoice: "Create Invoice",
    food: "Add Food",
    trader: "Open Trader",
    failed: "Failed",
    running: "Running",
    queued: "Queued",
    unread: "Unread",
    completed: "Completed",
    active: "Active",
    calories: "Calories",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    targetWeight: "Target weight is managed in Fitness.",
    setupFitness: "Set up Fitness",
  },
  es: {
    greeting: "Buenos dias",
    attention: "Esto necesita tu atencion.",
    loading: "Cargando panel operativo...",
    unavailable: "El panel no esta disponible temporalmente.",
    retry: "Reintentar",
    focus: "Enfoque de hoy",
    noFocus: "Nada urgente necesita atencion ahora.",
    quickActions: "Acciones rapidas",
    runs: "Ejecuciones ALMA activas",
    noRuns: "No hay ejecuciones ALMA activas o fallidas.",
    productivity: "Productividad",
    fitness: "Resumen fitness",
    noFitness: "Todavia no hay metas o entradas fitness.",
    recentActivity: "Actividad reciente",
    noActivity: "Todavia no hay actividad reciente.",
    conversations: "Conversaciones recientes",
    noConversations: "Todavia no hay conversaciones recientes.",
    tasks: "Tareas",
    planner: "Planificador",
    notes: "Notas",
    documents: "Documentos",
    openTasks: "Tareas abiertas",
    plannerToday: "Plan de hoy",
    recentNotes: "Notas recientes",
    recentDocuments: "Documentos recientes",
    ask: "Preguntar a ALMA",
    newTask: "Nueva tarea",
    newNote: "Nueva nota",
    plannerItem: "Elemento del plan",
    document: "Subir documento",
    image: "Generar imagen",
    crm: "Abrir CRM",
    invoice: "Crear factura",
    food: "Agregar comida",
    trader: "Abrir Trader",
    failed: "Fallida",
    running: "Activa",
    queued: "En cola",
    unread: "Sin leer",
    completed: "Completada",
    active: "Activa",
    calories: "Calorias",
    protein: "Proteina",
    carbs: "Carbos",
    fat: "Grasa",
    targetWeight: "El peso objetivo se administra en Fitness.",
    setupFitness: "Configurar Fitness",
  },
} as const;

const STATUS_PRIORITY: Record<string, number> = {
  failed: 0,
  running: 1,
  queued: 2,
  unread: 3,
  completed: 4,
};

export default function OperatingDashboard({
  conversations = [],
  conversationStatuses = {},
  language,
  onAsk,
  onConversationSelect,
}: {
  conversations?: Conversation[];
  conversationStatuses?: Record<string, ConversationStatus>;
  language: Language;
  onAsk: () => void;
  onConversationSelect?: (id: string) => void;
}) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState(false);
  const t = COPY[language];

  const load = useCallback(async () => {
    setError(false);
    try {
      const response = await fetch("/api/dashboard/summary");
      if (!response.ok) throw new Error("dashboard_unavailable");
      setData((await response.json()) as DashboardSummary);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  const date = data?.today ? new Date(`${data.today}T12:00:00`) : new Date();
  const dateLabel = new Intl.DateTimeFormat(language === "es" ? "es" : "en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);

  const runItems = useMemo(() => {
    const summaryRuns: RunItem[] = (data?.runs ?? [])
      .filter((run) => ["queued", "running", "failed"].includes(run.status))
      .map((run) => ({
        id: run.id,
        status: run.status,
        title: run.status,
        timestamp: run.updated_at,
        onClick: undefined,
      }));
    const conversationRuns = conversations
      .map((conversation) => {
        const status = conversationStatuses[conversation.id];
        if (!status?.failed && !status?.active && !status?.unread) return null;
        const label = status.failed
          ? "failed"
          : status.active
            ? "running"
            : "unread";
        return {
          id: conversation.id,
          status: label,
          title: conversation.title || "ALMA",
          timestamp: conversation.updated_at ?? conversation.created_at,
          onClick: () => onConversationSelect?.(conversation.id),
        };
      })
      .filter(Boolean) as RunItem[];
    return [...conversationRuns, ...summaryRuns].sort(
      (a, b) =>
        (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9),
    );
  }, [conversationStatuses, conversations, data?.runs, onConversationSelect]);

  const focusItems = useMemo<FocusItem[]>(() => {
    const failedRuns = runItems
      .filter((run) => run.status === "failed")
      .slice(0, 2)
      .map((run) => ({
        id: `run-${run.id}`,
        title: run.title,
        meta: t.failed,
        icon: AlertCircle,
        tone: "danger" as const,
        onClick: run.onClick,
      }));
    const activeRuns = runItems
      .filter((run) => run.status === "running" || run.status === "queued")
      .slice(0, 2)
      .map((run) => ({
        id: `active-${run.id}`,
        title: run.title,
        meta: run.status === "queued" ? t.queued : t.running,
        icon: Bot,
        tone: "active" as const,
        onClick: run.onClick,
      }));
    const unread = runItems
      .filter((run) => run.status === "unread")
      .slice(0, 2)
      .map((run) => ({
        id: `unread-${run.id}`,
        title: run.title,
        meta: t.unread,
        icon: MessageSquare,
        onClick: run.onClick,
      }));
    const tasks = (data?.tasks ?? []).slice(0, 3).map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      meta: task.due_at ? formatShortDate(task.due_at, language) : t.openTasks,
      route: WORKSPACE_ROUTES.tasks,
      icon: CheckCircle2,
    }));
    const planner = (data?.planner ?? []).slice(0, 2).map((item) => ({
      id: `planner-${item.id}`,
      title: item.title,
      meta: item.task_time || t.plannerToday,
      route: WORKSPACE_ROUTES.planner,
      icon: Clock3,
    }));
    return [
      ...failedRuns,
      ...activeRuns,
      ...unread,
      ...tasks,
      ...planner,
    ].slice(0, 7);
  }, [data?.planner, data?.tasks, language, runItems, t]);

  if (!data) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F7F8] p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            {error ? (
              <div className="flex flex-col gap-3 text-sm text-[#6B7280]">
                <p>{t.unavailable}</p>
                <button
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-black px-3 font-medium text-black"
                  onClick={load}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t.retry}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.loading}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F7F7F8] px-3 py-4 text-black md:px-6 md:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs font-semibold uppercase text-[#6B7280]">
            {dateLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
            {t.greeting}.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">{t.attention}</p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="min-w-0 space-y-4">
            <Panel icon={Inbox} title={t.focus}>
              {focusItems.length ? (
                <div className="space-y-2">
                  {focusItems.map((item) => (
                    <FocusRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyState text={t.noFocus} />
              )}
            </Panel>

            <Panel icon={Plus} title={t.quickActions}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <QuickAction icon={Bot} label={t.ask} onClick={onAsk} />
                <QuickAction
                  icon={CheckCircle2}
                  href="/tasks"
                  label={t.newTask}
                />
                <QuickAction
                  icon={NotebookText}
                  href="/notes"
                  label={t.newNote}
                />
                <QuickAction
                  icon={Clock3}
                  href="/planner"
                  label={t.plannerItem}
                />
                <QuickAction
                  icon={FileText}
                  href="/documents"
                  label={t.document}
                />
                <QuickAction icon={ImageIcon} href="/images" label={t.image} />
                <QuickAction icon={Search} href="/crm" label={t.crm} />
                <QuickAction
                  icon={ReceiptText}
                  href="/invoicing"
                  label={t.invoice}
                />
                <QuickAction icon={Apple} href="/fitness" label={t.food} />
                <QuickAction
                  icon={TrendingUp}
                  href="/trader"
                  label={t.trader}
                />
              </div>
            </Panel>

            <ProductivityPanel data={data} language={language} text={t} />
          </div>

          <div className="min-w-0 space-y-4">
            <RunsPanel items={runItems} text={t} />
            <FitnessPanel fitness={data.fitness} text={t} />
            <ActivityPanel
              activity={data.activity}
              language={language}
              text={t}
            />
            <ConversationsPanel
              conversations={conversations}
              statuses={conversationStatuses}
              text={t}
              onSelect={onConversationSelect}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductivityPanel({
  data,
  language,
  text,
}: {
  data: DashboardSummary;
  language: Language;
  text: DashboardCopy;
}) {
  return (
    <Panel icon={CheckCircle2} title={text.productivity}>
      <div className="grid gap-3 md:grid-cols-2">
        <ListBlock
          empty={text.noFocus}
          items={data.tasks}
          title={text.openTasks}
          render={(task) => ({
            id: task.id,
            title: task.title,
            meta: task.due_at
              ? formatShortDate(task.due_at, language)
              : task.status || text.tasks,
            href: WORKSPACE_ROUTES.tasks,
          })}
        />
        <ListBlock
          empty={text.noFocus}
          items={data.planner}
          title={text.plannerToday}
          render={(item) => ({
            id: item.id,
            title: item.title,
            meta: item.task_time || text.planner,
            href: WORKSPACE_ROUTES.planner,
          })}
        />
        <ListBlock
          empty={text.noActivity}
          items={data.notes}
          title={text.recentNotes}
          render={(note) => ({
            id: note.id,
            title: note.title,
            meta: note.updated_at
              ? formatShortDate(note.updated_at, language)
              : text.notes,
            href: WORKSPACE_ROUTES.notes,
          })}
        />
        <ListBlock
          empty={text.noActivity}
          items={data.documents}
          title={text.recentDocuments}
          render={(document) => ({
            id: document.id,
            title: document.title,
            meta: document.status || text.documents,
            href: WORKSPACE_ROUTES.documents,
          })}
        />
      </div>
    </Panel>
  );
}

function RunsPanel({
  items,
  text,
}: {
  items: {
    id: string;
    status: string;
    title: string;
    timestamp?: string | null;
    onClick?: () => void;
  }[];
  text: DashboardCopy;
}) {
  return (
    <Panel icon={Bot} title={text.runs}>
      {items.length ? (
        <div className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <button
              key={`${item.status}-${item.id}`}
              className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left"
              onClick={item.onClick}
              type="button"
            >
              <StatusDot status={item.status} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {safeTitle(item.title)}
                </span>
                <span className="block truncate text-xs text-[#6B7280]">
                  {statusLabel(item.status, text)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState text={text.noRuns} />
      )}
    </Panel>
  );
}

function FitnessPanel({
  fitness,
  text,
}: {
  fitness: DashboardSummary["fitness"];
  text: DashboardCopy;
}) {
  if (!fitness.goals) {
    return (
      <Panel icon={Dumbbell} title={text.fitness}>
        <EmptyState text={text.noFitness} />
        <a
          className="mt-3 inline-flex h-10 items-center rounded-xl border border-black px-3 text-sm font-medium"
          href="/fitness"
        >
          {text.setupFitness}
        </a>
      </Panel>
    );
  }
  return (
    <Panel icon={Dumbbell} title={text.fitness}>
      <div className="space-y-3">
        <ProgressRow
          label={text.calories}
          value={fitness.totals.calories}
          goal={fitness.goals.daily_calories}
        />
        <ProgressRow
          label={text.protein}
          value={fitness.totals.protein}
          goal={fitness.goals.daily_protein}
        />
        <ProgressRow
          label={text.carbs}
          value={fitness.totals.carbs}
          goal={fitness.goals.daily_carbs}
        />
        <ProgressRow
          label={text.fat}
          value={fitness.totals.fat}
          goal={fitness.goals.daily_fat}
        />
      </div>
      <p className="mt-3 text-xs text-[#6B7280]">{text.targetWeight}</p>
    </Panel>
  );
}

function ActivityPanel({
  activity,
  language,
  text,
}: {
  activity: ActivityItem[];
  language: Language;
  text: DashboardCopy;
}) {
  return (
    <Panel icon={Activity} title={text.recentActivity}>
      {activity.length ? (
        <div className="space-y-2">
          {activity.slice(0, 6).map((item) => (
            <a
              key={item.id}
              className="block rounded-xl border border-[#E5E7EB] bg-white p-3"
              href="/dashboard"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Activity className="h-4 w-4 shrink-0" />
                <p className="truncate text-sm font-medium">
                  {safeTitle(
                    item.summary || item.event_type || text.recentActivity,
                  )}
                </p>
              </div>
              <p className="mt-1 truncate text-xs text-[#6B7280]">
                {item.event_type || "activity"} /{" "}
                {item.created_at
                  ? formatShortDate(item.created_at, language)
                  : text.completed}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState text={text.noActivity} />
      )}
    </Panel>
  );
}

function ConversationsPanel({
  conversations,
  statuses,
  text,
  onSelect,
}: {
  conversations: Conversation[];
  statuses: Record<string, ConversationStatus>;
  text: DashboardCopy;
  onSelect?: (id: string) => void;
}) {
  const notable = conversations
    .filter((conversation) => {
      const status = statuses[conversation.id];
      return status?.failed || status?.active || status?.unread;
    })
    .slice(0, 5);
  return (
    <Panel icon={MessageSquare} title={text.conversations}>
      {notable.length ? (
        <div className="space-y-2">
          {notable.map((conversation) => {
            const status = statuses[conversation.id] ?? {};
            const label = status.failed
              ? text.failed
              : status.active
                ? text.active
                : text.unread;
            return (
              <button
                key={conversation.id}
                className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left"
                onClick={() => onSelect?.(conversation.id)}
                type="button"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {safeTitle(conversation.title || "ALMA")}
                  </span>
                  <span className="block text-xs text-[#6B7280]">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState text={text.noConversations} />
      )}
    </Panel>
  );
}

function Panel({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="truncate text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FocusRow({ item }: { item: FocusItem }) {
  const Icon = item.icon;
  const content = (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 ${
        item.tone === "danger"
          ? "border-red-200 bg-red-50"
          : item.tone === "active"
            ? "border-black bg-white"
            : "border-[#E5E7EB] bg-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {safeTitle(item.title)}
        </span>
        <span className="block truncate text-xs text-[#6B7280]">
          {item.meta}
        </span>
      </span>
    </div>
  );
  if (item.onClick) {
    return (
      <button className="block w-full text-left" onClick={item.onClick}>
        {content}
      </button>
    );
  }
  if (item.route) return <a href={item.route}>{content}</a>;
  return content;
}

function QuickAction({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </>
  );
  const className =
    "flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-medium hover:border-black";
  if (href)
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  return (
    <button className={className} onClick={onClick} type="button">
      {content}
    </button>
  );
}

function ListBlock<T>({
  empty,
  items,
  render,
  title,
}: {
  empty: string;
  items: T[];
  render: (item: T) => {
    id: string;
    title: string;
    meta: string;
    href: string;
  };
  title: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-[#F7F7F8] p-3">
      <p className="mb-2 text-xs font-semibold uppercase text-[#6B7280]">
        {title}
      </p>
      {items.length ? (
        <div className="space-y-2">
          {items.slice(0, 4).map((item) => {
            const row = render(item);
            return (
              <a
                key={row.id}
                className="block min-w-0 rounded-lg bg-white px-3 py-2"
                href={row.href}
              >
                <p className="truncate text-sm font-medium">
                  {safeTitle(row.title)}
                </p>
                <p className="truncate text-xs text-[#6B7280]">{row.meta}</p>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[#6B7280]">{empty}</p>
      )}
    </div>
  );
}

function ProgressRow({
  goal,
  label,
  value,
}: {
  goal?: number | null;
  label: string;
  value: number;
}) {
  const max = Number(goal || 0);
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-[#6B7280]">
          {Math.round(value)} {max ? `/ ${Math.round(max)}` : ""}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0F2F4]">
        <div
          className="h-full rounded-full bg-black"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "failed"
      ? "bg-red-500"
      : status === "running" || status === "queued"
        ? "bg-black"
        : "bg-[#9CA3AF]";
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />;
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">{text}</p>
  );
}

function statusLabel(status: string, text: DashboardCopy) {
  if (status === "failed") return text.failed;
  if (status === "running") return text.running;
  if (status === "queued") return text.queued;
  if (status === "unread") return text.unread;
  return text.completed;
}

function safeTitle(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 120) || "ALMA";
}

function formatShortDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "es" ? "es" : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
