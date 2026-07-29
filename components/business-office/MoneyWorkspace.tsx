"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CreditCard,
  FileWarning,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Receipt,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BusinessOfficeOverview,
  BusinessTransactionDirection,
} from "@/lib/business-office/types";
import BookkeepingWorkspace from "./BookkeepingWorkspace";

type Language = "en" | "es";
type State = "loading" | "ready" | "auth" | "migration" | "error";

const copy = {
  en: {
    subtitle:
      "Organize income, expenses, receipts, invoices, payroll preparation, and accountant-ready records.",
    collected: "Collected this month",
    income: "Posted income",
    expenses: "Expenses",
    profit: "Estimated operating profit",
    outstanding: "Outstanding invoices",
    review: "Transactions to review",
    transactions: "Recent transactions",
    add: "Add transaction",
    incomeDirection: "Income",
    expenseDirection: "Expense",
    description: "Description",
    merchant: "Merchant",
    amount: "Amount",
    category: "Category",
    save: "Save transaction",
    saving: "Saving...",
    empty: "No transactions have been entered for this month.",
    markReviewed: "Mark reviewed",
    setup:
      "Your financial office needs one owner setup step before Money can open.",
    finishSetup: "Finish setup",
    unavailable: "Money is temporarily unavailable.",
    signIn: "Sign in to view business finances.",
    retry: "Retry",
    invoices: "Invoices",
    estimates: "Estimates",
    receipts: "Receipts",
    payroll: "Payroll preparation",
    tax: "Tax preparation",
    quickbooks: "QuickBooks",
    connected: "Connected",
    disconnected: "Not connected",
    disclaimer:
      "ALMA organizes bookkeeping records. It does not file taxes or provide licensed accounting advice.",
    cashFlow: "Six-month cash flow",
    cashFlowHelp: "Posted operating income compared with expenses.",
    expenseMix: "Expense mix",
    invoiceFlow: "Invoice pipeline",
    incomeLegend: "Income",
    expenseLegend: "Expenses",
    noChartData: "Add transactions to reveal trends.",
    paymentLinks: "Customer payment links",
    paymentLinksHelp:
      "Connect your Stripe or PayPal account, then add a secure pay link to any invoice.",
    connectPayments: "Connect payments",
    manageInvoices: "Manage invoices",
    monthNet: "Current net",
  },
  es: {
    subtitle:
      "Organiza ingresos, gastos, recibos, facturas, preparación de nómina y registros para tu contador.",
    collected: "Cobrado este mes",
    income: "Ingresos registrados",
    expenses: "Gastos",
    profit: "Ganancia operativa estimada",
    outstanding: "Facturas pendientes",
    review: "Transacciones por revisar",
    transactions: "Transacciones recientes",
    add: "Agregar transacción",
    incomeDirection: "Ingreso",
    expenseDirection: "Gasto",
    description: "Descripción",
    merchant: "Comercio",
    amount: "Cantidad",
    category: "Categoría",
    save: "Guardar transacción",
    saving: "Guardando...",
    empty: "No hay transacciones registradas para este mes.",
    markReviewed: "Marcar revisada",
    setup:
      "Tu oficina financiera necesita un paso de configuración del propietario antes de abrir Dinero.",
    finishSetup: "Finalizar configuración",
    unavailable: "Dinero no está disponible temporalmente.",
    signIn: "Inicia sesión para ver las finanzas del negocio.",
    retry: "Reintentar",
    invoices: "Facturas",
    estimates: "Estimados",
    receipts: "Recibos",
    payroll: "Preparación de nómina",
    tax: "Preparación de impuestos",
    quickbooks: "QuickBooks",
    connected: "Conectado",
    disconnected: "Sin conexión",
    disclaimer:
      "ALMA organiza registros contables. No presenta impuestos ni ofrece asesoría contable profesional.",
    cashFlow: "Flujo de caja de seis meses",
    cashFlowHelp: "Ingresos operativos registrados comparados con gastos.",
    expenseMix: "Distribución de gastos",
    invoiceFlow: "Flujo de facturas",
    incomeLegend: "Ingresos",
    expenseLegend: "Gastos",
    noChartData: "Agrega transacciones para ver tendencias.",
    paymentLinks: "Enlaces de pago para clientes",
    paymentLinksHelp:
      "Conecta tu cuenta de Stripe o PayPal y agrega un enlace de pago seguro a cualquier factura.",
    connectPayments: "Conectar pagos",
    manageInvoices: "Administrar facturas",
    monthNet: "Neto actual",
  },
} as const;

function money(value: number, language: Language) {
  return new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MoneyWorkspace({ language }: { language: Language }) {
  const t = copy[language];
  const [state, setState] = useState<State>("loading");
  const [overview, setOverview] = useState<BusinessOfficeOverview | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: "expense" as BusinessTransactionDirection,
    description: "",
    merchant: "",
    amount: "",
    category: "",
  });

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/business-office/overview", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (response.status === 401) setState("auth");
      else if (
        response.status === 503 &&
        payload?.error?.code === "business_office_schema_unavailable"
      )
        setState("migration");
      else if (!response.ok || !payload?.overview) setState("error");
      else {
        setOverview(payload.overview);
        setState("ready");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTransaction() {
    if (!form.description.trim() || !Number.isFinite(Number(form.amount)))
      return;
    setSaving(true);
    try {
      const response = await fetch("/api/business-office/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          transactionType: "operating",
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      setForm({
        direction: "expense",
        description: "",
        merchant: "",
        amount: "",
        category: "",
      });
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function markReviewed(id: string) {
    const response = await fetch(`/api/business-office/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus: "reviewed" }),
    });
    if (response.ok) await load();
  }

  const cards = useMemo(
    () =>
      overview
        ? [
            {
              label: t.collected,
              value: overview.money.collected,
              accent: "from-cyan-500/20 to-blue-500/5",
              dot: "bg-cyan-500",
            },
            {
              label: t.income,
              value: overview.money.postedIncome,
              accent: "from-emerald-500/20 to-teal-500/5",
              dot: "bg-emerald-500",
            },
            {
              label: t.expenses,
              value: overview.money.expenses,
              accent: "from-amber-400/20 to-orange-500/5",
              dot: "bg-amber-400",
            },
            {
              label: t.profit,
              value: overview.money.estimatedOperatingProfit,
              accent: "from-violet-500/20 to-fuchsia-500/5",
              dot: "bg-violet-500",
            },
          ]
        : [],
    [overview, t],
  );

  if (state !== "ready" || !overview) {
    const message =
      state === "auth"
        ? t.signIn
        : state === "migration"
          ? t.setup
          : state === "error"
            ? t.unavailable
            : null;
    return (
      <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
        <div className="rounded-[24px] border border-[#E4E7EC] bg-white p-8 text-sm text-[#667085]">
          {state === "loading" ? (
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          ) : (
            <AlertCircle className="mr-2 inline h-4 w-4" />
          )}
          {message}
          {state === "migration" ? (
            <Link
              href="/onboarding?resume=money"
              className="ml-4 inline-flex rounded-full bg-black px-4 py-2 text-white"
            >
              {t.finishSetup}
            </Link>
          ) : state !== "loading" ? (
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

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
      <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#080B12] p-5 text-white shadow-[0_20px_70px_rgba(15,23,42,0.16)] md:p-7">
        <div className="absolute -z-10 h-px w-px" aria-hidden="true" />
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              ALMA Money
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              {t.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((shown) => !shown)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-cyan-50"
          >
            <Plus className="h-4 w-4" />
            {t.add}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, accent, dot }) => (
          <section
            key={label}
            className={`relative overflow-hidden rounded-[22px] border border-[#E4E7EC] bg-gradient-to-br ${accent} p-5`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#667085]">{label}</p>
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {money(Number(value), language)}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
        <section className="rounded-[24px] border border-slate-800 bg-[#0B0F18] p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-300" />
                <h2 className="font-medium">{t.cashFlow}</h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">{t.cashFlowHelp}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                {t.incomeLegend}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
                {t.expenseLegend}
              </span>
            </div>
          </div>
          <CashFlowChart
            data={overview.insights.cashFlow}
            language={language}
            emptyLabel={t.noChartData}
          />
        </section>

        <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-600" />
            <h2 className="font-medium">{t.expenseMix}</h2>
          </div>
          <CategoryBars
            data={overview.insights.expensesByCategory}
            language={language}
            emptyLabel={t.noChartData}
          />
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
        <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-5">
          <h2 className="font-medium">{t.invoiceFlow}</h2>
          <InvoicePipeline
            data={overview.insights.invoicePipeline}
            language={language}
          />
        </section>
        <section className="relative overflow-hidden rounded-[24px] border border-cyan-300/40 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-5">
          <CreditCard className="h-5 w-5 text-cyan-700" />
          <h2 className="mt-5 font-medium">{t.paymentLinks}</h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {t.paymentLinksHelp}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/connections?setup=payments"
              className="rounded-full bg-black px-4 py-2 text-sm text-white"
            >
              {t.connectPayments}
            </Link>
            <Link
              href="/invoicing"
              className="rounded-full border border-[#D0D5DD] bg-white px-4 py-2 text-sm"
            >
              {t.manageInvoices}
            </Link>
          </div>
        </section>
      </div>

      {showForm ? (
        <section className="mt-5 rounded-[24px] border border-[#D0D5DD] bg-white p-5">
          <div className="grid gap-3 md:grid-cols-5">
            <select
              value={form.direction}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  direction: event.target.value as BusinessTransactionDirection,
                }))
              }
              className="rounded-xl border border-[#D0D5DD] px-3 py-2.5"
            >
              <option value="expense">{t.expenseDirection}</option>
              <option value="income">{t.incomeDirection}</option>
            </select>
            {(["description", "merchant", "amount", "category"] as const).map(
              (field) => (
                <input
                  key={field}
                  value={form[field]}
                  type={field === "amount" ? "number" : "text"}
                  min={field === "amount" ? "0" : undefined}
                  step={field === "amount" ? "0.01" : undefined}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  placeholder={t[field]}
                  className="rounded-xl border border-[#D0D5DD] px-3 py-2.5"
                />
              ),
            )}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void createTransaction()}
            className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm text-white disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </section>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: t.invoices, href: "/invoicing", Icon: WalletCards },
          { label: t.estimates, href: "/office", Icon: FileWarning },
          { label: t.receipts, href: "/money#receipts", Icon: Receipt },
          { label: t.payroll, href: "/reports#payroll", Icon: Landmark },
          { label: t.tax, href: "/reports#tax", Icon: FileWarning },
          { label: t.quickbooks, href: "/connections", Icon: RefreshCw },
        ].map(({ label, href, Icon }) => (
          <Link
            key={label}
            href={href}
            className="rounded-[18px] border border-[#E4E7EC] bg-white p-4 text-sm font-medium transition hover:border-black"
          >
            <Icon className="mb-5 h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-[24px] border border-[#E4E7EC] bg-white">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] p-5">
          <div>
            <h2 className="text-lg font-medium">{t.transactions}</h2>
            <p className="mt-1 text-xs text-[#667085]">
              {overview.attention.transactionsToReview} {t.review.toLowerCase()}
            </p>
          </div>
          <p className="text-sm">
            {t.quickbooks}:{" "}
            <span
              className={
                overview.quickBooks.status === "connected"
                  ? "text-emerald-700"
                  : "text-[#667085]"
              }
            >
              {overview.quickBooks.status === "connected"
                ? t.connected
                : t.disconnected}
            </span>
          </p>
        </div>
        {overview.transactions.length ? (
          <div className="divide-y divide-[#EAECF0]">
            {overview.transactions.slice(0, 25).map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-3 p-4">
                <span className="rounded-xl bg-[#F2F4F7] p-2">
                  {transaction.direction === "income" ? (
                    <ArrowDownLeft className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-rose-700" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-[#667085]">
                    {transaction.transaction_date} ·{" "}
                    {transaction.category || t.review}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {transaction.direction === "expense" ? "−" : "+"}
                  {money(transaction.amount, language)}
                </p>
                {transaction.review_status === "needs_review" ? (
                  <button
                    type="button"
                    onClick={() => void markReviewed(transaction.id)}
                    title={t.markReviewed}
                    className="rounded-full border border-[#D0D5DD] p-2 hover:bg-[#F9FAFB]"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-[#667085]">{t.empty}</p>
        )}
      </section>
      <BookkeepingWorkspace language={language} />
      <p className="mt-5 text-xs leading-5 text-[#667085]">{t.disclaimer}</p>
    </div>
  );
}

function CashFlowChart({
  data,
  emptyLabel,
  language,
}: {
  data: BusinessOfficeOverview["insights"]["cashFlow"];
  emptyLabel: string;
  language: Language;
}) {
  const maximum = Math.max(
    0,
    ...data.flatMap((point) => [point.income, point.expenses]),
  );
  const hasData = maximum > 0;

  return (
    <div className="mt-6">
      <div className="grid h-44 grid-cols-6 items-end gap-2 border-b border-slate-700/70 sm:gap-4">
        {data.map((point) => {
          const incomeHeight = maximum
            ? Math.max(3, (point.income / maximum) * 100)
            : 3;
          const expenseHeight = maximum
            ? Math.max(3, (point.expenses / maximum) * 100)
            : 3;
          return (
            <div
              key={point.month}
              className="flex h-full min-w-0 items-end justify-center gap-1"
              title={`${point.month}: ${money(point.income, language)} / ${money(point.expenses, language)}`}
            >
              <span
                className="w-[38%] min-w-1 rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-300 transition-[height] duration-500"
                style={{ height: `${incomeHeight}%` }}
              />
              <span
                className="w-[38%] min-w-1 rounded-t-md bg-gradient-to-t from-violet-700 to-fuchsia-300 transition-[height] duration-500"
                style={{ height: `${expenseHeight}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2 text-center text-[10px] uppercase tracking-wide text-slate-500">
        {data.map((point) => (
          <span key={point.month}>
            {new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
              month: "short",
              timeZone: "UTC",
            }).format(new Date(`${point.month}-01T00:00:00Z`))}
          </span>
        ))}
      </div>
      {!hasData ? (
        <p className="mt-4 text-center text-xs text-slate-500">{emptyLabel}</p>
      ) : null}
    </div>
  );
}

function CategoryBars({
  data,
  emptyLabel,
  language,
}: {
  data: BusinessOfficeOverview["insights"]["expensesByCategory"];
  emptyLabel: string;
  language: Language;
}) {
  const maximum = Math.max(0, ...data.map((item) => item.amount));
  if (!data.length)
    return <p className="mt-8 text-sm text-[#667085]">{emptyLabel}</p>;

  return (
    <div className="mt-5 space-y-4">
      {data.map((item, index) => (
        <div key={item.category}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="truncate">{item.category}</span>
            <span className="shrink-0 text-[#667085]">
              {money(item.amount, language)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F2F4F7]">
            <div
              className={`h-full rounded-full ${
                [
                  "bg-cyan-500",
                  "bg-violet-500",
                  "bg-amber-400",
                  "bg-emerald-500",
                  "bg-rose-400",
                  "bg-blue-500",
                ][index % 6]
              }`}
              style={{
                width: `${maximum ? Math.max(4, (item.amount / maximum) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function InvoicePipeline({
  data,
  language,
}: {
  data: BusinessOfficeOverview["insights"]["invoicePipeline"];
  language: Language;
}) {
  const labels =
    language === "es"
      ? {
          draft: "Borrador",
          sent: "Enviada",
          viewed: "Vista",
          overdue: "Vencida",
          paid: "Pagada",
        }
      : {
          draft: "Draft",
          sent: "Sent",
          viewed: "Viewed",
          overdue: "Overdue",
          paid: "Paid",
        };
  const maximum = Math.max(1, ...data.map((item) => item.count));

  return (
    <div className="mt-5 grid grid-cols-5 gap-2">
      {data.map((item, index) => (
        <div key={item.status} className="min-w-0">
          <div className="flex h-24 items-end overflow-hidden rounded-xl bg-[#F2F4F7]">
            <div
              className={`w-full rounded-xl ${
                [
                  "bg-slate-400",
                  "bg-cyan-500",
                  "bg-blue-500",
                  "bg-amber-400",
                  "bg-emerald-500",
                ][index]
              }`}
              style={{
                height: `${item.count ? Math.max(12, (item.count / maximum) * 100) : 4}%`,
              }}
            />
          </div>
          <p className="mt-2 truncate text-[11px] font-medium">
            {labels[item.status as keyof typeof labels] ?? item.status}
          </p>
          <p className="text-[10px] text-[#667085]">{item.count}</p>
        </div>
      ))}
    </div>
  );
}
