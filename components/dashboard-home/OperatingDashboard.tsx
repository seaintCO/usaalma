"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Gauge,
  Inbox,
  Loader2,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  PhoneCall,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BusinessOfficeOverview } from "@/lib/business-office/types";

type Language = "en" | "es";
type LoadState = "loading" | "ready" | "auth" | "error";

type DashboardSummary = {
  tasks: { id: string; title: string; due_at?: string | null }[];
  planner: { id: string; title: string; task_time?: string | null }[];
  runs: { id: string; status: string }[];
  activity: {
    id: string;
    summary?: string | null;
    created_at?: string | null;
  }[];
};

type Approval = {
  id: string;
  status: string;
  actionSummary: string;
  requestedAt: string | null;
};

const copy = {
  en: {
    greeting: "Good morning.",
    intro: "Here is what needs attention in your business today.",
    ask: "Ask ALMA",
    placeholder:
      "Ask about customers, overdue invoices, messages, tasks, or bookkeeping...",
    loading: "Preparing your business briefing...",
    auth: "Sign in to view your business briefing.",
    error: "The business briefing is temporarily unavailable.",
    retry: "Retry",
    leads: "Open leads",
    messages: "Messages awaiting reply",
    appointments: "Appointments today",
    tasks: "Tasks due",
    overdue: "Overdue invoices",
    collected: "Collected this month",
    expenses: "Expenses this month",
    review: "Transactions to review",
    receipts: "Missing receipts",
    approvals: "Approvals",
    noApprovals: "No protected actions are waiting.",
    reviewApprovals: "Review approvals",
    next: "Requires attention",
    noAttention: "Nothing urgent is recorded right now.",
    activity: "Recent activity",
    noActivity: "No recent activity yet.",
    quickbooks: "QuickBooks",
    connected: "Connected",
    disconnected: "Not connected",
    setupMoney:
      "Apply the Business Office migration to activate financial metrics.",
    disclaimer:
      "Financial totals use posted records and never classify transfers or owner contributions as operating income.",
    voiceAgent: "AI voice agent",
    voiceAgentBody:
      "Set up a receptionist or assistant that can log signed call transcripts in ALMA CRM.",
    configureVoice: "Configure voice agent",
    quickActions: "Command center",
    quickActionsBody: "Move from signal to action without leaving your office.",
    customerBrief: "Prepare a customer follow-up",
    moneyReview: "Review money that needs attention",
    dayPlan: "Build today's operating plan",
    inboxTriage: "Triage unanswered messages",
    operatingPulse: "Operating pulse",
    operatingPulseBody:
      "Live signals from customers, work, money, and approvals.",
  },
  es: {
    greeting: "Buenos días.",
    intro: "Esto es lo que requiere atención en tu negocio hoy.",
    ask: "Preguntar a ALMA",
    placeholder:
      "Pregunta por clientes, facturas vencidas, mensajes, tareas o contabilidad...",
    loading: "Preparando el resumen del negocio...",
    auth: "Inicia sesión para ver el resumen del negocio.",
    error: "El resumen del negocio no está disponible temporalmente.",
    retry: "Reintentar",
    leads: "Prospectos abiertos",
    messages: "Mensajes por responder",
    appointments: "Citas de hoy",
    tasks: "Tareas pendientes",
    overdue: "Facturas vencidas",
    collected: "Cobrado este mes",
    expenses: "Gastos este mes",
    review: "Transacciones por revisar",
    receipts: "Recibos faltantes",
    approvals: "Aprobaciones",
    noApprovals: "No hay acciones protegidas esperando.",
    reviewApprovals: "Revisar aprobaciones",
    next: "Requiere atención",
    noAttention: "No hay nada urgente registrado ahora.",
    activity: "Actividad reciente",
    noActivity: "Aún no hay actividad reciente.",
    quickbooks: "QuickBooks",
    connected: "Conectado",
    disconnected: "Sin conexión",
    setupMoney:
      "Aplica la migración de Oficina Empresarial para activar métricas financieras.",
    disclaimer:
      "Los totales financieros usan registros publicados y nunca cuentan transferencias ni aportes del dueño como ingresos operativos.",
    voiceAgent: "Agente de voz con IA",
    voiceAgentBody:
      "Configura un recepcionista o asistente que guarde transcripciones firmadas en el CRM.",
    configureVoice: "Configurar agente de voz",
    quickActions: "Centro de comando",
    quickActionsBody: "Pasa de la señal a la acción sin salir de tu oficina.",
    customerBrief: "Preparar seguimiento para un cliente",
    moneyReview: "Revisar dinero que requiere atención",
    dayPlan: "Crear el plan operativo de hoy",
    inboxTriage: "Organizar mensajes sin respuesta",
    operatingPulse: "Pulso operativo",
    operatingPulseBody:
      "Señales en vivo de clientes, trabajo, dinero y aprobaciones.",
  },
} as const;

function money(value: number, language: Language) {
  return new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OperatingDashboard({
  language,
  onAsk,
}: {
  conversations?: unknown[];
  conversationStatuses?: Record<string, unknown>;
  language: Language;
  onAsk: (prompt?: string) => void;
  onConversationSelect?: (id: string) => void;
}) {
  const t = copy[language];
  const [state, setState] = useState<LoadState>("loading");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [office, setOffice] = useState<BusinessOfficeOverview | null>(null);
  const [officeNeedsSetup, setOfficeNeedsSetup] = useState(false);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [command, setCommand] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [summaryResponse, officeResponse, approvalsResponse] =
        await Promise.all([
          fetch("/api/dashboard/summary", { cache: "no-store" }),
          fetch("/api/business-office/overview", { cache: "no-store" }),
          fetch("/api/approvals?limit=10", { cache: "no-store" }),
        ]);
      if (summaryResponse.status === 401) {
        setState("auth");
        return;
      }
      if (!summaryResponse.ok) throw new Error("summary_unavailable");
      setSummary(await summaryResponse.json());
      if (officeResponse.ok) {
        const payload = await officeResponse.json();
        setOffice(payload.overview ?? null);
        setOfficeNeedsSetup(false);
      } else {
        setOffice(null);
        setOfficeNeedsSetup(officeResponse.status === 503);
      }
      if (approvalsResponse.ok) {
        const payload = await approvalsResponse.json();
        setApprovals(
          (payload.approvals ?? []).filter((approval: Approval) =>
            ["awaiting_approval", "approved", "executing"].includes(
              approval.status,
            ),
          ),
        );
      } else {
        setApprovals([]);
      }
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Initial server-state synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const attention = useMemo(() => {
    if (!summary) return [];
    return [
      ...(office?.attention.overdueInvoices
        ? [
            {
              id: "overdue",
              label: t.overdue,
              value: office.attention.overdueInvoices,
              href: "/invoicing",
            },
          ]
        : []),
      ...(office?.attention.transactionsToReview
        ? [
            {
              id: "transactions",
              label: t.review,
              value: office.attention.transactionsToReview,
              href: "/money",
            },
          ]
        : []),
      ...(summary.tasks.length
        ? [
            {
              id: "tasks",
              label: t.tasks,
              value: summary.tasks.length,
              href: "/tasks",
            },
          ]
        : []),
      ...(approvals.length
        ? [
            {
              id: "approvals",
              label: t.approvals,
              value: approvals.length,
              href: "/approvals",
            },
          ]
        : []),
    ].slice(0, 6);
  }, [approvals.length, office, summary, t]);

  if (state !== "ready" || !summary) {
    return (
      <div className="alma-workspace-canvas min-h-0 flex-1 overflow-y-auto bg-[#F7F7F8] p-4 md:p-8">
        <div className="alma-glass-card mx-auto max-w-7xl rounded-[24px] p-6 text-sm text-[#667085]">
          {state === "loading" ? (
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          ) : (
            <AlertCircle className="mr-2 inline h-4 w-4" />
          )}
          {state === "auth" ? t.auth : state === "error" ? t.error : t.loading}
          {state === "error" ? (
            <button
              type="button"
              onClick={() => void load()}
              className="ml-4 rounded-full bg-black px-4 py-2 text-white"
            >
              {t.retry}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: t.leads,
      value: office?.attention.newLeads ?? "—",
      href: "/customers",
      icon: Users,
    },
    {
      label: t.messages,
      value: "—",
      href: "/inbox",
      icon: Inbox,
    },
    {
      label: t.appointments,
      value: office?.attention.appointmentsToday ?? summary.planner.length,
      href: "/work",
      icon: CalendarDays,
    },
    {
      label: t.overdue,
      value: office?.attention.overdueInvoices ?? "—",
      href: "/invoicing",
      icon: ReceiptText,
    },
    {
      label: t.collected,
      value: office ? money(office.money.collected, language) : "—",
      href: "/money",
      icon: CircleDollarSign,
    },
    {
      label: t.expenses,
      value: office ? money(office.money.expenses, language) : "—",
      href: "/money",
      icon: CircleDollarSign,
    },
  ];

  function submit() {
    const trimmed = command.trim();
    if (!trimmed) return;
    setCommand("");
    onAsk(trimmed);
  }

  return (
    <div className="alma-workspace-canvas min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-5 md:px-8 md:pb-10 md:pt-9">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#667085]">
              {new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              }).format(new Date())}
            </p>
            <h1 className="alma-gradient-text mt-2 text-3xl font-medium tracking-[-0.045em] md:text-4xl">
              {t.greeting}
            </h1>
            <p className="mt-2 text-sm text-[#667085]">{t.intro}</p>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-3 py-2 text-xs text-[#667085] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.75)]" />
            {language === "es" ? "Oficina lista" : "Office ready"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
          <section className="alma-glass-card rounded-[26px] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-[#667085]">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              {language === "es" ? "Pídele a ALMA" : "Ask ALMA"}
            </div>
            <div className="alma-command-glow mt-4 flex items-center gap-2 rounded-[18px] border border-[#D0D5DD] bg-white p-2">
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                placeholder={t.placeholder}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={submit}
                aria-label={t.ask}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {[
                {
                  label: language === "es" ? "Seguimientos" : "Follow-ups",
                  prompt: t.customerBrief,
                  icon: Users,
                },
                {
                  label: language === "es" ? "Plan de hoy" : "Today’s plan",
                  prompt: t.dayPlan,
                  icon: CalendarDays,
                },
                {
                  label: language === "es" ? "Revisar dinero" : "Review money",
                  prompt: t.moneyReview,
                  icon: ReceiptText,
                },
                {
                  label: language === "es" ? "Bandeja" : "Inbox",
                  prompt: t.inboxTriage,
                  icon: Inbox,
                },
              ].map(({ label, prompt, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onAsk(prompt)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-3 py-2 text-xs text-[#667085] transition hover:text-black"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="alma-glass-card rounded-[26px] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#667085]">
                {language === "es" ? "Pulso de hoy" : "Today’s pulse"}
              </span>
              <Gauge className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-5 flex items-end gap-3">
              <span className="text-4xl font-medium">
                {Math.max(0, 100 - attention.length * 12)}
              </span>
              <span className="pb-1 text-xs text-[#667085]">/ 100</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300"
                style={{
                  width: `${Math.max(8, 100 - attention.length * 12)}%`,
                }}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-[#667085]">
              {attention.length
                ? language === "es"
                  ? `${attention.length} cosas necesitan atención.`
                  : `${attention.length} things need attention.`
                : t.noAttention}
            </p>
          </section>
        </div>

        {officeNeedsSetup ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {t.setupMoney}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.slice(0, 4).map(({ label, value, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="alma-glass-card alma-glass-card--interactive flex items-center gap-3 rounded-[20px] p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5">
                <Icon className="h-4 w-4 text-[#667085]" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-medium">{value}</span>
                <span className="block truncate text-[11px] text-[#667085]">
                  {label}
                </span>
              </span>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          className="mx-auto mt-5 flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-4 py-2.5 text-xs font-medium text-[#667085]"
        >
          {showDetails
            ? language === "es"
              ? "Ocultar detalles"
              : "Hide details"
            : language === "es"
              ? "Ver detalles de la oficina"
              : "Show office details"}
          <ChevronDown
            className={`h-4 w-4 transition ${showDetails ? "rotate-180" : ""}`}
          />
        </button>

        {showDetails ? (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {metrics.slice(4).map(({ label, value, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="alma-glass-card alma-glass-card--interactive flex items-center gap-3 rounded-[20px] p-4"
                >
                  <Icon className="h-4 w-4 text-[#667085]" />
                  <span>
                    <span className="block text-lg font-medium">{value}</span>
                    <span className="text-[11px] text-[#667085]">{label}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
              <section className="alma-glass-card rounded-[24px] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{t.next}</h2>
                  <Clock3 className="h-4 w-4 text-[#667085]" />
                </div>
                {attention.length ? (
                  <div className="mt-4 divide-y divide-[#EAECF0]">
                    {attention.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-3 py-4"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F2F4F7] text-sm font-medium">
                          {item.value}
                        </span>
                        <span className="flex-1 text-sm">{item.label}</span>
                        <ArrowRight className="h-4 w-4 text-[#98A2B3]" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[#667085]">{t.noAttention}</p>
                )}
              </section>
              <section className="alma-glass-card rounded-[24px] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{t.approvals}</h2>
                  <ShieldCheck className="h-4 w-4 text-[#667085]" />
                </div>
                {approvals.length ? (
                  <div className="mt-4 space-y-3">
                    {approvals.slice(0, 4).map((approval) => (
                      <Link
                        key={approval.id}
                        href="/approvals"
                        className="block rounded-2xl bg-[#F9FAFB] p-4 text-sm"
                      >
                        {approval.actionSummary}
                      </Link>
                    ))}
                    <Link
                      href="/approvals"
                      className="inline-flex items-center gap-2 text-sm font-medium"
                    >
                      {t.reviewApprovals}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <p className="mt-5 flex items-center gap-2 text-sm text-[#667085]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    {t.noApprovals}
                  </p>
                )}
              </section>
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
              <section className="alma-glass-card rounded-[24px] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{t.activity}</h2>
                  <span className="text-xs text-[#667085]">
                    {t.quickbooks}:{" "}
                    {office?.quickBooks.status === "connected"
                      ? t.connected
                      : t.disconnected}
                  </span>
                </div>
                {summary.activity.length ? (
                  <div className="mt-4 divide-y divide-[#EAECF0]">
                    {summary.activity.slice(0, 6).map((activity) => (
                      <div key={activity.id} className="py-3 text-sm">
                        {activity.summary || activity.id}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[#667085]">{t.noActivity}</p>
                )}
              </section>
              <section className="overflow-hidden rounded-[24px] border border-slate-800 bg-[#080B12] p-5 text-white">
                <PhoneCall className="h-5 w-5 text-cyan-300" />
                <h2 className="mt-6 font-medium">{t.voiceAgent}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {t.voiceAgentBody}
                </p>
                <Link
                  href="/voice-agents"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
                >
                  {t.configureVoice}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
            </div>
            <p className="text-xs leading-5 text-[#667085]">{t.disclaimer}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
