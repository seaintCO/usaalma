"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Inbox,
  Loader2,
  ReceiptText,
  Send,
  ShieldCheck,
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
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F7F8] p-4 md:p-8">
        <div className="mx-auto max-w-7xl rounded-[24px] border border-[#E4E7EC] bg-white p-6 text-sm text-[#667085]">
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
      surface:
        "border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-blue-50",
      iconSurface: "bg-cyan-500 text-white shadow-cyan-200",
      valueColor: "text-cyan-950",
    },
    {
      label: t.messages,
      value: "—",
      href: "/inbox",
      icon: Inbox,
      surface:
        "border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50",
      iconSurface: "bg-violet-500 text-white shadow-violet-200",
      valueColor: "text-violet-950",
    },
    {
      label: t.appointments,
      value: office?.attention.appointmentsToday ?? summary.planner.length,
      href: "/work",
      icon: CalendarDays,
      surface:
        "border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50",
      iconSurface: "bg-blue-500 text-white shadow-blue-200",
      valueColor: "text-blue-950",
    },
    {
      label: t.overdue,
      value: office?.attention.overdueInvoices ?? "—",
      href: "/invoicing",
      icon: ReceiptText,
      surface:
        "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50",
      iconSurface: "bg-amber-500 text-white shadow-amber-200",
      valueColor: "text-amber-950",
    },
    {
      label: t.collected,
      value: office ? money(office.money.collected, language) : "—",
      href: "/money",
      icon: CircleDollarSign,
      surface:
        "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50",
      iconSurface: "bg-emerald-500 text-white shadow-emerald-200",
      valueColor: "text-emerald-950",
    },
    {
      label: t.expenses,
      value: office ? money(office.money.expenses, language) : "—",
      href: "/money",
      icon: CircleDollarSign,
      surface:
        "border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-pink-50",
      iconSurface: "bg-rose-500 text-white shadow-rose-200",
      valueColor: "text-rose-950",
    },
  ];

  function submit() {
    const trimmed = command.trim();
    if (!trimmed) return;
    setCommand("");
    onAsk(trimmed);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_#ecfeff_0,_#f7f7f8_32%,_#f7f7f8_100%)] px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-10">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[#080B12] p-6 text-white shadow-2xl shadow-cyan-950/10 md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
              {new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
                dateStyle: "full",
              }).format(new Date())}
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl">
              {t.greeting}
            </h1>
            <p className="mt-3 text-base text-slate-300 md:text-lg">
              {t.intro}
            </p>

            <div className="mt-7 flex items-center gap-2 rounded-[20px] border border-white/15 bg-white/10 p-2 shadow-lg backdrop-blur">
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                placeholder={t.placeholder}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 md:text-base"
              />
              <button
                type="button"
                onClick={submit}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">{t.ask}</span>
              </button>
            </div>
          </div>
        </div>

        {officeNeedsSetup ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {t.setupMoney}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {metrics.map(
            ({
              label,
              value,
              href,
              icon: Icon,
              surface,
              iconSurface,
              valueColor,
            }) => (
              <Link
                key={label}
                href={href}
                className={`group rounded-[20px] border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${surface}`}
              >
                <span
                  className={`inline-grid h-9 w-9 place-items-center rounded-xl shadow-lg ${iconSurface}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className={`mt-6 text-2xl font-medium ${valueColor}`}>
                  {value}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#667085]">{label}</p>
              </Link>
            ),
          )}
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_1fr]">
          <section className="rounded-[24px] border border-amber-200/70 bg-gradient-to-br from-white to-amber-50/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{t.next}</h2>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <Clock3 className="h-4 w-4" />
              </span>
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

          <section className="rounded-[24px] border border-violet-200/70 bg-gradient-to-br from-white to-violet-50/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{t.approvals}</h2>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
                <ShieldCheck className="h-4 w-4" />
              </span>
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

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-[24px] border border-cyan-200/70 bg-gradient-to-br from-white to-cyan-50/60 p-5 shadow-sm">
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
          <section className="relative overflow-hidden rounded-[24px] border border-slate-800 bg-[#080B12] p-5 text-white shadow-xl shadow-violet-950/10">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl" />
            <div className="relative">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20">
                <PhoneCall className="h-5 w-5" />
              </span>
              <h2 className="mt-6 font-medium">{t.voiceAgent}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {t.voiceAgentBody}
              </p>
              <Link
                href="/voice-agents"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                {t.configureVoice}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
        <p className="mt-5 text-xs leading-5 text-[#667085]">{t.disclaimer}</p>
      </div>
    </div>
  );
}
