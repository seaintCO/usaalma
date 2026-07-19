"use client";

import {
  AlertCircle,
  AppWindow,
  Bot,
  Calculator,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarketplaceCatalogResponse } from "@/lib/platform/marketplace/types";
import {
  DASHBOARD_ROUTE,
  WORKSPACE_ROUTES,
} from "@/lib/platform/workspaceRoutes";

type Language = "en" | "es";
type RunStatus = "queued" | "running" | "failed" | "completed" | string;
type LoadState = "loading" | "ready" | "auth" | "error";

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

type DashboardSummary = {
  today: string;
  tasks: SummaryTask[];
  planner: PlannerItem[];
  notes: SummaryDocument[];
  documents: SummaryDocument[];
  runs: SummaryRun[];
  activity: ActivityItem[];
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

type UnifiedApproval = {
  id: string;
  kind: "action" | "agent";
  status: string;
  actionKey: string | null;
  actionSummary: string;
  requestedAt: string | null;
  updatedAt: string | null;
};

type Shortcut = {
  id: string;
  label: string;
  prompt?: string;
  href?: string;
  icon: LucideIcon;
};

type AlertItem = {
  id: string;
  label: string;
  title: string;
  href?: string;
  onClick?: () => void;
};

const COPY = {
  en: {
    title: "What should ALMA handle next?",
    subtitle:
      "Use one command to start a conversation, review approvals, or jump into the workspace that is actually available.",
    placeholder:
      "Ask ALMA to plan, draft, analyze, or prepare the next step...",
    send: "Send",
    loading: "Loading Home...",
    unavailable: "Home is temporarily unavailable.",
    auth: "Sign in to view your ALMA Home.",
    retry: "Retry",
    shortcuts: "Contextual Shortcuts",
    noShortcuts: "No enabled workspace shortcuts yet.",
    approvals: "Approvals",
    approvalsPending: "Pending approvals",
    noApprovals: "No approvals waiting right now.",
    reviewApprovals: "Review approvals",
    activity: "Recent activity",
    noActivity: "No recent activity yet.",
    alerts: "Alerts",
    noAlerts: "No blocked work right now.",
    today: "Today",
    openTasks: "Open tasks",
    plannerToday: "Planner today",
    failed: "Failed run",
    active: "Active run",
    unread: "Unread conversation",
    commandPlanDay: "Plan my day from my open tasks and calendar.",
    commandFollowUp: "Draft a customer follow-up from my CRM context.",
    commandAnalyzeDoc: "Analyze the latest document or uploaded file.",
    commandEstimate: "Prepare a construction project summary and next steps.",
    commandOfficeEstimate:
      "Create an estimate using my saved Alma Office price book.",
    commandAddCustomer: "Add a customer draft in Alma Office.",
    commandUnpaidInvoices: "Check my unpaid invoices.",
    commandBuilder:
      "Start a Builder project draft for a website or business app.",
    planDay: "Plan my day",
    followUp: "Follow up",
    analyzeDoc: "Analyze files",
    estimate: "Prepare estimate",
    createEstimate: "Create estimate",
    addCustomer: "Add customer",
    unpaidInvoices: "Check unpaid invoices",
    buildSomething: "Build something",
  },
  es: {
    title: "Que debe manejar ALMA ahora?",
    subtitle:
      "Usa un comando para iniciar una conversacion, revisar aprobaciones o entrar al espacio disponible.",
    placeholder:
      "Pidele a ALMA planear, redactar, analizar o preparar el siguiente paso...",
    send: "Enviar",
    loading: "Cargando Inicio...",
    unavailable: "Inicio no esta disponible temporalmente.",
    auth: "Inicia sesion para ver Inicio de ALMA.",
    retry: "Reintentar",
    shortcuts: "Atajos contextuales",
    noShortcuts: "Aun no hay atajos de espacios activos.",
    approvals: "Aprobaciones",
    approvalsPending: "Aprobaciones pendientes",
    noApprovals: "No hay aprobaciones esperando ahora.",
    reviewApprovals: "Revisar aprobaciones",
    activity: "Actividad reciente",
    noActivity: "Aun no hay actividad reciente.",
    alerts: "Alertas",
    noAlerts: "No hay trabajo bloqueado ahora.",
    today: "Hoy",
    openTasks: "Tareas abiertas",
    plannerToday: "Plan de hoy",
    failed: "Ejecucion fallida",
    active: "Ejecucion activa",
    unread: "Conversacion sin leer",
    commandPlanDay: "Planifica mi dia con mis tareas abiertas y calendario.",
    commandFollowUp: "Redacta seguimiento para un cliente usando mi CRM.",
    commandAnalyzeDoc: "Analiza el documento o archivo mas reciente.",
    commandEstimate:
      "Prepara un resumen de proyecto de construccion y siguientes pasos.",
    commandOfficeEstimate:
      "Crea un estimado usando mis precios guardados de Alma Office.",
    commandAddCustomer: "Agrega un borrador de cliente en Alma Office.",
    commandUnpaidInvoices: "Revisa mis facturas pendientes.",
    commandBuilder:
      "Inicia un borrador en Builder para un sitio o app de negocio.",
    planDay: "Planificar dia",
    followUp: "Seguimiento",
    analyzeDoc: "Analizar archivos",
    estimate: "Preparar estimado",
    createEstimate: "Crear estimado",
    addCustomer: "Agregar cliente",
    unpaidInvoices: "Facturas pendientes",
    buildSomething: "Crear algo",
  },
} as const;

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
  onAsk: (prompt?: string) => void;
  onConversationSelect?: (id: string) => void;
}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [catalog, setCatalog] = useState<MarketplaceCatalogResponse | null>(
    null,
  );
  const [approvals, setApprovals] = useState<UnifiedApproval[]>([]);
  const [command, setCommand] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const t = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const summaryResponse = await fetch("/api/dashboard/summary", {
        cache: "no-store",
      });
      if (summaryResponse.status === 401) {
        setSummary(null);
        setCatalog(null);
        setApprovals([]);
        setState("auth");
        return;
      }
      if (!summaryResponse.ok) throw new Error("summary_unavailable");
      setSummary((await summaryResponse.json()) as DashboardSummary);
      const [catalogResult, approvalsResult] = await Promise.allSettled([
        fetch("/api/marketplace/catalog", { cache: "no-store" }),
        fetch("/api/approvals?limit=20", { cache: "no-store" }),
      ]);
      if (catalogResult.status === "fulfilled" && catalogResult.value.ok) {
        setCatalog(
          (await catalogResult.value.json()) as MarketplaceCatalogResponse,
        );
      } else {
        setCatalog(null);
      }
      if (approvalsResult.status === "fulfilled" && approvalsResult.value.ok) {
        const payload = (await approvalsResult.value.json()) as {
          approvals?: UnifiedApproval[];
        };
        setApprovals(payload.approvals ?? []);
      } else {
        setApprovals([]);
      }
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  const pendingApprovals = approvals.filter((approval) =>
    ["awaiting_approval", "approved", "executing"].includes(approval.status),
  );

  const shortcuts = useMemo(
    () => buildShortcuts(catalog, language),
    [catalog, language],
  );

  const alerts = useMemo<AlertItem[]>(() => {
    const failedRuns = (summary?.runs ?? [])
      .filter((run) => run.status === "failed")
      .slice(0, 2)
      .map((run) => ({
        id: `run-${run.id}`,
        label: t.failed,
        title: run.id,
        href: DASHBOARD_ROUTE,
      }));
    const failedConversations = conversations
      .filter((conversation) => conversationStatuses[conversation.id]?.failed)
      .slice(0, 2)
      .map((conversation) => ({
        id: `conversation-${conversation.id}`,
        label: t.failed,
        title: conversation.title || "ALMA",
        onClick: () => onConversationSelect?.(conversation.id),
      }));
    return [...failedConversations, ...failedRuns];
  }, [
    conversationStatuses,
    conversations,
    onConversationSelect,
    summary?.runs,
    t.failed,
  ]);

  const activeConversations = conversations
    .filter((conversation) => {
      const status = conversationStatuses[conversation.id];
      return status?.active || status?.unread;
    })
    .slice(0, 3);

  function submitCommand(prompt = command) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setCommand("");
    onAsk(trimmed);
  }

  if (state === "loading") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F7F8] p-4 md:p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          {t.loading}
        </div>
      </div>
    );
  }

  if (state === "auth" || state === "error") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F7F8] p-4 md:p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-sm text-[#6B7280]">
            {state === "auth" ? t.auth : t.unavailable}
          </p>
          {state === "error" ? (
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-black px-3 text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F7F7F8] px-3 pb-24 pt-4 text-black md:px-6 md:pb-6 md:pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">
            {t.subtitle}
          </p>
          <form
            className="mt-6 flex min-w-0 flex-col gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              submitCommand();
            }}
          >
            <label className="sr-only" htmlFor="alma-command">
              {t.placeholder}
            </label>
            <input
              id="alma-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder={t.placeholder}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-white px-3 text-sm outline-none focus:border-black"
            />
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:bg-[#9CA3AF]"
              disabled={!command.trim()}
            >
              <Send className="h-4 w-4" />
              {t.send}
            </button>
          </form>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <Panel icon={AppWindow} title={t.shortcuts}>
              {shortcuts.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {shortcuts.slice(0, 4).map((shortcut) => (
                    <ShortcutButton
                      key={shortcut.id}
                      shortcut={shortcut}
                      onPrompt={submitCommand}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text={t.noShortcuts} />
              )}
            </Panel>

            <Panel icon={ShieldCheck} title={t.approvals}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold">
                    {pendingApprovals.length}
                  </p>
                  <p className="text-sm text-[#6B7280]">{t.approvalsPending}</p>
                </div>
                <a
                  href={WORKSPACE_ROUTES.approvals}
                  className="inline-flex h-10 items-center rounded-xl border border-black px-3 text-sm font-medium"
                >
                  {t.reviewApprovals}
                </a>
              </div>
              {pendingApprovals.length ? (
                <div className="space-y-2">
                  {pendingApprovals.slice(0, 4).map((approval) => (
                    <a
                      key={`${approval.kind}-${approval.id}`}
                      href={WORKSPACE_ROUTES.approvals}
                      className="block min-w-0 rounded-xl bg-[#F7F7F8] p-3"
                    >
                      <p className="truncate text-sm font-medium">
                        {safeTitle(approval.actionSummary)}
                      </p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        {approval.actionKey || approval.kind}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState text={t.noApprovals} />
              )}
            </Panel>

            <Panel icon={Clock3} title={t.today}>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  icon={CheckCircle2}
                  label={t.openTasks}
                  value={summary?.tasks.length ?? 0}
                  href={WORKSPACE_ROUTES.tasks}
                />
                <MetricCard
                  icon={Clock3}
                  label={t.plannerToday}
                  value={summary?.planner.length ?? 0}
                  href={WORKSPACE_ROUTES.planner}
                />
              </div>
            </Panel>
          </div>

          <div className="min-w-0 space-y-4">
            <Panel icon={AlertCircle} title={t.alerts}>
              {alerts.length ? (
                <div className="space-y-2">
                  {alerts.map((alert) =>
                    alert.onClick ? (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={alert.onClick}
                        className="block w-full rounded-xl bg-red-50 p-3 text-left"
                      >
                        <RowText title={alert.title} meta={alert.label} />
                      </button>
                    ) : (
                      <a
                        key={alert.id}
                        href={alert.href}
                        className="block rounded-xl bg-red-50 p-3"
                      >
                        <RowText title={alert.title} meta={alert.label} />
                      </a>
                    ),
                  )}
                </div>
              ) : (
                <EmptyState text={t.noAlerts} />
              )}
            </Panel>

            <Panel icon={MessageSquare} title="ALMA">
              {activeConversations.length ? (
                <div className="space-y-2">
                  {activeConversations.map((conversation) => {
                    const status = conversationStatuses[conversation.id];
                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => onConversationSelect?.(conversation.id)}
                        className="block w-full rounded-xl bg-[#F7F7F8] p-3 text-left"
                      >
                        <RowText
                          title={conversation.title || "ALMA"}
                          meta={status?.active ? t.active : t.unread}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text={t.noAlerts} />
              )}
            </Panel>

            <Panel icon={Bot} title={t.activity}>
              {summary?.activity.length ? (
                <div className="space-y-2">
                  {summary.activity.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="min-w-0 rounded-xl bg-[#F7F7F8] p-3"
                    >
                      <RowText
                        title={item.summary || item.event_type || t.activity}
                        meta={
                          item.created_at
                            ? formatShortDate(item.created_at, language)
                            : item.event_type || "activity"
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text={t.noActivity} />
              )}
            </Panel>
          </div>
        </section>
      </div>
    </div>
  );
}

function buildShortcuts(
  catalog: MarketplaceCatalogResponse | null,
  language: Language,
): Shortcut[] {
  const t = COPY[language];
  const enabled = new Set(
    (catalog?.items ?? [])
      .filter(
        (item) =>
          item.itemType === "internal_module" &&
          item.accessStatus === "included" &&
          item.releaseStatus !== "coming_soon",
      )
      .map((item) => item.key),
  );

  const shortcuts: Shortcut[] = [];
  if (enabled.has("office")) {
    shortcuts.push(
      {
        id: "create-estimate",
        label: t.createEstimate,
        prompt: t.commandOfficeEstimate,
        icon: Calculator,
      },
      {
        id: "add-customer",
        label: t.addCustomer,
        prompt: t.commandAddCustomer,
        icon: Users,
      },
      {
        id: "review-approvals",
        label: t.reviewApprovals,
        href: WORKSPACE_ROUTES.approvals,
        icon: ShieldCheck,
      },
      {
        id: "unpaid-invoices",
        label: t.unpaidInvoices,
        prompt: t.commandUnpaidInvoices,
        icon: FileText,
      },
    );
  }
  if (enabled.has("builder")) {
    shortcuts.push({
      id: "builder",
      label: t.buildSomething,
      href: WORKSPACE_ROUTES.builder,
      icon: Code2,
    });
  }
  if (enabled.has("tasks") || enabled.has("planner")) {
    shortcuts.push({
      id: "plan-day",
      label: t.planDay,
      prompt: t.commandPlanDay,
      icon: Clock3,
    });
  }
  if (enabled.has("crm")) {
    shortcuts.push({
      id: "follow-up",
      label: t.followUp,
      prompt: t.commandFollowUp,
      icon: MessageSquare,
    });
  }
  if (enabled.has("documents") || enabled.has("images")) {
    shortcuts.push({
      id: "analyze-files",
      label: t.analyzeDoc,
      href: WORKSPACE_ROUTES.files,
      icon: FileText,
    });
  }
  if (enabled.has("construction") || enabled.has("invoicing")) {
    shortcuts.push({
      id: "estimate",
      label: t.estimate,
      prompt: t.commandEstimate,
      icon: CheckCircle2,
    });
  }
  return shortcuts;
}

function Panel({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
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

function ShortcutButton({
  shortcut,
  onPrompt,
}: {
  shortcut: Shortcut;
  onPrompt: (prompt: string) => void;
}) {
  const Icon = shortcut.icon;
  const className =
    "flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 text-left text-sm font-medium hover:border-black";
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{shortcut.label}</span>
    </>
  );
  if (shortcut.href) {
    return (
      <a href={shortcut.href} className={className}>
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={() => shortcut.prompt && onPrompt(shortcut.prompt)}
    >
      {content}
    </button>
  );
}

function MetricCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <a
      href={href}
      className="flex min-w-0 items-center gap-3 rounded-xl bg-[#F7F7F8] p-3"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-[#6B7280]">{label}</span>
        <span className="block text-2xl font-semibold">{value}</span>
      </span>
    </a>
  );
}

function RowText({ title, meta }: { title: string; meta: string }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate text-sm font-medium">
        {safeTitle(title)}
      </span>
      <span className="mt-1 block truncate text-xs text-[#6B7280]">{meta}</span>
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">{text}</p>
  );
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
